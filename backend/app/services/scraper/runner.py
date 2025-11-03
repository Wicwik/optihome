from sqlalchemy.orm import Session
from typing import Iterable
from .fetch import fetch
from .parse import parse_listings, parse_detail_for_year
from ...models import Property


BASE_URL = "https://www.nehnutelnosti.sk/"


async def run_scrape(db: Session, kind: str = "flat", pages: int = 1) -> int:
    # kind: flat | house
    count = 0
    for page in range(1, pages + 1):
        list_url = _build_list_url(kind, page)
        html = await fetch(list_url)
        if not html:
            continue

        items = parse_listings(html)
        for item in items:
            # Optionally fetch detail page for year built
            year = None
            try:
                detail_html = await fetch(item["url"]) if item.get("url") else None
                if detail_html:
                    year = parse_detail_for_year(detail_html)
            except Exception:
                pass
            upsert_property(db, item, kind, year)
            count += 1
        db.commit()
    return count


def upsert_property(db: Session, item: dict, kind: str, year_built: int | None) -> None:
    ext_id = item["external_id"]
    prop = db.query(Property).filter(Property.external_id == ext_id).first()
    if not prop:
        prop = Property(external_id=ext_id)
        db.add(prop)
    prop.url = item.get("url") or prop.url
    prop.title = item.get("title") or prop.title
    prop.type = kind
    if item.get("price_eur") is not None:
        prop.price_eur = float(item["price_eur"]) or 0.0
    if item.get("area_m2") is not None:
        prop.area_m2 = float(item["area_m2"]) or 0.0
    if item.get("rooms") is not None:
        prop.rooms = int(item["rooms"]) or 0
    prop.price_per_m2 = (
        (prop.price_eur / prop.area_m2) if prop.area_m2 and prop.area_m2 > 0 else 0.0
    )
    if year_built:
        prop.year_built = year_built


def _build_list_url(kind: str, page: int) -> str:
    # Page 1 redirects to base URL, so skip the page parameter
    if page == 1:
        if kind == "house":
            return f"{BASE_URL}vysledky/domy"
        return f"{BASE_URL}vysledky/byty"
    if kind == "house":
        return f"{BASE_URL}vysledky/domy?page={page}"
    return f"{BASE_URL}vysledky/byty?page={page}"


