import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Assignment, Incident, EmergencyTeam, Road
from schemas import AssignmentResponse
from algorithms.graph_router import find_route, find_alternative_route

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


@router.post("/optimize")
def optimize_route(body: dict, db: Session = Depends(get_db)):
    team_id = body.get("team_id")
    incident_id = body.get("incident_id")

    team = db.query(EmergencyTeam).filter(EmergencyTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    road_conditions = _get_road_conditions(db)
    route = find_route(team.lat, team.lng, incident.lat, incident.lng, road_conditions)

    if not route:
        raise HTTPException(status_code=400, detail="No route found between team and incident")

    return {
        "team_id": team_id,
        "incident_id": incident_id,
        **route,
    }


@router.post("/recalculate")
def recalculate_route(body: dict, db: Session = Depends(get_db)):
    assignment_id = body.get("assignment_id")
    reason = body.get("reason", "Road condition changed")

    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    team = db.query(EmergencyTeam).filter(EmergencyTeam.id == assignment.team_id).first()
    incident = db.query(Incident).filter(Incident.id == assignment.incident_id).first()

    road_conditions = _get_road_conditions(db)
    route = find_route(team.lat, team.lng, incident.lat, incident.lng, road_conditions)

    if not route:
        raise HTTPException(status_code=400, detail="No alternative route found")

    assignment.route_data = json.dumps(route)
    assignment.reason = reason
    db.commit()
    db.refresh(assignment)

    return {
        "assignment_id": assignment_id,
        "reason": reason,
        "new_route": route,
    }


@router.get("/assignment/{assignment_id}")
def get_assignment_route(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    route_data = None
    if assignment.route_data:
        try:
            route_data = json.loads(assignment.route_data)
        except Exception:
            route_data = assignment.route_data

    return {
        "assignment_id": assignment_id,
        "incident_id": assignment.incident_id,
        "team_id": assignment.team_id,
        "route_data": route_data,
        "status": assignment.status,
    }
