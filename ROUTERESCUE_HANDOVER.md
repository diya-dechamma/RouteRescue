# RouteRescue Developer Handover

**Inspection date:** 2026-11-22  
**Project root:** `C:\Users\ddiya\OneDrive\Desktop\RouteRescue`  
**Purpose:** Read-only technical handover for the existing academic demonstration project. This document does not describe a production emergency dispatch system.

## 1. Project Overview

- **Project title:** RouteRescue – AI-Powered Emergency Response Coordination
- **Problem statement:** Emergency response requires collecting incident reports, assessing urgency, coordinating teams and resources, and selecting routes when road conditions may change.
- **Proposed solution:** A React dashboard connected to a FastAPI service and SQLite database. It demonstrates incident intake, rule-based NLP and severity scoring, team assignments, inventory-aware resource allocation, road-condition estimates, graph routing, and route recalculation.
- **Main objective:** Demonstrate an end-to-end coordination workflow using a small, simulated Mysuru-area response network.
- **Unique features:** Explainable severity factors, team suitability scoring, weighted Dijkstra routing with blocked-edge exclusion, road-condition update/recalculation UI, and Leaflet map overlays.

The “AI” label describes deterministic academic-demo heuristics. There is no confirmed trained model, live dispatch connection, or validated real-world prediction service.

## 2. Technology Stack

### Backend

- Python **3.12.10** in `backend\venv`
- FastAPI **0.111.0**
- Uvicorn **0.29.0**
- SQLAlchemy **2.0.30**
- Pydantic **2.7.1**
- SQLite, using the Python standard-library driver through SQLAlchemy
- `httpx`, `python-multipart`, and `aiofiles` are also pinned in `backend/requirements.txt`

### Frontend

- Node **v24.21.0**, npm **11.19.0** observed on the inspection machine
- React **18.3.1**
- Vite **5.4.x** (manifest range `^5.4.8`; last observed production build used `5.4.21`)
- React Router DOM **6.26.2**
- Axios **1.7.7**
- Leaflet **1.9.4**, React-Leaflet **4.2.1**
- Recharts **2.12.7**
- Lucide React **0.447.0**

### Mapping and algorithms

- Leaflet/React-Leaflet renders the map and OpenStreetMap tiles.
- The road network is a fixed, in-code graph with hardcoded Mysuru-area node coordinates and edge distances.
- Dijkstra’s shortest-path algorithm uses weighted edge costs; there is no A* implementation.
- NLP, severity, road-accessibility, team assignment, and resource allocation are hand-written deterministic rules, not trained machine-learning models.

## 3. Project Architecture

### Folder structure

```text
RouteRescue/
├── backend/
│   ├── ai_modules/
│   │   ├── nlp_extractor.py
│   │   ├── road_predictor.py
│   │   └── severity_classifier.py
│   ├── algorithms/
│   │   └── graph_router.py
│   ├── data/
│   │   └── sample_data.py
│   ├── routers/
│   │   ├── assignments.py
│   │   ├── incidents.py
│   │   ├── resources.py
│   │   ├── roads.py
│   │   ├── routes_router.py
│   │   └── teams.py
│   ├── services/
│   │   ├── resource_allocator.py
│   │   └── team_assigner.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── schemas.py
│   ├── routerescue.db
│   ├── routerescue-pre-allocation3-fix-20261121-153607.db
│   └── venv/
├── frontend/
│   ├── src/
│   │   ├── components/Sidebar.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DynamicRouteUpdates.jsx
│   │   │   ├── EmergencyTeams.jsx
│   │   │   ├── IncidentManagement.jsx
│   │   │   ├── ReportEmergency.jsx
│   │   │   ├── ResourceAllocation.jsx
│   │   │   ├── RoadAccessibility.jsx
│   │   │   ├── RouteOptimization.jsx
│   │   │   └── TeamAssignment.jsx
│   │   ├── services/api.js
│   │   ├── styles/index.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
└── ROUTERESCUE_HANDOVER.md
```

`backend/venv`, `frontend/node_modules`, and `frontend/dist` are generated/runtime folders and should not be treated as application source. A root `.venv` directory also exists, but its purpose was not established; use `backend\venv` for the backend. The inspected root is not a Git repository, and no existing root `README.md`, `.gitignore`, or backend test directory was found.

### Frontend architecture

- `App.jsx` uses React Router and maps nine paths to pages.
- `Sidebar.jsx` supplies navigation.
- Each page calls API helpers in `frontend/src/services/api.js`.
- The dashboard loads incidents, teams, roads, and the graph network, then displays summary cards, tables, and a Leaflet map.
- The Dynamic Routes page compares a saved route with a recalculated route on Leaflet.

