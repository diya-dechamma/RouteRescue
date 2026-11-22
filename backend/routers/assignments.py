import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Assignment, Incident, EmergencyTeam, Road
from schemas import AssignmentResponse
from algorithms.graph_router import find_route
from services.team_assigner import assign_team_to_incident

router = APIRouter()


def _get_road_conditions(db: Session) -> dict:
    roads = db.query(Road).all()
    return {
        road.id: {
            "accessibility": road.accessibility,
            "traffic_level": road.traffic_level,
        }
        for road in roads
    }


@router.get("/", response_model=list[AssignmentResponse])
def list_assignments(db: Session = Depends(get_db)):
    return db.query(Assignment).all()


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.post("/auto-assign")
def auto_assign(db: Session = Depends(get_db)):
    # Find incidents without active assignments
    all_incidents = db.query(Incident).filter(Incident.status == "active").all()
    assigned_incident_ids = {
        a.incident_id for a in db.query(Assignment).filter(Assignment.status == "active").all()
    }
    unassigned = [i for i in all_incidents if i.id not in assigned_incident_ids]

    available_teams = db.query(EmergencyTeam).filter(EmergencyTeam.availability == "available").all()
    road_conditions = _get_road_conditions(db)

    results = []
    used_team_ids = set()

    for incident in unassigned:
        eligible = [t for t in available_teams if t.id not in used_team_ids]
        if not eligible:
            break

        team_dicts = [
            {
                "id": t.id,
                "name": t.name,
                "team_type": t.team_type,
                "availability": t.availability,
                "lat": t.lat,
                "lng": t.lng,
                "capacity": t.capacity,
                "resources": t.resources,
            }
            for t in eligible
        ]

        inc_dict = {
            "incident_type": incident.incident_type,
            "lat": incident.lat,
            "lng": incident.lng,
            "severity": incident.severity,
        }

        best = assign_team_to_incident(inc_dict, team_dicts, road_conditions)
        if not best:
            continue

        chosen_team_id = best["team"]["id"]
        chosen_team = db.query(EmergencyTeam).filter(EmergencyTeam.id == chosen_team_id).first()

        # Compute route
        route = find_route(
            chosen_team.lat, chosen_team.lng,
            incident.lat, incident.lng,
            road_conditions,
        )

        reason_text = "; ".join(best.get("reasons", []))
        assignment = Assignment(
            incident_id=incident.id,
            team_id=chosen_team_id,
            route_data=json.dumps(route) if route else None,
            status="active",
            assigned_at=datetime.utcnow(),
            reason=reason_text,
        )
        db.add(assignment)

        chosen_team.availability = "busy"
        incident.assigned_team_id = chosen_team_id
        used_team_ids.add(chosen_team_id)

        results.append({
            "incident_id": incident.id,
            "incident_title": incident.title,
            "team_id": chosen_team_id,
            "team_name": chosen_team.name,
            "score": best["score"],
            "reasons": best["reasons"],
            "route_summary": {
                "total_distance_km": route.get("total_distance_km") if route else None,
                "estimated_time_min": route.get("estimated_time_min") if route else None,
            } if route else None,
        })

    db.commit()
    return {
        "message": f"{len(results)} teams auto-assigned",
        "assignments": results,
    }
