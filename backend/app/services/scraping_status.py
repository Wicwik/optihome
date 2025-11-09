from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import asyncio


class ScrapingStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"


class ScrapingState:
    """In-memory state for tracking scraping progress."""
    
    def __init__(self):
        self.status: ScrapingStatus = ScrapingStatus.IDLE
        self.current_kind: Optional[str] = None
        self.current_page: int = 0
        self.total_pages: int = 0
        self.items_processed: int = 0
        self.items_total: int = 0
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.error_message: Optional[str] = None
        self.logs: List[Dict[str, Any]] = []
        self.lock = asyncio.Lock()
    
    def add_log(self, level: str, message: str, timestamp: Optional[datetime] = None):
        """Add a log entry."""
        if timestamp is None:
            timestamp = datetime.now()
        log_entry = {
            "timestamp": timestamp.isoformat(),
            "level": level,
            "message": message
        }
        self.logs.append(log_entry)
        # Keep only last 1000 logs
        if len(self.logs) > 1000:
            self.logs = self.logs[-1000:]
    
    def reset(self):
        """Reset state for a new scraping run."""
        self.status = ScrapingStatus.IDLE
        self.current_kind = None
        self.current_page = 0
        self.total_pages = 0
        self.items_processed = 0
        self.items_total = 0
        self.start_time = None
        self.end_time = None
        self.error_message = None
    
    def get_progress_percentage(self) -> float:
        """Calculate progress percentage."""
        if self.total_pages == 0:
            return 0.0
        return (self.current_page / self.total_pages) * 100.0


# Global state instance
scraping_state = ScrapingState()

