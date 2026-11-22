import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Incident
from schemas import IncidentCreate, IncidentResponse
from ai_modules.nlp_extractor import extract_incident_info
from ai_modules.severity_classifier import classify_severity

router = APIRouter()


@router.post("/", response_model=IncidentResponse)
def create_incident(incident: IncidentCreate, db: Session = Depends(get_db)):
    # Run NLP extraction
    nlp_result = extract_incident_info(
        incident.description or "",
        {
            "location": incident.location,
            "affected_people": incident.affected_people,
        }
    )

    # Build data dict for severity classification
    sev_data = {
        "incident_type": incident.incident_type,
        "affected_people": incident.affected_people or 0,
        "injuries": incident.injuries or 0,
        "trapped": incident.trapped or 0,
        "nlp_extracted": json.dumps(nlp_result),
    }
    sev_result = classify_severity(sev_data)

    db_incident = Incident(
        title=incident.title,
        description=incident.description,
        incident_type=incident.incident_type,
        location=incident.location,
        lat=incident.lat,
        lng=incident.lng,
        affected_people=incident.affected_people,
        injuries=incident.injuries,
        trapped=incident.trapped,
        severity=sev_result["severity"],
        status=incident.status or "active",
        nlp_extracted=json.dumps(nlp_result),
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident


@router.get("/", response_model=list[IncidentResponse])
def list_incidents(
    incident_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Incident)
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    if severity:
        query = query.filter(Incident.severity == severity)
    if status:
        query = query.filter(Incident.status == status)
    return query.all()


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.put("/{incident_id}/status")
def update_incident_status(incident_id: int, body: dict, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    new_status = body.get("status")
    if new_status not in ("resolved", "active", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status value")
    incident.status = new_status
    db.commit()
    db.refresh(incident)
    return {"id": incident.id, "status": incident.status}


@router.post("/{incident_id}/analyze")
def analyze_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    nlp_result = extract_incident_info(
        incident.description or "",
        {
            "location": incident.location,
            "affected_people": incident.affected_people,
        }
    )
    sev_data = {
        "incident_type": incident.incident_type,
        "affected_people": incident.affected_people or 0,
        "injuries": incident.injuries or 0,
        "trapped": incident.trapped or 0,
        "nlp_extracted": json.dumps(nlp_result),
    }
    sev_result = classify_severity(sev_data)

    incident.nlp_extracted = json.dumps(nlp_result)
    incident.severity = sev_result["severity"]
    db.commit()
    db.refresh(incident)

    return {
        "incident_id": incident.id,
        "nlp_result": nlp_result,
        "severity_result": sev_result,
        "updated_severity": incident.severity,
        "severity": incident.severity,
        "nlp_extracted": incident.nlp_extracted,
    }
