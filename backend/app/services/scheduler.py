import os
import asyncio
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..services.scraper.runner import run_scrape

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    AsyncIOScheduler = None
    CronTrigger = None


scheduler = AsyncIOScheduler() if APSCHEDULER_AVAILABLE else None


async def scheduled_scrape_job():
    """Scheduled job to scrape properties."""
    db: Session = SessionLocal()
    try:
        # Scrape flats and houses
        for kind in ["flat", "house"]:
            pages = int(os.getenv("SCRAPE_PAGES_PER_RUN", "5"))
            try:
                await run_scrape(db, kind=kind, pages=pages)
            except Exception as e:
                print(f"Error scraping {kind}: {e}")
    except Exception as e:
        print(f"Error in scheduled scrape: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the scheduler if enabled."""
    if not APSCHEDULER_AVAILABLE:
        print("APScheduler not available. Install with: pip install apscheduler")
        return
    
    if os.getenv("ENABLE_SCHEDULER", "false").lower() == "true":
        # Default: run daily at 2 AM
        cron_hour = int(os.getenv("SCHEDULE_HOUR", "2"))
        cron_minute = int(os.getenv("SCHEDULE_MINUTE", "0"))
        
        scheduler.add_job(
            scheduled_scrape_job,
            trigger=CronTrigger(hour=cron_hour, minute=cron_minute),
            id="scrape_job",
            replace_existing=True,
        )
        scheduler.start()
        print(f"Scheduler started: scraping daily at {cron_hour:02d}:{cron_minute:02d}")


def stop_scheduler():
    """Stop the scheduler."""
    if scheduler and scheduler.running:
        scheduler.shutdown()

