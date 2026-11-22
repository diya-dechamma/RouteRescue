from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    incident_type = Column(String)
    location = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    affected_people = Column(Integer, default=0)
    injuries = Column(Integer, default=0)
    trapped = Column(Integer, default=0)
    severity = Column(String, default="medium")
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    nlp_extracted = Column(Text)  # JSON string
    assigned_team_id = Column(Integer, nullable=True)

    assignments = relationship("Assignment", back_populates="incident")
    resource_allocations = relationship("ResourceAllocation", back_populates="incident")


class EmergencyTeam(Base):
    __tablename__ = "emergency_teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    team_type = Column(String)
    location = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    availability = Column(String, default="available")
    resources = Column(Text)  # JSON string
    capacity = Column(Integer, default=5)

    assignments = relationship("Assignment", back_populates="team")
    resource_allocations = relationship("ResourceAllocation", back_populates="team")


class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    start_node = Column(String)
    end_node = Column(String)
    distance_km = Column(Float)
    base_time_min = Column(Float)
    weather_condition = Column(String, default="clear")
    traffic_level = Column(String, default="low")
    flood_risk = Column(Float, default=0.0)
    historical_risk = Column(Float, default=0.0)
    accessibility = Column(String, default="accessible")
    risk_score = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    team_id = Column(Integer, ForeignKey("emergency_teams.id"))
    route_data = Column(Text)  # JSON string
    status = Column(String, default="active")
    assigned_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(Text)

    incident = relationship("Incident", back_populates="assignments")
    team = relationship("EmergencyTeam", back_populates="assignments")


class ResourceAllocation(Base):
    __tablename__ = "resource_allocations"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    team_id = Column(Integer, ForeignKey("emergency_teams.id"))
    resources_allocated = Column(Text)  # JSON string
    priority = Column(Integer, default=0)
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="resource_allocations")
    team = relationship("EmergencyTeam", back_populates="resource_allocations")
