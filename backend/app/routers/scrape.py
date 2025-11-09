from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from ..db import get_db
from ..services.scraper.runner import run_scrape
from ..services.scraping_status import scraping_state
from ..services.scheduler import scheduler, APSCHEDULER_AVAILABLE, enable_scheduler, disable_scheduler, is_scheduler_enabled


router = APIRouter()


@router.post("/run")
async def trigger_scrape(
    kind: str = Query("flat", pattern="^(flat|house)$"),
    pages: int = Query(1, ge=1, le=50),
    db: Session = Depends(get_db),
):
    count = await run_scrape(db, kind=kind, pages=pages)
    return {"status": "ok", "inserted_or_updated": count}


@router.get("/status")
async def get_scraping_status():
    """Get current scraping status and progress."""
    async with scraping_state.lock:
        next_run_time = None
        if APSCHEDULER_AVAILABLE and scheduler and scheduler.running:
            job = scheduler.get_job("scrape_job")
            if job and job.next_run_time:
                next_run_time = job.next_run_time.isoformat()
        
        return {
            "status": scraping_state.status.value,
            "current_kind": scraping_state.current_kind,
            "current_page": scraping_state.current_page,
            "total_pages": scraping_state.total_pages,
            "items_processed": scraping_state.items_processed,
            "items_total": scraping_state.items_total,
            "progress_percentage": scraping_state.get_progress_percentage(),
            "start_time": scraping_state.start_time.isoformat() if scraping_state.start_time else None,
            "end_time": scraping_state.end_time.isoformat() if scraping_state.end_time else None,
            "error_message": scraping_state.error_message,
            "next_scheduled_run": next_run_time,
            "scheduler_enabled": is_scheduler_enabled(),
        }


@router.get("/logs")
async def get_scraping_logs(limit: int = Query(100, ge=1, le=1000)):
    """Get scraping logs."""
    async with scraping_state.lock:
        # Return last N logs
        logs = scraping_state.logs[-limit:] if len(scraping_state.logs) > limit else scraping_state.logs
        return {"logs": logs, "total": len(scraping_state.logs)}


@router.post("/scheduler/enable")
async def enable_scheduled_scraping(
    hour: int = Query(2, ge=0, le=23),
    minute: int = Query(0, ge=0, le=59),
):
    """Enable scheduled scraping."""
    result = enable_scheduler(hour=hour, minute=minute)
    return result


@router.post("/scheduler/disable")
async def disable_scheduled_scraping():
    """Disable scheduled scraping."""
    result = disable_scheduler()
    return result


