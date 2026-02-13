import os
import json
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


async def generate_song_list(prompt: str, count: int = 80) -> List[Dict[str, str]]:
    """Generate a curated list of songs using OpenAI or Anthropic."""
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    system_prompt = (
        "You are a music expert. Generate a list of well-known songs that match the given genre/era description. "
        "Return ONLY a JSON array of objects with 'title' and 'artist' keys. "
        "Focus on popular, recognizable songs that are likely available on Spotify with preview clips. "
        "Include a diverse mix of artists. Do not repeat artists more than twice. "
        "Return exactly the requested number of songs."
    )

    user_prompt = (
        f"Generate exactly {count} songs for this music category: \"{prompt}\"\n\n"
        "Return a JSON array like: [{\"title\": \"Song Name\", \"artist\": \"Artist Name\"}, ...]\n"
        "Only return the JSON array, no other text."
    )

    if anthropic_key:
        return await _generate_with_anthropic(system_prompt, user_prompt, anthropic_key)
    elif openai_key:
        return await _generate_with_openai(system_prompt, user_prompt, openai_key)
    else:
        raise ValueError("No LLM API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.")


async def _generate_with_anthropic(system: str, user: str, api_key: str) -> List[Dict[str, str]]:
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-4-5-haiku-20250414",
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user}],
    )

    text = message.content[0].text
    return _parse_song_list(text)


async def _generate_with_openai(system: str, user: str, api_key: str) -> List[Dict[str, str]]:
    import openai

    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.8,
        max_tokens=4096,
    )

    text = response.choices[0].message.content
    return _parse_song_list(text)


def _parse_song_list(text: str) -> List[Dict[str, str]]:
    """Parse LLM response into list of song dicts."""
    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]  # remove opening fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    songs = json.loads(text)
    if not isinstance(songs, list):
        raise ValueError("LLM did not return a JSON array")

    validated = []
    for s in songs:
        if isinstance(s, dict) and "title" in s and "artist" in s:
            validated.append({"title": s["title"].strip(), "artist": s["artist"].strip()})

    if not validated:
        raise ValueError("No valid songs parsed from LLM response")

    return validated
