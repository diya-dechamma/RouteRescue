import math
from algorithms.graph_router import haversine

TYPE_MATCH = {
    "accident": ["ambulance", "police", "fire_rescue"],
    "flood": ["disaster_response", "police", "ambulance"],
    "fire": ["fire_rescue", "ambulance", "disaster_response"],
    "medical_emergency": ["ambulance", "fire_rescue"],
    "other": ["police", "disaster_response", "ambulance"]
}

def assign_team_to_incident(incident_data: dict, available_teams: list, road_conditions: dict = {}) -> dict:
    incident_type = incident_data.get("incident_type", "other")
    inc_lat = incident_data.get("lat", 12.2958)
    inc_lng = incident_data.get("lng", 76.6394)
    severity = incident_data.get("severity", "medium")
    priority_types = TYPE_MATCH.get(incident_type, ["ambulance"])
    severity_boost = {"critical": 10, "high": 5, "medium": 2, "low": 0}
    
    scored = []
    for team in available_teams:
        if team.get("availability") != "available": continue
        score = 0; reasons = []
        t_type = team.get("team_type", "")
        if priority_types and t_type == priority_types[0]:
            score += 15; reasons.append(f"Primary match: {t_type} is ideal for {incident_type}")
        elif t_type in priority_types:
            score += 8; reasons.append(f"Secondary match: {t_type} suitable for {incident_type}")
        else:
            reasons.append(f"Type mismatch: {t_type} not ideal for {incident_type}")
        
        tlat, tlng = team.get("lat", 12.2958), team.get("lng", 76.6394)
        dist = haversine((tlat, tlng), (inc_lat, inc_lng))
        prox_score = max(0, 10 - dist * 2)
        score += prox_score
        reasons.append(f"Distance: {round(dist, 2)} km from incident (proximity score: {round(prox_score, 1)})")
        
        import json
        resources = team.get("resources", {})
        if isinstance(resources, str):
            try: resources = json.loads(resources)
            except: resources = {}
        cap = team.get("capacity", 5)
        res_score = min(5, cap)
        score += res_score
        reasons.append(f"Capacity: {cap} units (resource score: {res_score})")
        
        score += severity_boost.get(severity, 0)
        scored.append({"team": team, "score": round(score, 2), "reasons": reasons, "distance_km": round(dist, 2)})
    
    if not scored: return None
    best = max(scored, key=lambda x: x["score"])
    return best
