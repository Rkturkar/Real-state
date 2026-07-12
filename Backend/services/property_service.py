"""
All business logic lives here.
Routes stay thin: they validate input and call these functions.
"""
from typing import Any, Dict, List, Optional

from Backend.database.json_db import JsonDatabase

# Single database instance — swap JsonDatabase for MySQLDatabase, etc.
db = JsonDatabase()


async def get_all_properties() -> List[Dict[str, Any]]:
    return await db.get_all()


async def get_property_by_id(property_id: int) -> Optional[Dict[str, Any]]:
    return await db.get_by_id(property_id)


async def search_properties(query: str) -> List[Dict[str, Any]]:
    """Case-insensitive search across title, city, and location."""
    q = query.strip().lower()
    if not q:
        return await db.get_all()
    all_props = await db.get_all()
    return [
        p for p in all_props
        if q in p.get("title", "").lower()
        or q in p.get("city", "").lower()
        or q in p.get("location", "").lower()
        or q in p.get("project_name", "").lower()
    ]


async def filter_properties(
    property_type: Optional[str] = None,
    price_range: Optional[str] = None,
    bedrooms: Optional[str] = None,
    city: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    price_range values: "below_50" | "50_to_1cr" | "above_1cr"
    bedrooms values: "1" | "2" | "3" | "4+"
    """
    props = await db.get_all()

    if property_type:
        props = [p for p in props if p["property_type"].lower() == property_type.lower()]

    if price_range:
        if price_range == "below_50":
            props = [p for p in props if p["price"] < 5_000_000]
        elif price_range == "50_to_1cr":
            props = [p for p in props if 5_000_000 <= p["price"] <= 10_000_000]
        elif price_range == "above_1cr":
            props = [p for p in props if p["price"] > 10_000_000]

    if bedrooms:
        if bedrooms == "4+":
            props = [p for p in props if p["bedrooms"] >= 4]
        else:
            try:
                bed_count = int(bedrooms)
                props = [p for p in props if p["bedrooms"] == bed_count]
            except ValueError:
                pass

    if city:
        props = [p for p in props if p["city"].lower() == city.lower()]

    return props


async def sort_properties(
    properties: List[Dict[str, Any]],
    sort_by: str = "created_at",
    order: str = "desc",
) -> List[Dict[str, Any]]:
    reverse = order.lower() == "desc"
    if sort_by == "price":
        return sorted(properties, key=lambda x: x["price"], reverse=reverse)
    # Default: newest first by created_at
    return sorted(properties, key=lambda x: x.get("created_at", ""), reverse=reverse)


async def create_property(data: Dict[str, Any]) -> Dict[str, Any]:
    return await db.create(data)


async def update_property(property_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # Strip None values so partial updates don't overwrite existing data
    clean = {k: v for k, v in data.items() if v is not None}
    return await db.update(property_id, clean)


async def delete_property(property_id: int) -> bool:
    return await db.delete(property_id)


async def get_cities() -> List[str]:
    """Return distinct city names for the city filter dropdown."""
    props = await db.get_all()
    return sorted({p["city"] for p in props})