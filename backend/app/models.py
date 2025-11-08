from uuid import UUID as UUIDType, uuid4
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uuid: Mapped[UUIDType | None] = mapped_column(UUID(as_uuid=True), unique=True, index=True, nullable=True, default=uuid4)
    external_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    type: Mapped[str | None] = mapped_column(String(16), index=True, nullable=True)  # flat | house
    price_eur: Mapped[float | None] = mapped_column(Float, index=True, nullable=True)
    area_m2: Mapped[float | None] = mapped_column(Float, nullable=True)
    rooms: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    price_per_m2: Mapped[float | None] = mapped_column(Float, index=True, nullable=True)
    year_built: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class GeocodeCache(Base):
    __tablename__ = "geocode_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[UUIDType | None] = mapped_column(UUID(as_uuid=True), unique=True, index=True, nullable=True, default=uuid4)
    query: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)



