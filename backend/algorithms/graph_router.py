import heapq
import math
from typing import Optional

# Mysuru road network - nodes are key intersections
MYSURU_NODES = {
    "mysuru_central": (12.2958, 76.6394),
    "kuvempunagar": (12.3157, 76.6412),
    "vijayanagar": (12.3045, 76.6187),
    "hebbal": (12.2742, 76.6453),
    "nazarbad": (12.3025, 76.6453),
    "saraswathipuram": (12.3123, 76.6301),
    "chamundi_hill": (12.2719, 76.6697),
    "bannimantap": (12.2896, 76.6256),
    "lakshmipuram": (12.3031, 76.6567),
    "gokulam": (12.3287, 76.6256),
    "jss_area": (12.3098, 76.6185),
    "mysore_airport": (12.2306, 76.6552),
    "highway_junction": (12.3521, 76.6189),
}

# Edges: (start, end, distance_km, road_id)
MYSURU_EDGES_BASE = [
    ("mysuru_central", "nazarbad", 2.1, 1),
    ("mysuru_central", "bannimantap", 2.8, 2),
    ("mysuru_central", "lakshmipuram", 1.9, 3),
    ("mysuru_central", "chamundi_hill", 4.5, 4),
    ("nazarbad", "kuvempunagar", 2.3, 5),
    ("nazarbad", "saraswathipuram", 1.5, 6),
    ("saraswathipuram", "kuvempunagar", 1.2, 7),
    ("saraswathipuram", "gokulam", 2.1, 8),
    ("kuvempunagar", "gokulam", 2.0, 9),
    ("kuvempunagar", "highway_junction", 4.1, 10),
    ("gokulam", "highway_junction", 3.8, 11),
    ("vijayanagar", "bannimantap", 1.8, 12),
    ("vijayanagar", "jss_area", 0.9, 13),
    ("jss_area", "gokulam", 2.5, 14),
    ("bannimantap", "hebbal", 2.4, 15),
    ("hebbal", "mysore_airport", 6.2, 16),
    ("hebbal", "chamundi_hill", 3.1, 17),
    ("lakshmipuram", "nazarbad", 1.1, 18),
    ("mysuru_central", "vijayanagar", 3.3, 19),
    ("saraswathipuram", "jss_area", 2.0, 20),
]

SPEED_KMH = 40  # emergency vehicle avg speed

def haversine(coord1, coord2):
    R = 6371
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def get_edge_weight(distance_km, accessibility, traffic_level):
    if accessibility == "blocked": return float('inf')
    base = distance_km
    risk_mult = {"accessible": 1.0, "partial": 1.6, "high_risk": 2.8}.get(accessibility, 1.0)
    traffic_mult = {"low": 1.0, "moderate": 1.3, "heavy": 1.7, "gridlock": 2.5}.get(traffic_level, 1.0)
    return base * risk_mult * traffic_mult

def build_graph(road_conditions: dict = {}):
    """Build adjacency list graph. road_conditions: {road_id: {accessibility, traffic_level}}"""
    graph = {node: [] for node in MYSURU_NODES}
    for start, end, dist, road_id in MYSURU_EDGES_BASE:
        cond = road_conditions.get(road_id, {})
        access = cond.get("accessibility", "accessible")
        traffic = cond.get("traffic_level", "low")
        weight = get_edge_weight(dist, access, traffic)
        graph[start].append((end, weight, dist, road_id, access))
        graph[end].append((start, weight, dist, road_id, access))
    return graph

def find_nearest_node(lat, lng):
    best, best_dist = None, float('inf')
    for node, (nlat, nlng) in MYSURU_NODES.items():
        d = haversine((lat, lng), (nlat, nlng))
        if d < best_dist:
            best_dist = d
            best = node
    return best

def dijkstra(graph, start, end):
    dist = {n: float('inf') for n in graph}
    dist[start] = 0
    prev = {n: None for n in graph}
    road_taken = {n: None for n in graph}
    pq = [(0, start)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]: continue
        if u == end: break
        for v, w, actual_dist, road_id, access in graph[u]:
            if w == float('inf'): continue
            nd = dist[u] + w
            if nd < dist[v]:
                dist[v] = nd
                prev[v] = u
                road_taken[v] = (road_id, access, actual_dist)
                heapq.heappush(pq, (nd, v))
    if dist[end] == float('inf'): return None
    path, risks = [], []
    node = end
    total_dist = 0
    while node:
        path.insert(0, node)
        if road_taken[node]:
            rid, access, d = road_taken[node]
            total_dist += d
            if access in ("high_risk", "partial"):
                risks.append({"road_id": rid, "accessibility": access, "node": node})
        node = prev[node]
    total_time = round((total_dist / SPEED_KMH) * 60, 1)
    return {"path": path, "total_distance_km": round(total_dist, 2), "estimated_time_min": total_time, "risks": risks, "weighted_cost": round(dist[end], 3)}

def find_route(team_lat, team_lng, incident_lat, incident_lng, road_conditions={}):
    graph = build_graph(road_conditions)
    start = find_nearest_node(team_lat, team_lng)
    end = find_nearest_node(incident_lat, incident_lng)
    if start == end:
        return {"path": [start], "total_distance_km": 0, "estimated_time_min": 0, "risks": [], "start_node": start, "end_node": end, "weighted_cost": 0}
    result = dijkstra(graph, start, end)
    if result:
        result["start_node"] = start
        result["end_node"] = end
        result["nodes_coords"] = {n: list(MYSURU_NODES[n]) for n in result["path"] if n in MYSURU_NODES}
    return result

def find_alternative_route(team_lat, team_lng, incident_lat, incident_lng, road_conditions={}, blocked_roads=[]):
    modified = dict(road_conditions)
    for rid in blocked_roads:
        modified[rid] = {"accessibility": "blocked", "traffic_level": "gridlock"}
    return find_route(team_lat, team_lng, incident_lat, incident_lng, modified)
