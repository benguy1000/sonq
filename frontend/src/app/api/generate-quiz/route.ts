import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Allow up to 60s on Vercel (default is 10s)
export const maxDuration = 60;

// ── Types ──────────────────────────────────────────────────────────

interface SongSuggestion {
  title: string;
  artist: string;
}

interface Track {
  title: string;
  artist: string;
  album_art: string;
  preview_url: string;
  track_id: string;
}

// ── Deezer Search ─────────────────────────────────────────────────

async function searchDeezer(
  title: string,
  artist: string
): Promise<Track | null> {
  try {
    const query = `artist:"${artist}" track:"${title}"`;
    const resp = await fetch(
      `https://api.deezer.com/search?${new URLSearchParams({
        q: query,
        limit: "1",
      })}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!resp.ok) return null;
    const data = await resp.json();
    const hit = data?.data?.[0];
    if (!hit || !hit.preview) return null;

    return {
      title: hit.title,
      artist: hit.artist?.name || "",
      album_art: hit.album?.cover_big || hit.album?.cover_medium || "",
      preview_url: hit.preview,
      track_id: String(hit.id),
    };
  } catch {
    return null;
  }
}

async function validateSongs(
  suggestions: SongSuggestion[],
  targetCount: number
): Promise<Track[]> {
  // Search all songs on Deezer in parallel — no auth needed, previews included
  console.log(`Searching ${suggestions.length} songs on Deezer...`);
  const results = await Promise.all(
    suggestions.map((s) => searchDeezer(s.title, s.artist))
  );

  const valid: Track[] = [];
  for (const r of results) {
    if (r) {
      valid.push(r);
      if (valid.length >= targetCount) break;
    }
  }

  console.log(`Found ${valid.length} tracks with previews`);
  return valid;
}

// ── LLM Song Generation ───────────────────────────────────────────

async function generateSongList(prompt: string, count: number): Promise<SongSuggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY must be set");

  const client = new OpenAI({ apiKey });

  const systemPrompt =
    "You are a music expert. Generate a list of well-known songs that match the given genre/era description. " +
    "Return ONLY a JSON array of objects with 'title' and 'artist' keys. " +
    "Focus on popular, recognizable songs. " +
    "Include a diverse mix of artists. Do not repeat artists more than twice. " +
    "Return exactly the requested number of songs.";

  const userPrompt =
    `Generate exactly ${count} songs for this music category: "${prompt}"\n\n` +
    'Return a JSON array like: [{"title": "Song Name", "artist": "Artist Name"}, ...]\n' +
    "Only return the JSON array, no other text.";

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 4096,
  });

  let text = response.choices[0]?.message?.content?.trim() || "";

  // Strip markdown code fences
  if (text.startsWith("```")) {
    const lines = text.split("\n");
    lines.shift();
    if (lines[lines.length - 1]?.trim() === "```") lines.pop();
    text = lines.join("\n");
  }

  // Try to extract a JSON array even if the LLM added surrounding text
  let songs: unknown[];
  try {
    const parsed = JSON.parse(text);
    songs = Array.isArray(parsed) ? parsed : [];
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      songs = JSON.parse(match[0]);
    } else {
      throw new Error("LLM did not return valid JSON");
    }
  }
  if (!Array.isArray(songs) || songs.length === 0) throw new Error("LLM did not return a JSON array");

  return songs
    .filter((s): s is { title: string; artist: string } =>
      typeof s === "object" && s !== null && "title" in s && "artist" in s
    )
    .map((s) => ({ title: String(s.title).trim(), artist: String(s.artist).trim() }));
}

// ── API Route Handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = String(body.prompt || "").trim();
    const songCount = Math.min(50, Math.max(10, Number(body.songCount) || 50));

    if (!prompt || prompt.length < 2) {
      return NextResponse.json({ detail: "Prompt must be at least 2 characters" }, { status: 400 });
    }

    const targetCount = songCount;
    const allValidSongs: Track[] = [];
    const seenIds = new Set<string>();
    const maxRounds = 2;

    for (let round = 0; round < maxRounds; round++) {
      const needed = targetCount - allValidSongs.length;
      if (needed <= 0) break;

      const generateCount = round === 0
        ? Math.ceil(needed * 1.5)
        : needed * 2;

      console.log(`Round ${round + 1}: Generating ${generateCount} songs (have ${allValidSongs.length}/${targetCount})`);

      const suggestions = await generateSongList(prompt, generateCount);
      const valid = await validateSongs(suggestions, needed);

      for (const song of valid) {
        if (!seenIds.has(song.track_id)) {
          seenIds.add(song.track_id);
          allValidSongs.push(song);
          if (allValidSongs.length >= targetCount) break;
        }
      }
    }

    if (allValidSongs.length === 0) {
      return NextResponse.json(
        { detail: "No songs with preview URLs found. Try a different genre." },
        { status: 500 }
      );
    }

    const songs = allValidSongs.slice(0, targetCount).map((s, i) => ({
      ...s,
      track_number: i + 1,
    }));

    const quizId = Math.random().toString(36).substring(2, 10);

    return NextResponse.json({
      quiz_id: quizId,
      prompt,
      songs,
      total_songs: songs.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate quiz";
    console.error("Quiz generation failed:", message);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
