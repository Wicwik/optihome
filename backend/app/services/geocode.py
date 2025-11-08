from typing import Optional, Tuple
from sqlalchemy.orm import Session
from geopy.geocoders import Nominatim
from ..models import GeocodeCache


_geocoder = Nominatim(user_agent="OptiHome/0.1")


def geocode_with_cache(db: Session, query: str) -> Optional[Tuple[float, float]]:
    # Check cache first
    cached = db.query(GeocodeCache).filter(GeocodeCache.query == query).first()
    if cached:
        return (cached.lat, cached.lng)
    
    # Try to geocode
    try:
        loc = _geocoder.geocode(query, addressdetails=False, timeout=10)
        if loc:
            # Check again in case it was added by another process
            cached = db.query(GeocodeCache).filter(GeocodeCache.query == query).first()
            if cached:
                return (cached.lat, cached.lng)
            
            # Add to cache (UUID will be auto-generated)
            try:
                rec = GeocodeCache(query=query, lat=loc.latitude, lng=loc.longitude)
                db.add(rec)
                # Don't commit here - let caller handle commits
            except Exception:
                # If duplicate key error, just return the coordinates without caching
                # This can happen in concurrent scenarios
                pass
            return (loc.latitude, loc.longitude)
    except Exception:
        return None
    return None



