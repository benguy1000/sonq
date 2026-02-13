import time
from typing import Optional, Dict, Any

CACHE_TTL = 86400  # 24 hours

_cache: Dict[str, Dict[str, Any]] = {}


def get_cached(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and time.time() - entry["timestamp"] < CACHE_TTL:
        return entry["data"]
    if entry:
        del _cache[key]
    return None


def set_cached(key: str, data: Any) -> None:
    _cache[key] = {"data": data, "timestamp": time.time()}
