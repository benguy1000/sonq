from pydantic import BaseModel, Field
from typing import List, Optional


class QuizRequest(BaseModel):
    prompt: str = Field(..., description="Music genre/era prompt", min_length=2, max_length=200)
    songCount: int = Field(default=50, ge=10, le=50)


class SongSuggestion(BaseModel):
    title: str
    artist: str


class SongResult(BaseModel):
    title: str
    artist: str
    album_art: str
    preview_url: str
    spotify_id: str
    track_number: int


class QuizResponse(BaseModel):
    quiz_id: str
    prompt: str
    songs: List[SongResult]
    total_songs: int


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    retry: bool = False
