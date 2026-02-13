import os
import re
import asyncio
import logging
import httpx
import base64
import time
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

# Module-level token cache
_token: Optional[str] = None
_token_expires: float = 0


async def get_access_token() -> str:
    """Get Spotify access token using Client Credentials flow."""
    global _token, _token_expires

    if _token and time.time() < _token_expires - 60:
        return _token

    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise ValueError("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set")

    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            "https://accounts.spotify.com/api/token",
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
        )
        resp.raise_for_status()
        data = resp.json()
        _token = data["access_token"]
        _token_expires = time.time() + data.get("expires_in", 3600)
        return _token


async def get_preview_from_embed(track_id: str) -> Optional[str]:
    """Fetch preview URL from Spotify's embed page (fallback when API returns None)."""
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            resp = await client.get(
                f"https://open.spotify.com/embed/track/{track_id}",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            )
            if resp.status_code == 200:
                match = re.search(r'"audioPreview":\{"url":"([^"]+)"', resp.text)
                if match:
                    logger.info(f"Got embed preview for {track_id}")
                    return match.group(1)
                else:
                    logger.warning(f"No audioPreview in embed page for {track_id}")
            else:
                logger.warning(f"Embed page returned {resp.status_code} for {track_id}")
    except Exception as e:
        logger.warning(f"Embed preview fetch failed for {track_id}: {e}")
    return None


async def search_track(
    title: str, artist: str, token: str, semaphore: asyncio.Semaphore
) -> Optional[Dict[str, Any]]:
    """Search for a single track on Spotify with retry logic."""
    query = f"track:{title} artist:{artist}"

    async with semaphore:
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(
                        "https://api.spotify.com/v1/search",
                        headers={"Authorization": f"Bearer {token}"},
                        params={"q": query, "type": "track", "limit": 1, "market": "US"},
                    )

                    if resp.status_code == 429:
                        retry_after = int(resp.headers.get("Retry-After", 1))
                        logger.warning(f"Rate limited, waiting {retry_after}s")
                        await asyncio.sleep(retry_after * (2 ** attempt))
                        continue

                    resp.raise_for_status()
                    data = resp.json()

                    tracks = data.get("tracks", {}).get("items", [])
                    if not tracks:
                        return None

                    track = tracks[0]
                    track_id = track["id"]

                    # Try API preview URL first, fall back to embed page
                    preview_url = track.get("preview_url")
                    if not preview_url:
                        preview_url = await get_preview_from_embed(track_id)

                    if not preview_url:
                        return None

                    album_images = track.get("album", {}).get("images", [])
                    album_art = album_images[0]["url"] if album_images else ""

                    return {
                        "title": track["name"],
                        "artist": ", ".join(a["name"] for a in track.get("artists", [])),
                        "album_art": album_art,
                        "preview_url": preview_url,
                        "spotify_id": track_id,
                    }

            except httpx.TimeoutException:
                logger.warning(f"Timeout searching for {title} by {artist}, attempt {attempt + 1}")
                if attempt < 2:
                    await asyncio.sleep(0.5 * (2 ** attempt))
            except Exception as e:
                logger.error(f"Error searching for {title} by {artist}: {e}")
                return None

    return None


async def validate_songs(
    suggestions: List[Dict[str, str]], target_count: int
) -> List[Dict[str, Any]]:
    """Validate songs against Spotify in parallel, return those with preview URLs."""
    token = await get_access_token()
    semaphore = asyncio.Semaphore(10)  # Limit concurrent requests

    tasks = [
        search_track(s["title"], s["artist"], token, semaphore)
        for s in suggestions
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    valid_songs = []
    for result in results:
        if isinstance(result, dict):
            valid_songs.append(result)
            if len(valid_songs) >= target_count:
                break

    return valid_songs
