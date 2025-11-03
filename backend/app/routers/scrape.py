from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..services.scraper.runner import run_scrape


router = APIRouter()


@router.post("/run")
async def trigger_scrape(
    kind: str = Query("flat", pattern="^(flat|house)$"),
    pages: int = Query(1, ge=1, le=50),
    db: Session = Depends(get_db),
):
    count = await run_scrape(db, kind=kind, pages=pages)
    return {"status": "ok", "inserted_or_updated": count}