### Backend architecture

- `main.py` creates the FastAPI app, enables permissive CORS, initializes the database and sample data during lifespan startup, and mounts six routers.
- Routers validate some input with Pydantic schemas and use SQLAlchemy sessions from `database.py`.
- Domain heuristics live under `ai_modules/`, graph routing under `algorithms/`, and assignment/allocation logic under `services/`.

### Database architecture

- `database.py` configures `sqlite:///./routerescue.db`, relative to the backend process’s current working directory.
- `models.py` defines five SQLAlchemy models/tables. JSON-like values are stored as text fields containing JSON.
- Assignments and resource allocations have foreign keys to incidents and emergency teams. `Incident.assigned_team_id` itself is not declared as a foreign key.
- Startup creates missing tables and calls `seed_database`. The seeder returns early if any emergency team already exists; it does not repair partial or modified seed data.

### Frontend/backend communication

- Axios uses the hardcoded base URL `http://127.0.0.1:8000` in `frontend/src/services/api.js`.
- Vite serves on port 3000. `vite.config.js` includes an `/api` proxy, but the current Axios helpers call the backend URL directly, so that proxy is not used by those helpers.
- CORS allows all origins, methods, and headers. There is no authentication or authorization layer.

## 4. Complete Feature Status

“Implemented” below means present as a working prototype/demo path, not production-ready or operationally validated.

### 1. Emergency report submission and management — **Implemented for demo, with gaps**

- **What it does:** Creates incidents, lists/filters them, changes status, and allows re-analysis.
- **How:** `POST /incidents/` extracts NLP fields, calculates severity, stores the incident, and returns it. The management page offers filters, status changes, and re-analysis.
- **Important files:** `backend/routers/incidents.py`, `backend/schemas.py`, `backend/models.py`, `frontend/src/pages/ReportEmergency.jsx`, `frontend/src/pages/IncidentManagement.jsx`.
- **APIs:** `POST /incidents/`, `GET /incidents/`, `GET /incidents/{incident_id}`, `PUT /incidents/{incident_id}/status`, `POST /incidents/{incident_id}/analyze`.
- **Test evidence:** A new fire incident (ID 4) was previously submitted and persisted; the API returned NLP and severity fields. Read-only GET checks for incident routes returned HTTP 200 on 2026-11-22.
- **Gaps:** The “Additional Information” form field is sent but is not part of `IncidentCreate`, and is not included in the description by the frontend. The initial report response does not return severity explanation reasons; the separate analyze endpoint does.

### 2. NLP-based incident extraction — **Partially implemented; deterministic**

- **What it does:** Attempts to extract incident type, a known location name, injury/trapped/affected counts, keywords, severity hints, and a heuristic confidence.
- **How:** Regexes, number-word conversion, and keyword/location lists in `nlp_extractor.py`; results are stored as JSON text in `incidents.nlp_extracted`.
- **Important files:** `backend/ai_modules/nlp_extractor.py`, `backend/routers/incidents.py`, `frontend/src/pages/ReportEmergency.jsx`, `frontend/src/pages/IncidentManagement.jsx`.
- **APIs:** Extraction occurs in `POST /incidents/` and `POST /incidents/{incident_id}/analyze`.
- **Test evidence:** Prior incident 4 testing verified extraction of fire-related keywords, five injuries, and three trapped people. This is rule-based behavior, not a learned language model.
- **Gaps:** Location recognition is a small hardcoded keyword list; extracted location/type do not automatically replace manually submitted fields. The extraction confidence is heuristic, not calibrated.

### 3. Incident severity classification — **Implemented as a rule engine; UI explanation is partial**

- **What it does:** Produces low/medium/high/critical severity and supporting factors/reasons.
- **How:** Adds points for incident type, trapped/injured/affected people, and selected NLP keywords. Thresholds are in `severity_classifier.py`.
- **Important files:** `backend/ai_modules/severity_classifier.py`, `backend/routers/incidents.py`, `frontend/src/pages/ReportEmergency.jsx`, `frontend/src/pages/IncidentManagement.jsx`.
- **APIs:** Runs on incident creation and re-analysis.
- **Test evidence:** Incident 4 previously classified as critical; the stored incident and API response were inspected.
- **Gaps:** The report page shows the severity badge but looks for explanation fields under the NLP result that the classifier does not put there. The analyze endpoint returns `severity_result.reasons`. The advertised `max_score_reference` is 20, but the code does not cap the computed score and the theoretical point sum can exceed 20.

