from sqlalchemy.orm import Session
from typing import Iterable
from datetime import datetime
from .fetch import fetch
from .parse import parse_listings, parse_detail_for_year, parse_detail_for_title
from ...models import Property
from ...services.geocode import geocode_with_cache
from ...services.scraping_status import scraping_state, ScrapingStatus
from ...schemas import PropertyCreate


BASE_URL = "https://www.nehnutelnosti.sk/"


async def run_scrape(db: Session, kind: str = "flat", pages: int = 1) -> int:
    # kind: flat | house
    async with scraping_state.lock:
        scraping_state.status = ScrapingStatus.RUNNING
        scraping_state.current_kind = kind
        scraping_state.current_page = 0
        scraping_state.total_pages = pages
        scraping_state.items_processed = 0
        scraping_state.items_total = 0
        scraping_state.start_time = datetime.now()
        scraping_state.end_time = None
        scraping_state.error_message = None
        scraping_state.add_log("info", f"Starting scrape: {kind}, {pages} page(s)")
    
    count = 0
    seen_external_ids = set()  # Track which properties we've seen in this scrape
    
    try:
        for page in range(1, pages + 1):
            async with scraping_state.lock:
                scraping_state.current_page = page
                scraping_state.add_log("info", f"Processing page {page}/{pages} for {kind}")
            
            list_url = _build_list_url(kind, page)
            html = await fetch(list_url)
            if not html:
                async with scraping_state.lock:
                    scraping_state.add_log("warning", f"Failed to fetch page {page}")
                continue

            items = parse_listings(html)
            async with scraping_state.lock:
                scraping_state.items_total = len(items)
                scraping_state.add_log("info", f"Found {len(items)} items on page {page}")
            
            for idx, item in enumerate(items):
                # Skip items without external_id (required)
                if not item.get("external_id"):
                    continue
                # Track that we've seen this property
                seen_external_ids.add(item["external_id"])
                # Fetch detail page for year built and title (if missing)
                year = None
                title = item.get("title", "").strip()
                try:
                    detail_html = await fetch(item["url"]) if item.get("url") else None
                    if detail_html:
                        year = parse_detail_for_year(detail_html)
                        # If title is missing from listing, try to get it from detail page
                        if not title:
                            detail_title = parse_detail_for_title(detail_html)
                            if detail_title:
                                title = detail_title
                                item["title"] = title
                except Exception as e:
                    async with scraping_state.lock:
                        scraping_state.add_log("warning", f"Error fetching detail for {item.get('external_id')}: {str(e)}")
                
                upsert_property(db, item, kind, year)
                count += 1
                async with scraping_state.lock:
                    scraping_state.items_processed = count
                    if idx % 10 == 0 or idx == len(items) - 1:  # Log every 10th item or last item
                        scraping_state.add_log("debug", f"Processed {count} properties so far")
            db.commit()
        
        # Mark properties of this type that weren't seen as inactive (soft-delete)
        if seen_external_ids:
            async with scraping_state.lock:
                scraping_state.add_log("info", f"Marking unseen properties as inactive")
            db.query(Property).filter(
                Property.type == kind,
                Property.external_id.notin_(seen_external_ids)
            ).update({"is_active": False}, synchronize_session=False)
            db.commit()
        
        async with scraping_state.lock:
            scraping_state.status = ScrapingStatus.COMPLETED
            scraping_state.end_time = datetime.now()
            scraping_state.add_log("info", f"Scrape completed: {count} properties processed")
        
        return count
    except Exception as e:
        async with scraping_state.lock:
            scraping_state.status = ScrapingStatus.ERROR
            scraping_state.end_time = datetime.now()
            scraping_state.error_message = str(e)
            scraping_state.add_log("error", f"Scrape failed: {str(e)}")
        raise


def upsert_property(db: Session, item: dict, kind: str, year_built: int | None) -> None:
    """Upsert property using Pydantic model for data validation."""
    ext_id = item.get("external_id")
    if not ext_id:
        return
    
    # Prepare data for Pydantic model
    property_data = {
        "external_id": ext_id,
        "url": item.get("url"),
        "title": item.get("title"),
        "type": kind,
        "price_eur": item.get("price_eur"),
        "area_m2": item.get("area_m2"),
        "rooms": item.get("rooms"),
        "price_per_m2": item.get("price_per_m2"),
        "year_built": year_built,
        "address": item.get("location"),
        "lat": item.get("lat"),
        "lng": item.get("lng"),
    }
    
    # Validate and normalize data using Pydantic
    try:
        prop_create = PropertyCreate(**property_data)
        db_data = prop_create.model_dump_for_db()
    except Exception as e:
        # If validation fails, use minimal safe defaults
        db_data = {
            "external_id": ext_id,
            "type": kind,
            "price_eur": 0.0,
            "area_m2": 0.0,
            "rooms": 0,
            "price_per_m2": 0.0,
            "url": f"https://www.nehnutelnosti.sk/detail/{ext_id}",
            "title": "Property listing",
        }
    
    # Use get_or_create pattern to handle concurrent inserts
    prop = db.query(Property).filter(Property.external_id == ext_id).first()
    if not prop:
        try:
            # Create new property with validated data
            prop = Property(**db_data)
            db.add(prop)
            db.flush()  # Flush to get the ID, but don't commit yet
        except Exception:
            # If duplicate external_id (race condition), fetch existing
            db.rollback()
            prop = db.query(Property).filter(Property.external_id == ext_id).first()
            if not prop:
                raise
    
    # Ensure UUID is set for existing properties that might not have it
    if prop.uuid is None:
        from uuid import uuid4
        prop.uuid = uuid4()
    
    # Mark property as active since we just saw it in the listing
    prop.is_active = True
    
    # Update all fields from validated data
    for key, value in db_data.items():
        if key != "external_id":  # Don't update external_id
            setattr(prop, key, value)
    
    # Geocode address if lat/lng are missing
    if prop.address and (prop.lat is None or prop.lng is None):
        try:
            coords = geocode_with_cache(db, prop.address)
            if coords:
                prop.lat, prop.lng = coords
        except Exception:
            # Silently fail geocoding - not critical
            pass


def _build_list_url(kind: str, page: int) -> str:
    # Page 1 redirects to base URL, so skip the page parameter
    if page == 1:
        if kind == "house":
            return f"{BASE_URL}vysledky/domy/predaj"
        return f"{BASE_URL}vysledky/byty/predaj"
    if kind == "house":
        return f"{BASE_URL}vysledky/domy/predaj?page={page}"
    return f"{BASE_URL}vysledky/byty/predaj?page={page}"


