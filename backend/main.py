from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import activity, auth, content, dashboard, roles, system, tokens, users
from app.routes.tokens import user_tokens_router
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_if_empty()
    yield


app = FastAPI(
    title="AI VFX Admin Dashboard API",
    description="Backend API for the AI VFX Admin Dashboard — connected to shared PostgreSQL on Google Cloud SQL",
    version="2.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(users.router)
app.include_router(tokens.router)
app.include_router(user_tokens_router)
app.include_router(activity.router)
app.include_router(content.router)
app.include_router(system.router)
app.include_router(roles.router)


@app.get("/health")
def health():
    return {"status": "ok", "database": "postgresql"}