### 4. Predictive road accessibility — **Simulated/deterministic**

- **What it does:** Returns accessibility category, risk score, factor contributions, and a recommendation.
- **How:** Adds configured weather and traffic points, flood risk, half of historical risk, and an optional closure penalty. Thresholds map the score to `accessible`, `partial`, `high_risk`, or `blocked`.
- **Important files:** `backend/ai_modules/road_predictor.py`, `backend/routers/roads.py`, `frontend/src/pages/RoadAccessibility.jsx`.
- **APIs:** `POST /roads/predict`; road updates use `PUT /roads/{road_id}/condition`.
- **Test evidence:** Predictor UI/API behavior and weather/traffic input flows were previously exercised; live GET roads returned HTTP 200 on 2026-11-22.
- **Gaps:** No live weather, traffic, flood, or incident feed is connected. These values are user-entered or seeded simulation inputs. The frontend’s risk-color/progress thresholds are 0–1-style values while predictor scores are additive points, so the visual scale can be misleading.

### 5. Emergency team management and assignment — **Partially implemented**

- **What it does:** Lists, creates, and updates team records/status, and automatically assigns available teams to unassigned incidents.
- **How:** Assignment scores team type, straight-line proximity, capacity, and incident severity. Auto-assignment limits a team to one assignment in that run and stores the assignment/route.
- **Important files:** `backend/services/team_assigner.py`, `backend/routers/assignments.py`, `backend/routers/teams.py`, `frontend/src/pages/EmergencyTeams.jsx`, `frontend/src/pages/TeamAssignment.jsx`.
- **APIs:** Team CRUD/status routes and `POST /assignments/auto-assign`; a separate `POST /teams/assign` sets a team busy and updates `assigned_team_id`.
- **Test evidence:** Assignment 4 was previously created and persisted with team 3; prior API checks verified assignment and team endpoints. Current read-only list routes returned HTTP 200.
- **Gaps:** The team registration UI has no inventory editor, so teams created there have no resource inventory by default. Manual `/teams/assign` is not wired into the visible assignment page, does not create an `Assignment`, and does not compute a route. Auto-assignment’s `road_conditions` argument is not used by the scoring function; resources are not part of its suitability score.

### 6. Risk-aware graph route optimization — **Implemented as a simulated graph prototype**

- **What it does:** Finds a route between the nearest graph nodes for a team and incident.
- **How:** `graph_router.py` builds a fixed, undirected graph and runs Dijkstra. Edge weight is distance multiplied by accessibility and traffic penalties; `blocked` edges are excluded. It reports actual graph distance, a fixed-speed travel-time estimate (40 km/h), risk edges, weighted cost, and node coordinates.
- **Important files:** `backend/algorithms/graph_router.py`, `backend/routers/routes_router.py`, `backend/routers/assignments.py`, `frontend/src/pages/RouteOptimization.jsx`.
- **APIs:** `POST /routes/optimize`; route retrieval via `GET /routes/assignment/{assignment_id}`.
- **Test evidence:** Prior route tests calculated and saved assignment route data; a blocked-road alternative was verified. The current GET route returned HTTP 200.
- **Gaps:** The road topology and speeds are hardcoded. Optimization considers current accessibility and traffic, not live conditions; weather, flood-risk, historical-risk values do not directly affect route edge weights. `/routes/optimize` returns a result but does not save it; `/routes/recalculate` saves to an existing assignment.

### 7. Resource allocation — **Partially implemented; legacy records need reconciliation**

- **What it does:** Sorts unallocated active incidents by severity, selects available teams by incident-type preference, reserves only supported quantities present in team inventory, and updates inventory for new allocations.
- **How:** `resource_allocator.py` uses team-type templates, caps each item at the available quantity, decrements the in-memory inventory, and uses each team once per allocation run. `routers/resources.py` persists allocation and inventory changes and skips incidents that already have an allocation.
- **Important files:** `backend/services/resource_allocator.py`, `backend/routers/resources.py`, `backend/models.py`, `frontend/src/pages/ResourceAllocation.jsx`.
- **APIs:** `GET /resources/allocations`, `POST /resources/allocate`, `GET /resources/summary`.
- **Test evidence:** Prior isolated allocator checks passed for in-inventory allocation and empty-inventory rejection. Allocation 3 was corrected on 2026-11-21; the live allocation API returned its corrected JSON on that date. Read-only inventory/allocation comparisons were made on 2026-11-22.
- **Current database issue:** Allocation 3 is now `fire_hoses:4`, `foam_canisters:6`, `rescue_tools:3` and matches the listed Team 3 inventory. However, other stored allocation records still contain mismatches (see Section 6). The API skips any incident with any existing allocation, so these rows will not be automatically repaired or topped up.
- **Gaps:** No database transaction/locking policy for concurrent allocation requests, no explicit reservation ledger, and no multi-team resource split per incident. Existing historical allocations need reconciliation before assuming the ledger reflects current stock.

