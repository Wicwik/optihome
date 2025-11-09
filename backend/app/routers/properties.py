from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from ..db import get_db
from ..models import Property
from ..schemas import PropertiesResponse, PropertyOut, ParetoResponse, ParetoItem
from ..services.pareto import skyline
from ..services.geocode import geocode_with_cache


router = APIRouter()


@router.get("", response_model=PropertiesResponse)
def list_properties(
    db: Session = Depends(get_db),
    type: Optional[str] = Query(None, pattern="^(flat|house)$"),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rooms: Optional[int] = None,
    max_rooms: Optional[int] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    location: Optional[str] = Query(None, description="Filter by location (case-insensitive substring match on address)"),
    bbox: Optional[str] = Query(
        None, description="minLng,minLat,maxLng,maxLat"
    ),
    onlyPareto: bool = False,
    include_inactive: bool = False,
    offset: int = 0,
    limit: int = 100,
):
    q = select(Property)
    # Filter by active status unless explicitly including inactive
    if not include_inactive:
        q = q.where(Property.is_active == True)
    if type:
        q = q.where(Property.type == type)
    if min_price is not None:
        q = q.where(Property.price_eur >= min_price)
    if max_price is not None:
        q = q.where(Property.price_eur <= max_price)
    if min_rooms is not None:
        q = q.where(Property.rooms >= min_rooms)
    if max_rooms is not None:
        q = q.where(Property.rooms <= max_rooms)
    if min_area is not None:
        q = q.where(Property.area_m2 >= min_area)
    if max_area is not None:
        q = q.where(Property.area_m2 <= max_area)
    if min_year is not None:
        q = q.where(Property.year_built >= min_year)
    if max_year is not None:
        q = q.where(Property.year_built <= max_year)
    if location:
        q = q.where(Property.address.ilike(f"%{location}%"))
    if bbox:
        try:
            min_lng, min_lat, max_lng, max_lat = map(float, bbox.split(","))
            q = q.where(
                Property.lat >= min_lat,
                Property.lat <= max_lat,
                Property.lng >= min_lng,
                Property.lng <= max_lng,
            )
        except Exception:
            pass

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()

    if onlyPareto:
        rows = db.execute(q).scalars().all()
        recs = [
            (r.id, r.price_eur, r.price_per_m2, r.rooms, r.year_built)
            for r in rows
        ]
        ids = set(skyline(recs))
        rows = [r for r in rows if r.id in ids]
        items: List[PropertyOut] = [PropertyOut.model_validate(r) for r in rows]
        return PropertiesResponse(items=items, total=len(items))

    q = q.offset(offset).limit(limit)
    rows = db.execute(q).scalars().all()
    items: List[PropertyOut] = [PropertyOut.model_validate(r) for r in rows]
    return PropertiesResponse(items=items, total=total)


@router.get("/pareto", response_model=ParetoResponse)
def pareto(
    db: Session = Depends(get_db),
    type: Optional[str] = Query(None, pattern="^(flat|house)$"),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rooms: Optional[int] = None,
    max_rooms: Optional[int] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    location: Optional[str] = Query(None, description="Filter by location (case-insensitive substring match on address)"),
    bbox: Optional[str] = None,
    include_inactive: bool = False,
):
    q = select(Property)
    # Filter by active status unless explicitly including inactive
    if not include_inactive:
        q = q.where(Property.is_active == True)
    if type:
        q = q.where(Property.type == type)
    if min_price is not None:
        q = q.where(Property.price_eur >= min_price)
    if max_price is not None:
        q = q.where(Property.price_eur <= max_price)
    if min_rooms is not None:
        q = q.where(Property.rooms >= min_rooms)
    if max_rooms is not None:
        q = q.where(Property.rooms <= max_rooms)
    if min_area is not None:
        q = q.where(Property.area_m2 >= min_area)
    if max_area is not None:
        q = q.where(Property.area_m2 <= max_area)
    if min_year is not None:
        q = q.where(Property.year_built >= min_year)
    if max_year is not None:
        q = q.where(Property.year_built <= max_year)
    if location:
        q = q.where(Property.address.ilike(f"%{location}%"))
    if bbox:
        try:
            min_lng, min_lat, max_lng, max_lat = map(float, bbox.split(","))
            q = q.where(
                Property.lat >= min_lat,
                Property.lat <= max_lat,
                Property.lng >= min_lng,
                Property.lng <= max_lng,
            )
        except Exception:
            pass

    rows = db.execute(q).scalars().all()
    recs = [(r.id, r.price_eur, r.price_per_m2, r.rooms, r.year_built) for r in rows]
    ids = set(skyline(recs))
    out = [
        ParetoItem(
            id=r.id,
            price_eur=r.price_eur,
            price_per_m2=r.price_per_m2,
            rooms=r.rooms,
            year_built=r.year_built,
        )
        for r in rows
        if r.id in ids
    ]
    return ParetoResponse(items=out)


@router.get("/geocode")
def geocode_location(
    query: str = Query(..., description="Location string to geocode"),
    db: Session = Depends(get_db),
):
    """Geocode a location string to coordinates."""
    coords = geocode_with_cache(db, query)
    if not coords:
        raise HTTPException(status_code=404, detail="Location not found")
    db.commit()  # Commit any cache entries
    return {"lat": coords[0], "lng": coords[1]}


@router.get("/{property_id}", response_model=PropertyOut)
def get_property(property_id: int, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return PropertyOut.model_validate(prop)



