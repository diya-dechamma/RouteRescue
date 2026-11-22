import json
from datetime import datetime

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
RESOURCE_TEMPLATES = {
    "ambulance": {"medical_kits": 5, "stretchers": 2, "defibrillator": 1, "oxygen_tanks": 3},
    "fire_rescue": {"fire_hoses": 4, "foam_canisters": 6, "rescue_tools": 3, "breathing_apparatus": 4},
    "police": {"patrol_units": 3, "barriers": 10, "communication_sets": 5},
    "disaster_response": {"rescue_boats": 2, "life_vests": 20, "emergency_food": 50, "water_purifiers": 2}
}

def allocate_resources(incidents: list, teams: list) -> list:
    sorted_incidents = sorted(incidents, key=lambda i: SEVERITY_ORDER.get(i.get("severity", "low"), 3))
    available = {t["id"]: t for t in teams if t.get("availability") == "available"}
    allocations = []

    def get_inventory(team):
        raw_inventory = team.get("resources", {})
        if isinstance(raw_inventory, str):
            try:
                return json.loads(raw_inventory)
            except (json.JSONDecodeError, TypeError):
                return {}
        if isinstance(raw_inventory, dict):
            return dict(raw_inventory)
        return {}

    def get_reserve(team):
        inventory = get_inventory(team)
        template = RESOURCE_TEMPLATES.get(team.get("team_type", ""), {})
        reserve = {}
        for item, requested in template.items():
            try:
                remaining = int(inventory.get(item, 0))
            except (TypeError, ValueError):
                remaining = 0
            reserved = min(requested, remaining)
            if reserved > 0:
                reserve[item] = reserved
        return reserve
    
    for incident in sorted_incidents:
        if not available: break
        inc_type = incident.get("incident_type", "other")
        inc_sev = incident.get("severity", "medium")
        type_priority = {"accident": ["ambulance","police"], "flood": ["disaster_response","police"], "fire": ["fire_rescue","ambulance"], "medical_emergency": ["ambulance"], "other": ["police"]}
        preferred = type_priority.get(inc_type, ["police"])
        
        chosen = None
        for ptype in preferred:
            for tid, team in list(available.items()):
                if team.get("team_type") == ptype and get_reserve(team):
                    chosen = team; break
            if chosen: break
        if not chosen:
            for team in available.values():
                if get_reserve(team):
                    chosen = team
                    break
        if not chosen:
            break

        inventory = get_inventory(chosen)
        resources = get_reserve(chosen)
        for item, reserved in resources.items():
            inventory[item] = max(0, int(inventory.get(item, 0)) - reserved)

        chosen["resources"] = inventory
        reasons = [
            f"Incident severity: {inc_sev} (priority {SEVERITY_ORDER.get(inc_sev,3)})",
            f"Team type '{chosen.get('team_type')}' matches incident type '{inc_type}'",
            f"Team '{chosen.get('name')}' is available and has the requested inventory",
            f"Reserved only quantities present in team inventory"
        ]
        
        allocations.append({
            "incident_id": incident["id"],
            "incident_title": incident.get("title", ""),
            "team_id": chosen["id"],
            "team_name": chosen.get("name"),
            "severity": inc_sev,
            "resources_allocated": resources,
            "reasons": reasons,
            "allocated_at": datetime.utcnow().isoformat()
        })
        del available[chosen["id"]]
    
    return allocations
