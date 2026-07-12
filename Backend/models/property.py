"""Pydantic v2 models — single source of truth for all property shapes."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class Agent(BaseModel):
    name: str
    phone: str
    email: str


class PropertyBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    price: int = Field(..., gt=0, description="Price in INR (paise-free integer)")
    city: str
    location: str
    property_type: str = Field(..., pattern=r"^(Apartment|Villa|Independent House|Commercial)$")
    bedrooms: int = Field(..., ge=0)
    bathrooms: int = Field(..., ge=0)
    area: int = Field(..., gt=0, description="Carpet area in sq.ft.")
    amenities: List[str] = []
    images: List[str] = []
    builder: Optional[str] = None
    rera_number: Optional[str] = None
    possession: Optional[str] = None
    project_name: Optional[str] = None
    agent: Optional[Agent] = None
    is_featured: bool = False

    @field_validator("property_type")
    @classmethod
    def normalise_type(cls, v: str) -> str:
        return v.strip().title()


class PropertyCreate(PropertyBase):
    """Payload for POST /properties."""


class PropertyUpdate(BaseModel):
    """All fields optional — supports PATCH-style partial updates."""
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    city: Optional[str] = None
    location: Optional[str] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area: Optional[int] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None
    builder: Optional[str] = None
    rera_number: Optional[str] = None
    possession: Optional[str] = None
    project_name: Optional[str] = None
    agent: Optional[Agent] = None
    is_featured: Optional[bool] = None


class PropertyResponse(PropertyBase):
    """Response shape — adds server-assigned fields."""
    id: int
    created_at: str

    model_config = {"from_attributes": True}