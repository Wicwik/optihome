from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .routers.properties import router as properties_router
from .routers.scrape import router as scrape_router


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

    app.include_router(properties_router, prefix="/properties", tags=["properties"])
    app.include_router(scrape_router, prefix="/scrape", tags=["scrape"])
    return app


app = create_app()



