import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import EmergencyTeam, Incident
from schemas import TeamCreate, TeamResponse

router = APIRouter()


@router.get("/available", response_model=list[TeamResponse])
def get_available_teams(db: Session = Depends(get_db)):
    return db.query(EmergencyTeam).filter(EmergencyTeam.availability == "available").all()


@router.get("/", response_model=list[TeamResponse])
def list_teams(db: Session = Depends(get_db)):
    return db.query(EmergencyTeam).all()


@router.post("/", response_model=TeamResponse)
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    db_team = EmergencyTeam(
        name=team.name,
        team_type=team.team_type,
        location=team.location,
        lat=team.lat,
        lng=team.lng,
        availability=team.availability or "available",
        resources=team.resources,
        capacity=team.capacity or 5,
    )
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(team_id: int, team: TeamCreate, db: Session = Depends(get_db)):
    db_team = db.query(EmergencyTeam).filter(EmergencyTeam.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    for field, value in team.model_dump(exclude_unset=True).items():
        setattr(db_team, field, value)
    db.commit()
    db.refresh(db_team)
    return db_team


@router.put("/{team_id}/availability")
def update_team_availability(team_id: int, body: dict, db: Session = Depends(get_db)):
    db_team = db.query(EmergencyTeam).filter(EmergencyTeam.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    availability = body.get("availability")
    if availability not in ("available", "busy", "offline"):
        raise HTTPException(status_code=400, detail="Invalid availability value")
    db_team.availability = availability
    db.commit()
    db.refresh(db_team)
    return {"id": db_team.id, "availability": db_team.availability}


@router.post("/assign")
def assign_team(body: dict, db: Session = Depends(get_db)):
    incident_id = body.get("incident_id")
    team_id = body.get("team_id")

    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    team = db.query(EmergencyTeam).filter(EmergencyTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    team.availability = "busy"
    incident.assigned_team_id = team_id
    db.commit()

    return {
        "incident_id": incident_id,
        "team_id": team_id,
        "message": f"Team '{team.name}' assigned to incident '{incident.title}'",
        "team_availability": team.availability,
    }
