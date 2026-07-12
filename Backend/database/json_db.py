"""
JSON file-backed database implementation.
All reads/writes go through this single module, keeping I/O contained.
"""
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from Backend.database.base import BaseDatabase

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "properties.json")


class JsonDatabase(BaseDatabase):
    """Thread-safe-enough for a demo/single-worker server.
    For multi-worker production use, replace with a real DB via BaseDatabase."""

    def _read(self) -> List[Dict[str, Any]]:
        with open(DATA_FILE, "r", encoding="utf-8") as fh:
            return json.load(fh)

    def _write(self, data: List[Dict[str, Any]]) -> None:
        with open(DATA_FILE, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False, default=str)

    async def get_all(self) -> List[Dict[str, Any]]:
        return self._read()

    async def get_by_id(self, property_id: int) -> Optional[Dict[str, Any]]:
        return next((p for p in self._read() if p["id"] == property_id), None)

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        records = self._read()
        new_id = max((p["id"] for p in records), default=0) + 1
        record = {**data, "id": new_id, "created_at": datetime.now(timezone.utc).isoformat()}
        records.append(record)
        self._write(records)
        return record

    async def update(self, property_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        records = self._read()
        for idx, prop in enumerate(records):
            if prop["id"] == property_id:
                records[idx] = {**prop, **data, "id": property_id}
                self._write(records)
                return records[idx]
        return None

    async def delete(self, property_id: int) -> bool:
        records = self._read()
        updated = [p for p in records if p["id"] != property_id]
        if len(updated) == len(records):
            return False
        self._write(updated)
        return True