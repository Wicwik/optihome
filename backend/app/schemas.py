from pydantic import BaseModel
from typing import Optional, List


class PropertyBase(BaseModel):
    external_id: str
    url: str
    title: str
    type: str
    price_eur: float
    area_m2: float
    rooms: int
    price_per_m2: float
    year_built: Optional[int] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class PropertyOut(PropertyBase):
    id: int

    class Config:
        from_attributes = True


class PropertiesResponse(BaseModel):
    items: List[PropertyOut]
    total: int


class ParetoItem(BaseModel):
    id: int
    price_eur: float
    price_per_m2: float
    rooms: int
    year_built: Optional[int] = None

class ParetoResponse(BaseModel):
    items: List[ParetoItem]