### 8. Dynamic route recalculation — **Implemented and previously tested; UI has a safety limitation**

- **What it does:** Updates a road’s accessibility and recalculates the saved assignment route from current road accessibility/traffic.
- **How:** `PUT /roads/{road_id}/condition` persists the road state; `POST /routes/recalculate` reads road rows, runs Dijkstra, and writes `assignments.route_data` and reason.
- **Important files:** `backend/routers/roads.py`, `backend/routers/routes_router.py`, `backend/algorithms/graph_router.py`, `frontend/src/pages/DynamicRouteUpdates.jsx`.
- **APIs:** `PUT /roads/{road_id}/condition`, `POST /routes/recalculate`, `GET /routes/assignment/{assignment_id}`.
- **Test evidence:** Road 18 was previously changed to blocked, verified in SQLite, assignment 4 recalculated to avoid it, and road 18 restored. The current read-only inspection confirms road 18 is `partial`. The current assignment 4 route is saved and avoids the currently blocked roads 8, 12, and 19. Frontend road-update/recalculation and route display were also previously exercised.
- **Gaps/safety:** The Dynamic Routes button marks the selected road blocked and recalculates, but does not automatically restore the road. The Road Accessibility form does not expose a direct accessibility selector; its condition changes are based on entered predictor inputs. A user must explicitly restore a test road’s original condition afterward.

### 9. GIS map and central dashboard — **Implemented for demo**

- **What it does:** Shows live API-backed incidents, teams, road status, dashboard counts, and a map. The Dynamic Routes page displays previous/recalculated paths and blocked edges.
- **How:** React-Leaflet, hardcoded graph coordinates from `/roads/network`, and OpenStreetMap raster tiles.
- **Important files:** `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/DynamicRouteUpdates.jsx`, `frontend/src/main.jsx`, `backend/routers/roads.py`.
- **APIs:** Dashboard reads `GET /incidents/`, `/teams/`, `/roads/`, and `/roads/network`; dynamic page reads assignments/roads/network and requests recalculation.
- **Test evidence:** A prior browser check confirmed page navigation, dashboard API data, and dynamic route map overlays. The frontend root returned HTTP 200 on 2026-11-22.
- **Gaps:** The network is an academic graph drawn as straight segments between hardcoded node coordinates, not road-centerline geometry. Dashboard map displays roads and incident/team markers but not the saved assignment route; route comparison is on the Dynamic Routes page. OpenStreetMap tiles require internet access.

## 5. AI and Algorithm Details

### NLP extraction

`backend/ai_modules/nlp_extractor.py`:

- Lowercases description text and converts a limited set of number words to digits.
- Uses regex patterns for injuries, trapped people, and affected population.
- Looks for locations from a fixed keyword list (Mysuru-area names plus a few other city names).
- Scores incident types by keyword occurrences and collects severity/incident keywords.
- Returns extracted values, manual input values, source description, and a heuristic confidence value.

This is a simple keyword/regex extractor. It does not use embeddings, a language-model API, or a trained NLP model.

### Severity scoring

`backend/ai_modules/severity_classifier.py`:

- Type points: flood/fire 4; accident/medical 3; other/default 1.
- Trapped: +6 if any.
- Injuries: +2 for 1–4, +4 for 5–9, +5 for 10 or more.
- Affected population: +1 at 5+, +2 at 10+, +3 at 20+, +4 at 50+.
- Critical keywords: +3; otherwise selected high keywords: +2.
- Thresholds: `critical` >=10, `high` >=7, `medium` >=4, else `low`.
- Returns reasons and factor details from the analyze endpoint.

The scoring is deterministic and should be treated as a demonstration heuristic, not an emergency-care decision rule.

### Road accessibility prediction

`backend/ai_modules/road_predictor.py`:

