import re
from typing import Optional

LOCATION_KEYWORDS = ["mysuru","mysore","bangalore","hubli","mangalore","vijayanagar","kuvempunagar","hebbal","nazarbad","saraswathipuram","chamundi","bannimantap","lakshmipuram","jayalakshmipuram","gokulam"]
INJURY_PATTERNS = [r'(\d+)\s*(?:people|persons?|victims?|individuals?)?\s*(?:are\s+)?injur', r'injur(?:ed|ies)\s+(?:to\s+)?(\d+)', r'(\w+)\s+(?:people\s+)?injur']
TRAPPED_PATTERNS = [r'(\d+)\s*(?:people|persons?)?\s*(?:are\s+)?trapped', r'trapped\s+(\d+)']
NUMBER_WORDS = {"one":1,"two":2,"three":3,"four":4,"five":5,"six":6,"seven":7,"eight":8,"nine":9,"ten":10,"eleven":11,"twelve":12,"fifteen":15,"twenty":20,"thirty":30,"fifty":50,"hundred":100}
SEVERITY_KEYWORDS = {"critical":["critical","severe","fatal","major","devastating","catastrophic"],"high":["serious","urgent","emergency","dangerous","hazardous"],"medium":["moderate","significant","injured","trapped"],"low":["minor","small","few"]}
INCIDENT_KEYWORDS = {"accident":["accident","collision","crash","vehicle","car","truck","highway"],"flood":["flood","waterlog","inundat","submerg","overflow"],"fire":["fire","blaze","burning","flame","smoke"],"medical_emergency":["heart","cardiac","medical","ambulance","unconscious","breathing","stroke"],"other":[]}

def word_to_num(text):
    for word, num in NUMBER_WORDS.items():
        text = re.sub(r'\b' + word + r'\b', str(num), text, flags=re.IGNORECASE)
    return text

def extract_incident_info(description: str, manual_data: dict = {}) -> dict:
    desc_lower = description.lower()
    desc_norm = word_to_num(desc_lower)
    
    # Extract numbers
    injured = 0
    for pat in INJURY_PATTERNS:
        m = re.search(pat, desc_norm, re.IGNORECASE)
        if m:
            try: injured = int(m.group(1)); break
            except: pass
    
    trapped = 0
    for pat in TRAPPED_PATTERNS:
        m = re.search(pat, desc_norm, re.IGNORECASE)
        if m:
            try: trapped = int(m.group(1)); break
            except: pass
    
    # Extract location
    location = None
    for loc in LOCATION_KEYWORDS:
        if loc in desc_lower:
            location = loc.capitalize()
            break
    
    # Detect incident type
    detected_type = "other"
    best_score = 0
    for itype, keywords in INCIDENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in desc_lower)
        if score > best_score:
            best_score = score
            detected_type = itype
    
    # Extract emergency keywords
    all_keywords = []
    for kw_list in list(SEVERITY_KEYWORDS.values()) + list(INCIDENT_KEYWORDS.values()):
        for kw in kw_list:
            if kw in desc_lower and kw not in all_keywords:
                all_keywords.append(kw)
    
    # Severity hints
    severity_hints = []
    for sev, kws in SEVERITY_KEYWORDS.items():
        if any(kw in desc_lower for kw in kws):
            severity_hints.append(sev)
    
    # Affected people from description
    affected_match = re.search(r'(\d+)\s*(?:residents?|people|persons?|families|households?)\s*(?:are\s+)?(?:affected|impacted|displaced)', desc_norm)
    affected = int(affected_match.group(1)) if affected_match else 0
    
    return {
        "extracted": {
            "incident_type": detected_type if best_score > 0 else None,
            "location": location,
            "injured_count": injured,
            "trapped_count": trapped,
            "affected_count": affected,
            "emergency_keywords": all_keywords[:10],
            "severity_hints": severity_hints,
            "confidence": min(1.0, (best_score + (1 if location else 0) + (1 if injured > 0 else 0)) / 5.0)
        },
        "manual": manual_data,
        "source_description": description
    }
