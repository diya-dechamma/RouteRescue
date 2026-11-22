from datetime import datetime

WEATHER_SCORES = {"clear": 0, "cloudy": 1, "rainy": 3, "stormy": 6, "foggy": 2}
TRAFFIC_SCORES = {"low": 0, "moderate": 2, "heavy": 5, "gridlock": 9}

def predict_road_accessibility(conditions: dict) -> dict:
    weather = conditions.get("weather_condition", "clear")
    traffic = conditions.get("traffic_level", "low")
    flood_risk = float(conditions.get("flood_risk", 0))
    historical_risk = float(conditions.get("historical_risk", 0))
    road_closure = conditions.get("road_closure", False)
    
    factors = {}
    score = 0.0
    
    w_score = WEATHER_SCORES.get(weather, 0)
    factors["weather"] = {"condition": weather, "contribution": w_score, "note": f"Weather '{weather}' adds {w_score} risk points"}
    score += w_score
    
    t_score = TRAFFIC_SCORES.get(traffic, 0)
    factors["traffic"] = {"level": traffic, "contribution": t_score, "note": f"Traffic '{traffic}' adds {t_score} risk points"}
    score += t_score
    
    f_score = round(flood_risk * 1.0, 2)
    factors["flood_risk"] = {"raw_value": flood_risk, "contribution": f_score, "note": f"Flood risk {flood_risk}/10 adds {f_score} risk points"}
    score += f_score
    
    h_score = round(historical_risk * 0.5, 2)
    factors["historical_risk"] = {"raw_value": historical_risk, "contribution": h_score, "note": f"Historical risk {historical_risk}/10 adds {h_score} risk points"}
    score += h_score
    
    if road_closure:
        factors["road_closure"] = {"active": True, "contribution": 15, "note": "Active road closure adds 15 risk points"}
        score += 15
    else:
        factors["road_closure"] = {"active": False, "contribution": 0, "note": "No active road closure"}
    
    score = round(score, 2)
    
    if score <= 3: accessibility = "accessible"; rec = "Road is clear and accessible for emergency vehicles."
    elif score <= 7: accessibility = "partial"; rec = "Road is partially accessible. Use with caution and monitor conditions."
    elif score <= 12: accessibility = "high_risk"; rec = "High risk road. Consider alternative routes. Emergency vehicles proceed with extreme caution."
    else: accessibility = "blocked"; rec = "Road is blocked or too dangerous. Must use alternative route."
    
    return {"accessibility": accessibility, "risk_score": score, "factors": factors, "recommendation": rec, "predicted_at": datetime.utcnow().isoformat()}
