def classify_severity(incident_data: dict) -> dict:
    score = 0
    reasons = []
    factors = {}
    
    incident_type = incident_data.get("incident_type", "other")
    affected = incident_data.get("affected_people", 0) or 0
    injuries = incident_data.get("injuries", 0) or 0
    trapped = incident_data.get("trapped", 0) or 0
    nlp_raw = incident_data.get("nlp_extracted", {})
    if isinstance(nlp_raw, str):
        import json
        try: nlp_raw = json.loads(nlp_raw)
        except: nlp_raw = {}
    keywords = []
    if isinstance(nlp_raw, dict):
        extracted = nlp_raw.get("extracted", {})
        keywords = extracted.get("emergency_keywords", [])
        if not injuries: injuries = extracted.get("injured_count", 0) or 0
        if not trapped: trapped = extracted.get("trapped_count", 0) or 0
        if not affected: affected = extracted.get("affected_count", 0) or 0
    
    factors["incident_type"] = incident_type
    factors["affected_people"] = affected
    factors["injuries"] = injuries
    factors["trapped"] = trapped
    factors["keywords_found"] = keywords
    
    # Type-based score
    type_scores = {"flood": 4, "fire": 4, "accident": 3, "medical_emergency": 3, "other": 1}
    type_score = type_scores.get(incident_type, 1)
    score += type_score
    if type_score >= 4: reasons.append(f"High-risk incident type: {incident_type}")
    
    # Trapped people
    if trapped > 0:
        score += 6
        reasons.append(f"{trapped} person(s) trapped - immediate extraction required")
    
    # Injuries
    if injuries >= 10: score += 5; reasons.append(f"Mass casualty: {injuries} injured")
    elif injuries >= 5: score += 4; reasons.append(f"Multiple injuries: {injuries} people")
    elif injuries >= 1: score += 2; reasons.append(f"{injuries} person(s) injured")
    
    # Affected people
    if affected >= 50: score += 4; reasons.append(f"Large-scale impact: {affected} people affected")
    elif affected >= 20: score += 3; reasons.append(f"Significant impact: {affected} people affected")
    elif affected >= 10: score += 2; reasons.append(f"Moderate impact: {affected} people affected")
    elif affected >= 5: score += 1; reasons.append(f"{affected} people affected")
    
    # Keywords
    critical_kws = ["critical","severe","fatal","major","devastating","catastrophic"]
    high_kws = ["serious","urgent","dangerous","hazardous"]
    if any(kw in keywords for kw in critical_kws): score += 3; reasons.append("Critical severity keywords detected")
    elif any(kw in keywords for kw in high_kws): score += 2; reasons.append("High severity keywords detected")
    
    factors["computed_score"] = score
    
    if score >= 10: severity = "critical"
    elif score >= 7: severity = "high"
    elif score >= 4: severity = "medium"
    else: severity = "low"
    
    if not reasons: reasons.append("Standard assessment based on incident type and scale")
    
    return {"severity": severity, "score": score, "reasons": reasons, "factors_considered": factors, "max_score_reference": 20}
