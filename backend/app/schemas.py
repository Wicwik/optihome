from uuid import UUID
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List


class PropertyCreate(BaseModel):
    """Pydantic model for creating/updating property data."""
    external_id: str
    url: Optional[str] = None
    title: Optional[str] = None
    type: str
    price_eur: Optional[float] = Field(default=0.0, ge=0)
    area_m2: Optional[float] = Field(default=0.0, ge=0)
    rooms: Optional[int] = Field(default=0, ge=0)
    price_per_m2: Optional[float] = Field(default=None, ge=0)
    year_built: Optional[int] = Field(default=None, ge=1800, le=2100)
    address: Optional[str] = None
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)

    @model_validator(mode='after')
    def calculate_price_per_m2(self):
        """Calculate price_per_m2 if not provided but price and area are available."""
        if (self.price_per_m2 is None or self.price_per_m2 == 0) and self.area_m2 and self.area_m2 > 0:
            self.price_per_m2 = self.price_eur / self.area_m2
        elif self.price_per_m2 is None:
            self.price_per_m2 = 0.0
        return self

    def model_dump_for_db(self) -> dict:
        """Return a dict with all fields set (no None values for required fields)."""
        data = self.model_dump(exclude_none=False)
        # Ensure required fields have defaults (handle None explicitly)
        if data.get('price_eur') is None:
            data['price_eur'] = 0.0
        if data.get('area_m2') is None:
            data['area_m2'] = 0.0
        if data.get('rooms') is None:
            data['rooms'] = 0
        if data.get('price_per_m2') is None:
            data['price_per_m2'] = 0.0
        # Generate URL if missing
        if not data.get('url'):
            data['url'] = f"https://www.nehnutelnosti.sk/detail/{data['external_id']}"
        # Set default title if missing
        if not data.get('title'):
            data['title'] = "Property listing"
        return data


class PropertyBase(BaseModel):
    external_id: str
    url: Optional[str] = None
    title: Optional[str] = None
    type: str
    price_eur: float
    area_m2: float
    rooms: Optional[int] = None
    price_per_m2: float
    year_built: Optional[int] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_active: bool = True


class PropertyOut(PropertyBase):
    id: int
    uuid: UUID | None = None

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