- Weather points: clear 0, cloudy 1, rainy 3, stormy 6, foggy 2.
- Traffic points: low 0, moderate 2, heavy 5, gridlock 9.
- Adds flood risk and half of historical risk.
- Adds 15 points for an explicitly supplied closure.
- Categories: score <=3 accessible; <=7 partial; <=12 high risk; >12 blocked.

No live forecast or traffic integration is present. The endpoint returns an estimate from input values and does not validate those values against external observations.

### Team suitability scoring

`backend/services/team_assigner.py`:

- Filters to teams marked available.
- Adds 15 for primary incident/team type match or 8 for a secondary match.
- Adds proximity points `max(0, 10 - 2 * distance_km)` using Haversine distance.
- Adds `min(5, capacity)`.
- Adds a severity boost: critical 10, high 5, medium 2, low 0.
- Chooses the highest score and returns reasons.

It does not use live travel time, inventory, road conditions, shift data, or team workload beyond availability/capacity.

### Route optimization and recalculation

`backend/algorithms/graph_router.py`:

- Defines 13 named graph nodes and 20 fixed undirected edges.
- Finds closest start/end nodes to supplied team/incident coordinates.
- Uses Dijkstra with edge cost:
  - accessibility multiplier: accessible 1.0, partial 1.6, high_risk 2.8, blocked infinity;
  - traffic multiplier: low 1.0, moderate 1.3, heavy 1.7, gridlock 2.5;
  - multiplied by base edge distance.
- Reports estimated minutes from total distance at fixed 40 km/h.
- Dynamic recalculation reruns Dijkstra using persisted road accessibility and traffic, then saves the result on the assignment.

It is a weighted shortest-path demonstration over the project’s graph, not turn-by-turn navigation or an actual traffic-aware routing service.

### Resource allocation

`backend/services/resource_allocator.py`:

- Sorts incidents by critical/high/medium/low.
- Prefers team types by incident type; falls back to another available team if it has supported inventory.
- Reserves up to each type’s template quantities but no more than the team inventory contains.
- Decrements the selected team’s in-memory inventory and uses that team once in the run.
- The API persists updated inventory and allocation records.

This is inventory-aware for new allocation runs, but it does not reconcile old allocations or divide an incident’s needs among multiple teams.

## 6. Database Details

- **Database:** `backend/routerescue.db`
- **Connection URL:** `sqlite:///./routerescue.db`; run the backend with the current directory set to `backend`.
- **Read-only inspection result:** 5 tables; incidents 4, emergency teams 5, roads 20, assignments 4, resource allocations 4.
- **Schema source:** `backend/models.py`.

### Tables

| Table | Important fields | Relationships |
|---|---|---|
| `incidents` | title, description, incident_type, location, lat/lng, affected_people, injuries, trapped, severity, status, nlp_extracted, assigned_team_id | Has ORM relationships to assignments and resource allocations. `assigned_team_id` is not a declared FK. |
| `emergency_teams` | name, team_type, location, lat/lng, availability, resources (JSON text), capacity | Has ORM relationships to assignments and resource allocations. |
| `roads` | name, start_node/end_node, distance/time, weather, traffic, flood/historical risk, accessibility, risk_score, last_updated | No FK relationships. |
| `assignments` | incident_id, team_id, route_data (JSON text), status, assigned_at, reason | FKs to incidents and emergency teams. |
| `resource_allocations` | incident_id, team_id, resources_allocated (JSON text), priority, reason, created_at | FKs to incidents and emergency teams. |

### Current records

There are three original sample incidents plus incident 4, titled `[TEST] Serious fire with trapped residents in Gokulam`. All four are currently active. Incident 4 is associated with team 3. There are four saved assignments and four allocation rows.

Current team roster and stored inventory:

| ID | Team | Type | Availability | Stored inventory |
|---:|---|---|---|---|
| 1 | Ambulance Alpha | ambulance | busy | medical_kits 5, stretchers 2, defibrillator 1 |
| 2 | Ambulance Beta | ambulance | busy | medical_kits 4, stretchers 2, oxygen_tanks 3 |
| 3 | Fire & Rescue Unit 1 | fire_rescue | busy | fire_hoses 4, foam_canisters 6, rescue_tools 3 |
| 4 | Police Unit Gamma | police | available | patrol_units 3, barriers 10 |
| 5 | Disaster Response Delta | disaster_response | busy | rescue_boats 2, life_vests 20, emergency_food 50 |

**Allocation 3 correction:** Allocation 3 still belongs to incident 4/team 3. Its stored resources are now `fire_hoses: 4`, `foam_canisters: 6`, `rescue_tools: 3`. The invalid `breathing_apparatus: 4` was removed on 2026-11-21 after the database was backed up. The original pre-correction backup is `backend/routerescue-pre-allocation3-fix-20261121-153607.db`.

