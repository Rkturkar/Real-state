"""
Property routes.
IMPORTANT: fixed-path routes (/search, /filter, /sort, /cities) must be declared
BEFORE the parameterised route (/{property_id}) so FastAPI matches them correctly.
"""
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from Backend.models.property import PropertyCreate, PropertyResponse, PropertyUpdate
from Backend.services import property_service 

router = APIRouter(prefix="/properties", tags=["Properties"])


# ── fixed-path routes ──────────────────────────────────────────────────────────

@router.get("/search", response_model=List[PropertyResponse], summary="Search properties")
async def search(q: str = Query(..., min_length=1, description="Search term")):
    results = await property_service.search_properties(q)
    return results


@router.get("/filter", response_model=List[PropertyResponse], summary="Filter properties")
async def filter_props(
    property_type: Optional[str] = Query(None, description="Apartment | Villa | Independent House | Commercial"),
    price_range: Optional[str] = Query(None, description="below_50 | 50_to_1cr | above_1cr"),
    bedrooms: Optional[str] = Query(None, description="1 | 2 | 3 | 4+"),
    city: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at", description="price | created_at"),
    order: Optional[str] = Query("desc", description="asc | desc"),
):
    results = await property_service.filter_properties(property_type, price_range, bedrooms, city)
    return await property_service.sort_properties(results, sort_by or "created_at", order or "desc")


@router.get("/sort", response_model=List[PropertyResponse], summary="Sort all properties")
async def sort_all(
    sort_by: str = Query("created_at", description="price | created_at"),
    order: str = Query("desc", description="asc | desc"),
):
    all_props = await property_service.get_all_properties()
    return await property_service.sort_properties(all_props, sort_by, order)


@router.get("/cities", response_model=List[str], summary="Available city names")
async def get_cities():
    return await property_service.get_cities()


# ── collection route ───────────────────────────────────────────────────────────

@router.get("", response_model=List[PropertyResponse], summary="List all properties")
async def list_properties(
    sort_by: Optional[str] = Query("created_at"),
    order: Optional[str] = Query("desc"),
):
    props = await property_service.get_all_properties()
    return await property_service.sort_properties(props, sort_by or "created_at", order or "desc")


@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED, summary="Create a property")
async def create_property(payload: PropertyCreate):
    return await property_service.create_property(payload.model_dump())


# ── parameterised routes ───────────────────────────────────────────────────────

@router.get("/{property_id}", response_model=PropertyResponse, summary="Get property by ID")
async def get_property(property_id: int):
    prop = await property_service.get_property_by_id(property_id)
    if not prop:
        raise HTTPException(status_code=404, detail=f"Property {property_id} not found")
    return prop


@router.put("/{property_id}", response_model=PropertyResponse, summary="Update a property")
async def update_property(property_id: int, payload: PropertyUpdate):
    updated = await property_service.update_property(property_id, payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail=f"Property {property_id} not found")
    return updated


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a property")
async def delete_property(property_id: int):
    deleted = await property_service.delete_property(property_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Property {property_id} not found")
    
    