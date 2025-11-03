from typing import Optional, Tuple
from sqlalchemy.orm import Session
from geopy.geocoders import Nominatim
from ..models import GeocodeCache


_geocoder = Nominatim(user_agent="OptiHome/0.1")


def geocode_with_cache(db: Session, query: str) -> Optional[Tuple[float, float]]:
    cached = db.query(GeocodeCache).filter(GeocodeCache.query == query).first()
    if cached:
        return (cached.lat, cached.lng)
    try:
        loc = _geocoder.geocode(query, addressdetails=False, timeout=10)
        if loc:
            rec = GeocodeCache(query=query, lat=loc.latitude, lng=loc.longitude)
            db.add(rec)
            db.commit()
            return (loc.latitude, loc.longitude)
    except Exception:
        return None
    return None



