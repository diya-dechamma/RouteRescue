import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import ResourceAllocation, Incident, EmergencyTeam
from schemas import ResourceAllocationResponse
from services.resource_allocator import allocate_resources

router = APIRouter()


@router.get("/allocations", response_model=list[ResourceAllocationResponse])
def get_allocations(db: Session = Depends(get_db)):
    return db.query(ResourceAllocation).all()


@router.post("/allocate")
def run_allocation(db: Session = Depends(get_db)):
    # Get all active incidents and available teams
    already_allocated = {
        allocation.incident_id
        for allocation in db.query(ResourceAllocation).all()
        if allocation.incident_id is not None
    }
    incidents = [
        incident
        for incident in db.query(Incident).filter(Incident.status == "active").all()
        if incident.id not in already_allocated
    ]
    teams = db.query(EmergencyTeam).all()

    inc_dicts = [
        {
            "id": i.id,
            "title": i.title,
            "incident_type": i.incident_type,
            "severity": i.severity,
            "affected_people": i.affected_people,
            "injuries": i.injuries,
            "trapped": i.trapped,
            "lat": i.lat,
            "lng": i.lng,
        }
        for i in incidents
    ]
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
        for t in teams
    ]

    allocations = allocate_resources(inc_dicts, team_dicts)

    # Persist allocations
    created = []
    for alloc in allocations:
        # Determine priority from severity
        severity_priority = {"critical": 1, "high": 2, "medium": 3, "low": 4}
        priority = severity_priority.get(alloc.get("severity", "low"), 4)

        db_alloc = ResourceAllocation(
            incident_id=alloc["incident_id"],
            team_id=alloc["team_id"],
            resources_allocated=json.dumps(alloc["resources_allocated"]),
            priority=priority,
            reason="\n".join(alloc.get("reasons", [])),
        )
        db.add(db_alloc)

        chosen_team = db.query(EmergencyTeam).filter(EmergencyTeam.id == alloc["team_id"]).first()
        if chosen_team:
            chosen_team.resources = json.dumps(
                next(
                    (
                        team.get("resources", {})
                        for team in team_dicts
                        if team["id"] == alloc["team_id"]
                    ),
                    {},
                )
            )
        created.append(alloc)

    db.commit()
    return {"message": f"{len(created)} allocations created", "allocations": created}


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    total_incidents = db.query(Incident).count()
    active_incidents = db.query(Incident).filter(Incident.status == "active").count()
    total_teams = db.query(EmergencyTeam).count()
    available_teams = db.query(EmergencyTeam).filter(EmergencyTeam.availability == "available").count()
    total_allocations = db.query(ResourceAllocation).count()

    return {
        "total_incidents": total_incidents,
        "active_incidents": active_incidents,
        "total_teams": total_teams,
        "available_teams": available_teams,
        "busy_teams": total_teams - available_teams,
        "total_allocations": total_allocations,
    }
