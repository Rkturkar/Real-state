"""
Abstract base class for the database layer.
To swap JSON with MySQL or MongoDB, create a new class that inherits from
BaseDatabase and implement every abstract method. No other file needs to change.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseDatabase(ABC):

    @abstractmethod
    async def get_all(self) -> List[Dict[str, Any]]:
        """Return every property record."""

    @abstractmethod
    async def get_by_id(self, property_id: int) -> Optional[Dict[str, Any]]:
        """Return a single property or None."""

    @abstractmethod
    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Persist a new property and return it with the assigned id."""

    @abstractmethod
    async def update(self, property_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing property and return the updated record, or None."""

    @abstractmethod
    async def delete(self, property_id: int) -> bool:
        """Delete a property. Return True on success, False if not found."""