**Other allocation inventory inconsistencies observed 2026-11-22 (not changed):**

- Allocation 1/team 1 includes `oxygen_tanks: 3`, which is absent from Team 1’s stored inventory.
- Allocation 2/team 5 includes `water_purifiers: 2`, which is absent from Team 5’s stored inventory.
- Allocation 4/team 2 includes `defibrillator: 1`, absent from Team 2’s inventory, and `medical_kits: 5` while the stored inventory is 4.

These are existing database rows. The current allocator filters new allocations by inventory, but the historical records should be reviewed and reconciled with the project owner before altering them.

### Assignment 4 and road status

- Assignment 4 is active, incident 4/team 3.
- Saved route: `bannimantap → mysuru_central → nazarbad → saraswathipuram → kuvempunagar → gokulam`.
- Saved distance: **9.6 km**; estimated time: **14.4 minutes**; risk notice: road 1 is partial.
- Its path uses graph edges/road IDs 2, 1, 6, 7, and 9; it avoids currently blocked roads.
- Road 18, Lakshmipuram–Nazarbad Link, is currently `partial`.
- Current roads marked `blocked`: **8** Saraswathipuram–Gokulam Road; **12** Vijayanagar–Bannimantap Road; **19** Mysuru–Vijayanagar Bypass.
- Current road counts: 12 accessible, 4 partial, 1 high-risk, 3 blocked.

## 7. API Documentation

All paths are relative to `http://127.0.0.1:8000`. The current OpenAPI document lists 25 operations, including health.

### Incidents

| Method and path | Purpose |
|---|---|
| `POST /incidents/` | Create incident; runs NLP and severity rules, stores the record. Request fields include title, description, incident type, location, coordinates, affected/injured/trapped counts and status. |
| `GET /incidents/` | List incidents; optional `incident_type`, `severity`, and `status` filters. |
| `GET /incidents/{incident_id}` | Get one incident. |
| `PUT /incidents/{incident_id}/status` | Change status to active, pending, or resolved; body `{"status":"..."}`. |
| `POST /incidents/{incident_id}/analyze` | Re-run extraction/classification and persist results; returns `nlp_result`, `severity_result`, and updated severity. |

### Teams and assignments

| Method and path | Purpose |
|---|---|
| `GET /teams/` | List all teams. |
| `GET /teams/available` | List available teams. |
| `POST /teams/` | Create team. |
| `PUT /teams/{team_id}` | Update team fields using the `TeamCreate` schema. |
| `PUT /teams/{team_id}/availability` | Set availability to available, busy, or offline. |
| `POST /teams/assign` | Directly set team busy and update an incident’s assigned team ID; does not create a full Assignment record or route. |
| `GET /assignments/` | List assignment records. |
| `GET /assignments/{assignment_id}` | Get one assignment. |
| `POST /assignments/auto-assign` | Assign available teams to active unassigned incidents, calculate routes, and persist assignments. |

### Roads and routes

| Method and path | Purpose |
|---|---|
| `GET /roads/` | List persisted roads and conditions. |
| `GET /roads/network` | Return fixed graph nodes, coordinates, and edges. |
| `PUT /roads/{road_id}/condition` | Update weather, traffic, flood/historical risk, or explicit accessibility (`accessible`, `partial`, `high_risk`, `blocked`). Persists the road. |
| `POST /roads/predict` | Return simulated accessibility/risk factors from body values such as `weather`, `traffic`, `flood_risk`, `historical_risk`, and `road_closure`. |
| `POST /routes/optimize` | Calculate route for `{ "team_id": n, "incident_id": n }`; does not persist it. |
| `POST /routes/recalculate` | Recalculate and persist an existing assignment route. Body includes `assignment_id` and optional `reason`. |
| `GET /routes/assignment/{assignment_id}` | Return assignment route data and IDs. |

### Resources, health, and documentation

| Method and path | Purpose |
|---|---|
| `GET /resources/allocations` | List saved allocations. |
| `POST /resources/allocate` | Allocate inventory to active incidents that have no allocation record. |
| `GET /resources/summary` | Return counts of incidents, teams, and allocations. |
| `GET /health` | Return `{"status":"ok","service":"RouteRescue API"}`. |
| `GET /docs` | Swagger UI. |
| `GET /openapi.json` | OpenAPI schema. |

## 8. How to Run the Project

