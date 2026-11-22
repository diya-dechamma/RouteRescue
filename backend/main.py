from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from data.sample_data import seed_database as seed_sample_data
from database import SessionLocal

from routers import incidents, teams, roads, routes_router, resources, assignments


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    db = SessionLocal()
    try:
        seed_sample_data(db)
    finally:
        db.close()
    yield
    # Shutdown (nothing needed)


app = FastAPI(
    title="RouteRescue API",
    description="AI-powered emergency response coordination system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
app.include_router(teams.router, prefix="/teams", tags=["teams"])
app.include_router(roads.router, prefix="/roads", tags=["roads"])
app.include_router(routes_router.router, prefix="/routes", tags=["routes"])
app.include_router(resources.router, prefix="/resources", tags=["resources"])
app.include_router(assignments.router, prefix="/assignments", tags=["assignments"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "RouteRescue API"}
