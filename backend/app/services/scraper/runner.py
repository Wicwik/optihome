from sqlalchemy.orm import Session
from typing import Iterable
from .fetch import fetch
from .parse import parse_listings, parse_detail_for_year, parse_detail_for_title
from ...models import Property
from ...services.geocode import geocode_with_cache
from ...schemas import PropertyCreate


BASE_URL = "https://www.nehnutelnosti.sk/"


async def run_scrape(db: Session, kind: str = "flat", pages: int = 1) -> int:
    # kind: flat | house
    count = 0
    seen_external_ids = set()  # Track which properties we've seen in this scrape
    
    for page in range(1, pages + 1):
        list_url = _build_list_url(kind, page)
        html = await fetch(list_url)
        if not html:
            continue

        items = parse_listings(html)
        for item in items:
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
            except Exception:
                pass
            upsert_property(db, item, kind, year)
            count += 1
        db.commit()
    
    # Mark properties of this type that weren't seen as inactive (soft-delete)
    if seen_external_ids:
        db.query(Property).filter(
            Property.type == kind,
            Property.external_id.notin_(seen_external_ids)
        ).update({"is_active": False}, synchronize_session=False)
        db.commit()
    
    return count


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