Open two PowerShell terminals. Do not start the backend from the repository root: the SQLite URL is relative and could create/use a different database file.

### Backend

```powershell
Set-Location 'C:\Users\ddiya\OneDrive\Desktop\RouteRescue\backend'
.\venv\Scripts\Activate.ps1
python --version
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The expected Python version is **3.12.10**. If PowerShell blocks activation, use the venv interpreter directly:

```powershell
Set-Location 'C:\Users\ddiya\OneDrive\Desktop\RouteRescue\backend'
.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```powershell
Set-Location 'C:\Users\ddiya\OneDrive\Desktop\RouteRescue\frontend'
npm ci
npm run dev -- --host 127.0.0.1 --port 3000
```

`npm ci` uses the existing `package-lock.json`; it is included here for a new clone/installation, not something performed during this inspection.

### URLs

- Frontend: `http://127.0.0.1:3000/`
- Backend health: `http://127.0.0.1:8000/health`
- Swagger: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## 9. Testing and Verification

### Read-only checks performed for this handover on 2026-11-22

| Check | Result | Evidence |
|---|---|---|
| Backend health | **PASS** | `GET /health` returned HTTP 200. |
| Swagger/OpenAPI | **PASS** | `GET /docs` and `/openapi.json` returned HTTP 200. |
| Read-only API list/detail routes | **PASS** | GET incidents, teams, available teams, roads, network, assignments, allocations, resource summary, and assignment 4 route all returned HTTP 200. |
| Frontend availability | **PASS** | `GET http://127.0.0.1:3000/` returned HTTP 200. |
| Database inspection | **PASS** | Opened SQLite in read-only mode; inspected schema, counts, current blocked roads, assignments, teams, and allocations. |
| Source/config inspection | **PASS** | Inspected backend modules/routers, frontend pages/API helpers, package manifests, and Vite config. |
| Write endpoint execution during this handover | **NOT TESTED** | No API writes were made. |

### Previously executed tests recorded in the project history

| Test | Result | Notes |
|---|---|---|
| Python 3.12.10 environment and pinned dependencies | **PASS** | Dependencies installed; imports and `pip check` previously passed. |
| Backend Python compilation | **PASS** | `compileall` previously passed. |
| FastAPI startup, Swagger, and route registration | **PASS** | Backend ran; current live health/docs probes also pass. |
| Frontend production build | **PASS** | Vite build succeeded. It emitted a large-chunk warning: JS bundle about 820 KB minified (about 240 KB gzip). Build was not rerun for this read-only handover. |
| Incident 4 submission/NLP/severity persistence | **PASS** | Previously exercised; incident 4 remains in the current DB. |
| Assignment 4 route save and road 18 block/recalculate/restore | **PASS** | Previously exercised through backend APIs and database inspection; road 18 currently reads `partial`. |
| Frontend road update, recalculation, and GIS route display | **PASS** | Previously exercised in the browser; not rerun during this handover. |
| New allocator inventory checks | **PASS** | Previously tested with available and empty inventory cases. |
| Allocation 3 correction | **PASS** | Only Allocation 3’s resource JSON was changed; pre-correction SQLite backup was created and verified. |

There is no backend test directory and `frontend/package.json` has no `test` script. The direct allocator checks were not a maintained automated suite. A full automated regression suite and full current end-to-end workflow remain **NOT TESTED**.

## 10. Known Issues and Limitations

1. **Simulated data:** Road graph, coordinates, weather, traffic, historical risk, flood risk, and travel-time estimates are demo inputs. No confirmed live weather/traffic integration exists.
2. **Resource ledger:** Allocations 1, 2, and 4 have inventory discrepancies detailed in Section 6. Do not assume the allocation history is a reconciled stock ledger. Allocation 3’s breathing-apparatus inconsistency was fixed.
3. **Allocation limitations:** New runs cap reservations to inventory and decrement stored inventory, but no concurrency-safe reservation model or multi-team split exists. Existing allocation rows block further allocations for their incident, even if they need correction.
4. **Team management:** The frontend team form does not edit resource inventories. Auto-assignment does not include inventory or road status in suitability scoring.
5. **Dynamic route safety:** The Dynamic Routes page marks a chosen road blocked and recalculates but does not restore the original road status. Restoring a road must be deliberate.
6. **GIS precision:** Map edges are straight lines between hardcoded nodes, not real street polylines. OSM is used for the base tiles only.
7. **No production security:** No authentication/authorization is present; CORS permits all origins. Do not expose this development server to the public internet.
8. **Incident report details:** The “Additional Information” field is ignored by the backend schema. Severity reasons are not displayed correctly on the initial report card.
9. **Risk visualization:** Some frontend chart/color thresholds appear to expect a normalized 0–1 score, while the predictor emits additive point scores.
10. **Build size:** Previous Vite production build succeeded with a chunk-size warning for the ~820 KB minified JavaScript bundle.
11. **Seed behavior:** The seeder returns early if any team exists; it will not repair an incomplete or manually edited database.
12. **No maintained tests or repository metadata:** No test folder/script or Git repository was found at the project root.

