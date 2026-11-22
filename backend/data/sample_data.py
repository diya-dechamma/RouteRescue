import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import Incident, EmergencyTeam, Road, Assignment, ResourceAllocation
from ai_modules.nlp_extractor import extract_incident_info
from ai_modules.severity_classifier import classify_severity
from ai_modules.road_predictor import predict_road_accessibility

def seed_database(db: Session):
    if db.query(EmergencyTeam).count() > 0:
        return  # Already seeded

    # Teams
    teams = [
        EmergencyTeam(name="Ambulance Alpha", team_type="ambulance", location="Mysuru Central Hospital", lat=12.2958, lng=76.6394, availability="available", resources=json.dumps({"medical_kits": 5, "stretchers": 2, "defibrillator": 1}), capacity=4),
        EmergencyTeam(name="Ambulance Beta", team_type="ambulance", location="JSS Hospital Area", lat=12.3098, lng=76.6185, availability="available", resources=json.dumps({"medical_kits": 4, "stretchers": 2, "oxygen_tanks": 3}), capacity=3),
        EmergencyTeam(name="Fire & Rescue Unit 1", team_type="fire_rescue", location="Bannimantap Fire Station", lat=12.2896, lng=76.6256, availability="available", resources=json.dumps({"fire_hoses": 4, "foam_canisters": 6, "rescue_tools": 3}), capacity=6),
        EmergencyTeam(name="Police Unit Gamma", team_type="police", location="Nazarbad Police Station", lat=12.3025, lng=76.6453, availability="available", resources=json.dumps({"patrol_units": 3, "barriers": 10}), capacity=5),
        EmergencyTeam(name="Disaster Response Delta", team_type="disaster_response", location="Vijayanagar", lat=12.3045, lng=76.6187, availability="available", resources=json.dumps({"rescue_boats": 2, "life_vests": 20, "emergency_food": 50}), capacity=8),
    ]
    db.add_all(teams)
    db.commit()

    # Roads
    road_data = [
        {"name": "Mysuru Central - Nazarbad Road", "start_node": "mysuru_central", "end_node": "nazarbad", "distance_km": 2.1, "base_time_min": 6, "weather_condition": "clear", "traffic_level": "moderate", "flood_risk": 1.0, "historical_risk": 1.5},
        {"name": "Mysuru Central - Bannimantap Road", "start_node": "mysuru_central", "end_node": "bannimantap", "distance_km": 2.8, "base_time_min": 8, "weather_condition": "clear", "traffic_level": "low", "flood_risk": 0.5, "historical_risk": 1.0},
        {"name": "Mysuru Central - Lakshmipuram Link", "start_node": "mysuru_central", "end_node": "lakshmipuram", "distance_km": 1.9, "base_time_min": 5, "weather_condition": "clear", "traffic_level": "low", "flood_risk": 0.5, "historical_risk": 0.5},
        {"name": "Mysuru - Chamundi Hill Road", "start_node": "mysuru_central", "end_node": "chamundi_hill", "distance_km": 4.5, "base_time_min": 15, "weather_condition": "cloudy", "traffic_level": "low", "flood_risk": 0.5, "historical_risk": 2.0},
        {"name": "Nazarbad - Kuvempunagar Road", "start_node": "nazarbad", "end_node": "kuvempunagar", "distance_km": 2.3, "base_time_min": 7, "weather_condition": "clear", "traffic_level": "moderate", "flood_risk": 1.0, "historical_risk": 1.0},
        {"name": "Nazarbad - Saraswathipuram Link", "start_node": "nazarbad", "end_node": "saraswathipuram", "distance_km": 1.5, "base_time_min": 5, "weather_condition": "clear", "traffic_level": "low", "flood_risk": 0.5, "historical_risk": 0.5},
        {"name": "Saraswathipuram - Kuvempunagar Road", "start_node": "saraswathipuram", "end_node": "kuvempunagar", "distance_km": 1.2, "base_time_min": 4, "weather_condition": "clear", "traffic_level": "low", "flood_risk": 0.5, "historical_risk": 0.5},
        {"name": "Saraswathipuram - Gokulam Road", "start_node": "saraswathipuram", "end_node": "gokulam", "distance_km": 2.1, "base_time_min": 6, "weather_condition": "rainy", "traffic_level": "heavy", "flood_risk": 4.0, "historical_risk": 3.0},
        {"name": "Kuvempunagar - Gokulam Avenue", "start_node": "kuvempunagar", "end_node": "gokulam", "distance_km": 2.0, "base_time_min": 6, "weather_condition": "clear", "traffic_level": "low", "flood_risk": 1.0, "historical_risk": 1.0},
        {"name": "Kuvempunagar - Highway Junction", "start_node": "kuvempunagar", "end_node": "highway_junction", "distance_km": 4.1, "base_time_min": 10, "weather_condition": "clear", "traffic_level": "moderate", "flood_risk": 0.5, "historical_risk": 1.5},
        {"name": "Gokulam - Highway Junction", "start_node": "gokulam", "end_node": "highway_junction", "distance_km": 3.8, "base_time_min": 10, "weather_condition": "clear", "traffic_level": "low", "flood_risk": 0.5, "historical_risk": 1.0},
        {"name": "Vijayanagar - Bannimantap Road", "start_node": "vijayanagar", "end_node": "bannimantap", "distance_km": 1.8, "base_time_min": 5, "weather_condition": "rainy", "traffic_level": "heavy", "flood_risk": 6.0, "historical_risk": 4.0},
        {"name": "Vijayanagar - JSS Area Road", "start_node": "vijayanagar", "end_node": "jss_area", "distance_km": 0.9, "base_time_min": 3, "weather_condition": "rainy", "traffic_level": "moderate", "flood_risk": 5.0, "historical_risk": 3.5},
        {"name": "JSS Area - Gokulam Road", "start_node": "jss_area", "end_node": "gokulam", "distance_km": 2.5, "base_time_min": 7, "weather_condition": "clear", "traffic_level": "low", "flood_risk": 1.0, "historical_risk": 1.0},
        {"name": "Bannimantap - Hebbal Road", "start_node": "bannimantap", "end_node": "hebbal", "distance_km": 2.4, "base_time_min": 7, "weather_condition": "clear", "traffic_level": "low", "flood_risk": 2.0, "historical_risk": 2.0},
        {"name": "Hebbal - Airport Road", "start_node": "hebbal", "end_node": "mysore_airport", "distance_km": 6.2, "base_time_min": 15, "weather_condition": "clear", "traffic_level": "low", "flood_risk": 0.5, "historical_risk": 1.0},
        {"name": "Hebbal - Chamundi Hill Access", "start_node": "hebbal", "end_node": "chamundi_hill", "distance_km": 3.1, "base_time_min": 10, "weather_condition": "cloudy", "traffic_level": "low", "flood_risk": 0.5, "historical_risk": 2.5},
        {"name": "Lakshmipuram - Nazarbad Link", "start_node": "lakshmipuram", "end_node": "nazarbad", "distance_km": 1.1, "base_time_min": 3, "weather_condition": "clear", "traffic_level": "moderate", "flood_risk": 1.0, "historical_risk": 1.0},
        {"name": "Mysuru - Vijayanagar Bypass", "start_node": "mysuru_central", "end_node": "vijayanagar", "distance_km": 3.3, "base_time_min": 10, "weather_condition": "rainy", "traffic_level": "heavy", "flood_risk": 5.5, "historical_risk": 3.0},
        {"name": "Saraswathipuram - JSS Area Road", "start_node": "saraswathipuram", "end_node": "jss_area", "distance_km": 2.0, "base_time_min": 6, "weather_condition": "clear", "traffic_level": "low", "flood_risk": 1.0, "historical_risk": 1.0},
    ]
    for i, rd in enumerate(road_data, 1):
        cond_input = {**rd}
        pred = predict_road_accessibility(cond_input)
        road = Road(id=i, accessibility=pred["accessibility"], risk_score=pred["risk_score"], last_updated=datetime.utcnow(), **rd)
        db.add(road)
    db.commit()

    # Incidents
    inc1_desc = "Major road accident on Mysuru-Bangalore highway with 5 people injured and 2 trapped inside vehicle. Severe collision involving truck and two cars."
    nlp1 = extract_incident_info(inc1_desc, {"location": "Highway Junction", "affected_people": 7})
    sev1_data = {"incident_type": "accident", "affected_people": 7, "injuries": 5, "trapped": 2, "nlp_extracted": json.dumps(nlp1)}
    sev1 = classify_severity(sev1_data)
    
    inc2_desc = "Major flooding in Vijayanagar residential area. 50 residents affected, roads waterlogged, families stranded on rooftops. Flood water rising."
    nlp2 = extract_incident_info(inc2_desc, {"location": "Vijayanagar", "affected_people": 50})
    sev2_data = {"incident_type": "flood", "affected_people": 50, "injuries": 0, "trapped": 0, "nlp_extracted": json.dumps(nlp2)}
    sev2 = classify_severity(sev2_data)
    
    inc3_desc = "Medical emergency - cardiac arrest patient at JSS Hospital area. 70-year-old male, unconscious, requires urgent ambulance."
    nlp3 = extract_incident_info(inc3_desc, {"location": "JSS Area", "affected_people": 1})
    sev3_data = {"incident_type": "medical_emergency", "affected_people": 1, "injuries": 1, "trapped": 0, "nlp_extracted": json.dumps(nlp3)}
    sev3 = classify_severity(sev3_data)
    
    incidents = [
        Incident(title="Major Highway Accident - M-B Highway", description=inc1_desc, incident_type="accident", location="Highway Junction, Mysuru", lat=12.3521, lng=76.6189, affected_people=7, injuries=5, trapped=2, severity=sev1["severity"], nlp_extracted=json.dumps(nlp1), status="active"),
        Incident(title="Residential Flood - Vijayanagar", description=inc2_desc, incident_type="flood", location="Vijayanagar, Mysuru", lat=12.3045, lng=76.6187, affected_people=50, injuries=0, trapped=0, severity=sev2["severity"], nlp_extracted=json.dumps(nlp2), status="active"),
        Incident(title="Cardiac Emergency - JSS Area", description=inc3_desc, incident_type="medical_emergency", location="JSS Hospital Area, Mysuru", lat=12.3098, lng=76.6185, affected_people=1, injuries=1, trapped=0, severity=sev3["severity"], nlp_extracted=json.dumps(nlp3), status="active"),
    ]
    db.add_all(incidents)
    db.commit()
