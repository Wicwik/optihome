from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .routers.properties import router as properties_router
from .routers.scrape import router as scrape_router
from .services.scheduler import start_scheduler, stop_scheduler


def create_app() -> FastAPI:
    app = FastAPI(title="OptiHome API", version="0.1.0")

    origins = []
    import os

    cors_origins = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup() -> None:
        init_db()
        start_scheduler()

    @app.on_event("shutdown")
    def on_shutdown() -> None:
        stop_scheduler()

    app.include_router(properties_router, prefix="/properties", tags=["properties"])
    app.include_router(scrape_router, prefix="/scrape", tags=["scrape"])
    return app


app = create_app()



