import uuid
import logging
import hashlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from models.schemas import QuizRequest, QuizResponse, SongResult, ErrorResponse
from services.llm_service import generate_song_list
from services.spotify_service import validate_songs
from services.cache_service import get_cached, set_cached

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Music Quiz API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/generate-quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    cache_key = hashlib.md5(f"{request.prompt}:{request.songCount}".encode()).hexdigest()

    # Check cache
    cached = get_cached(cache_key)
    if cached:
        logger.info(f"Cache hit for prompt: {request.prompt}")
        return cached

    target_count = request.songCount
    all_valid_songs = []
    seen_ids = set()
    max_rounds = 3
    buffer_multiplier = 1.6  # Generate 60% more than needed

    try:
        for round_num in range(max_rounds):
            needed = target_count - len(all_valid_songs)
            if needed <= 0:
                break

            generate_count = int(needed * buffer_multiplier) if round_num == 0 else int(needed * 2)
            generate_count = max(generate_count, 20)

            logger.info(
                f"Round {round_num + 1}: Generating {generate_count} songs "
                f"(have {len(all_valid_songs)}/{target_count})"
            )

            suggestions = await generate_song_list(request.prompt, generate_count)
            valid = await validate_songs(suggestions, needed)

            for song in valid:
                if song["spotify_id"] not in seen_ids:
                    seen_ids.add(song["spotify_id"])
                    all_valid_songs.append(song)
                    if len(all_valid_songs) >= target_count:
                        break

        if len(all_valid_songs) < target_count:
            logger.warning(
                f"Could only find {len(all_valid_songs)}/{target_count} songs with previews"
            )
            if len(all_valid_songs) == 0:
                raise HTTPException(
                    status_code=500,
                    detail="No songs with preview URLs found. Try a different genre.",
                )

        # Build response
        songs = [
            SongResult(
                title=s["title"],
                artist=s["artist"],
                album_art=s["album_art"],
                preview_url=s["preview_url"],
                spotify_id=s["spotify_id"],
                track_number=i + 1,
            )
            for i, s in enumerate(all_valid_songs[:target_count])
        ]

        quiz_id = str(uuid.uuid4())[:8]
        response = QuizResponse(
            quiz_id=quiz_id,
            prompt=request.prompt,
            songs=songs,
            total_songs=len(songs),
        )

        set_cached(cache_key, response.model_dump())
        return response

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Quiz generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quiz: {str(e)}",
        )


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Vercel serverless handler
handler = Mangum(app, lifespan="off")