## 11. Remaining Development Roadmap

1. **Reconcile historical allocations safely.** Agree on whether team `resources` means on-hand or remaining inventory. Review allocations 1, 2, and 4 against original stock records; back up SQLite before any correction.
2. **Add resource accounting tests and transactions.** Create automated backend tests for duplicate requests, unavailable items, insufficient quantities, concurrent allocation attempts, and database rollback.
3. **Improve team/resource management.** Add validated inventory editing to the team UI and clarify whether auto-assignment and resource allocation are separate or one coordinated operation.
4. **Complete incident analysis UX.** Return and display severity reasons after report submission; include or remove the unused Additional Information field.
5. **Make road testing safer.** Preserve prior road state and provide a clear restoration workflow for simulated closures.
6. **Improve map accuracy.** Replace straight graph segments with licensed/appropriate real road geometry if the project later gets a trusted GIS source; keep simulated routing labeled until then.
7. **Add automated coverage.** Establish backend API/database tests and a frontend test/build workflow; add a full scenario test using an isolated test database.
8. **Optional integrations.** If the project scope allows, add real weather/traffic providers with timestamps, provenance, failure handling, and clear separation from simulated data.
9. **Production readiness only if required.** Add authentication, authorization, stricter CORS, structured logging, deployment configuration, and operational safety review before any real-world use.

## 12. First Task for the Next Developer

Start with a **read-only resource ledger audit and isolated test design** before changing allocation data:

1. Read `backend/models.py`, `backend/services/resource_allocator.py`, and `backend/routers/resources.py`.
2. Read current `emergency_teams` and `resource_allocations` records from a copy or read-only SQLite connection.
3. Establish with the project owner whether `EmergencyTeam.resources` represents stock on hand, remaining stock, or a replenishable inventory snapshot.
4. Write tests using an isolated temporary database for valid, insufficient, absent, duplicate, and repeated allocation cases.
5. Only after agreement and backup, propose specific corrections to legacy rows; do not silently rewrite allocation history.

These files are the best starting point because the allocation code is now inventory-aware, but the existing database still has historical records that do not reconcile with current team inventory.

## 13. Important Safety Instructions

- Do not recreate the project, replace the architecture, or switch away from React/FastAPI/SQLite without explicit approval.
- Do not run destructive cleanup, reset the database, or delete existing incidents, assignments, roads, or allocation rows.
- Before any write to SQLite, create and verify a timestamped backup. The known backup is `backend/routerescue-pre-allocation3-fix-20261121-153607.db`.
- **That backup predates the Allocation 3 correction.** Restoring it wholesale would reintroduce the invalid `breathing_apparatus: 4` entry. Use it as a reference or restore to a separate file for investigation; do not replace the active database without a deliberate migration plan.
- Keep the working directory at `backend` when starting FastAPI, or SQLite may resolve `./routerescue.db` to a different file.
- For road-blocking tests, record the road’s current accessibility and other condition fields first, then restore and verify them afterward.
- Keep all simulated outputs clearly labeled; do not present them as validated emergency forecasts or operational dispatch guidance.
- Avoid exposing local database contents, private environment values, or development endpoints publicly.

## 14. Final Project Summary

RouteRescue is a **working academic prototype** with a React/Vite dashboard, FastAPI APIs, a SQLite database, incident intake and rule-based analysis, team assignment, inventory-aware allocation logic, weighted Dijkstra routing, dynamic recalculation, and Leaflet visualizations. The backend and frontend read endpoints were responding during this inspection, and historical build and workflow tests have passed.

It is **not a production emergency-response system**: road and prediction inputs are simulated; resource allocation history is not fully reconciled; there is no maintained automated test suite, authentication, or live dispatch/weather/traffic integration. A reasonable high-level estimate is **about 75% complete as an academic demonstration**, with remaining work concentrated on resource-ledger correctness, automated tests, safer route-condition workflows, and clearly bounded simulated-data behavior. This is an estimate, not a measured completion metric.
