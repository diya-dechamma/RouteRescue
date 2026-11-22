from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Road
from schemas import RoadResponse, RoadConditionUpdate
from ai_modules.road_predictor import predict_road_accessibility
from algorithms.graph_router import MYSURU_NODES, MYSURU_EDGES_BASE

router = APIRouter()


@router.get("/network")
def get_road_network():
    nodes = [{"id": node_id, "lat": coords[0], "lng": coords[1]} for node_id, coords in MYSURU_NODES.items()]
    edges = [
        {
            "id": road_id,
            "source": start,
            "target": end,
            "distance_km": dist,
        }
        for start, end, dist, road_id in MYSURU_EDGES_BASE
    ]
    return {"nodes": nodes, "edges": edges}


@router.get("/", response_model=list[RoadResponse])
def list_roads(db: Session = Depends(get_db)):
    return db.query(Road).all()


@router.put("/{road_id}/condition", response_model=RoadResponse)
def update_road_condition(road_id: int, update: RoadConditionUpdate, db: Session = Depends(get_db)):
    road = db.query(Road).filter(Road.id == road_id).first()
    if not road:
        raise HTTPException(status_code=404, detail="Road not found")

    if update.weather_condition is not None:
        road.weather_condition = update.weather_condition
    if update.traffic_level is not None:
        road.traffic_level = update.traffic_level
    if update.flood_risk is not None:
        road.flood_risk = update.flood_risk
    if update.historical_risk is not None:
        road.historical_risk = update.historical_risk

    pred = predict_road_accessibility({
        "weather_condition": road.weather_condition,
        "traffic_level": road.traffic_level,
        "flood_risk": road.flood_risk,
        "historical_risk": road.historical_risk,
    })
    road.accessibility = update.accessibility or pred["accessibility"]
    road.risk_score = max(pred["risk_score"], 15) if road.accessibility == "blocked" else pred["risk_score"]
    road.last_updated = datetime.utcnow()

    db.commit()
    db.refresh(road)
    return road


@router.post("/predict")
def predict_accessibility(body: dict):
    conditions = {
        "weather_condition": body.get("weather", "clear"),
        "traffic_level": body.get("traffic", "low"),
        "flood_risk": body.get("flood_risk", 0),
        "historical_risk": body.get("historical_risk", 0),
        "road_closure": body.get("road_closure", False),
    }
    result = predict_road_accessibility(conditions)
    return result
