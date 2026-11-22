from datetime import datetime
from typing import Optional, Any, Literal
from pydantic import BaseModel, ConfigDict


# --- Incident Schemas ---

class IncidentCreate(BaseModel):
    title: str
    description: str
    incident_type: Optional[str] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    affected_people: Optional[int] = 0
    injuries: Optional[int] = 0
    trapped: Optional[int] = 0
    severity: Optional[str] = "medium"
    status: Optional[str] = "active"


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    incident_type: Optional[str] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    affected_people: Optional[int] = 0
    injuries: Optional[int] = 0
    trapped: Optional[int] = 0
    severity: Optional[str] = "medium"
    status: Optional[str] = "active"
    created_at: Optional[datetime] = None
    nlp_extracted: Optional[str] = None
    assigned_team_id: Optional[int] = None


# --- Team Schemas ---

class TeamCreate(BaseModel):
    name: str
    team_type: str
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    availability: Optional[str] = "available"
    resources: Optional[str] = None
    capacity: Optional[int] = 5


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    team_type: str
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    availability: Optional[str] = "available"
    resources: Optional[str] = None
    capacity: Optional[int] = 5


# --- Road Schemas ---

class RoadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_node: Optional[str] = None
    end_node: Optional[str] = None
    distance_km: Optional[float] = None
    base_time_min: Optional[float] = None
    weather_condition: Optional[str] = "clear"
    traffic_level: Optional[str] = "low"
    flood_risk: Optional[float] = 0.0
    historical_risk: Optional[float] = 0.0
    accessibility: Optional[str] = "accessible"
    risk_score: Optional[float] = 0.0
    last_updated: Optional[datetime] = None


class RoadConditionUpdate(BaseModel):
    weather_condition: Optional[str] = None
    traffic_level: Optional[str] = None
    flood_risk: Optional[float] = None
    historical_risk: Optional[float] = None
    accessibility: Optional[Literal["accessible", "partial", "high_risk", "blocked"]] = None


# --- Assignment Schemas ---

class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    team_id: int
    route_data: Optional[str] = None
    status: Optional[str] = "active"
    assigned_at: Optional[datetime] = None
    reason: Optional[str] = None


# --- Resource Allocation Schemas ---

class ResourceAllocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    team_id: int
    resources_allocated: Optional[str] = None
    priority: Optional[int] = 0
    reason: Optional[str] = None
    created_at: Optional[datetime] = None


# --- Route Schemas ---

class RouteRequest(BaseModel):
    team_id: int
    incident_id: int


class RouteResponse(BaseModel):
    team_id: int
    incident_id: int
    path: list
    total_distance_km: float
    estimated_time_min: float
    risks: list
    start_node: Optional[str] = None
    end_node: Optional[str] = None
    nodes_coords: Optional[dict] = None
    weighted_cost: Optional[float] = None
