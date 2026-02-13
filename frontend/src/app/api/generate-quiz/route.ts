import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Allow up to 60s on Vercel (default is 10s)
export const maxDuration = 60;

// ── Types ──────────────────────────────────────────────────────────

interface SongSuggestion {
  title: string;
  artist: string;
}

interface SpotifyTrack {
  title: string;
  artist: string;
  album_art: string;
  preview_url: string;
  spotify_id: string;
}

// ── Spotify Auth ───────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpires = 0;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() / 1000 < tokenExpires - 60) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) throw new Error(`Spotify auth failed: ${resp.status}`);
  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpires = Date.now() / 1000 + (data.expires_in || 3600);
  return cachedToken!;
}

// ── Spotify Search ─────────────────────────────────────────────────

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs)
    ),
  ]);
}

async function getPreviewFromEmbed(trackId: string): Promise<string | null> {
  try {
    const resp = await fetchWithTimeout(
      `https://open.spotify.com/embed/track/${trackId}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } },
      3000 // 3s timeout per embed scrape
    );
    if (resp.ok) {
      const html = await resp.text();
      const match = html.match(/"audioPreview":\{"url":"([^"]+)"/);
      if (match) return match[1];
    }
  } catch {
    // timeout or fetch error — skip this track
  }
  return null;
}

interface SpotifySearchResult {
  trackName: string;
  artistName: string;
  albumArt: string;
  trackId: string;
  previewUrl: string | null;
}

async function searchSpotifyApi(
  title: string,
  artist: string,
  token: string
): Promise<SpotifySearchResult | null> {
  const query = `track:${title} artist:${artist}`;
  try {
    const resp = await fetchWithTimeout(
      `https://api.spotify.com/v1/search?${new URLSearchParams({
        q: query,
        type: "track",
        limit: "1",
        market: "US",
      })}`,
      { headers: { Authorization: `Bearer ${token}` } },
      5000
    );

    if (!resp.ok) return null;
    const data = await resp.json();
    const track = data?.tracks?.items?.[0];
    if (!track) return null;

    const albumImages = track.album?.images || [];
    return {
      trackName: track.name,
      artistName: track.artists?.map((a: { name: string }) => a.name).join(", ") || "",
      albumArt: albumImages[0]?.url || "",
      trackId: track.id,
      previewUrl: track.preview_url || null,
    };
  } catch {
    return null;
  }
}

async function validateSongs(
  suggestions: SongSuggestion[],
  targetCount: number
): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();

  // Phase 1: Search all songs on Spotify API in parallel (fast — just metadata)
  console.log(`Searching ${suggestions.length} songs on Spotify API...`);
  const searchResults = await Promise.all(
    suggestions.map((s) => searchSpotifyApi(s.title, s.artist, token))
  );

  // Split into: have preview vs need embed scrape
  const ready: SpotifyTrack[] = [];
  const needEmbed: SpotifySearchResult[] = [];

  for (const r of searchResults) {
    if (!r) continue;
    if (r.previewUrl) {
      ready.push({
        title: r.trackName,
        artist: r.artistName,
        album_art: r.albumArt,
        preview_url: r.previewUrl,
        spotify_id: r.trackId,
      });
    } else {
      needEmbed.push(r);
    }
  }

  console.log(`Found ${ready.length} with native preview, ${needEmbed.length} need embed scrape`);

  // If we already have enough, skip embed scraping entirely
  if (ready.length >= targetCount) {
    return ready.slice(0, targetCount);
  }

  // Phase 2: Scrape embeds only for as many as we need, all in parallel with timeouts
  const stillNeeded = targetCount - ready.length;
  const toScrape = needEmbed.slice(0, stillNeeded + 5); // scrape a few extra in case some fail

  console.log(`Scraping ${toScrape.length} embed pages...`);
  const embedResults = await Promise.all(
    toScrape.map(async (r) => {
      const previewUrl = await getPreviewFromEmbed(r.trackId);
      if (!previewUrl) return null;
      return {
        title: r.trackName,
        artist: r.artistName,
        album_art: r.albumArt,
        preview_url: previewUrl,
        spotify_id: r.trackId,
      } as SpotifyTrack;
    })
  );

  for (const r of embedResults) {
    if (r) ready.push(r);
  }

  return ready.slice(0, targetCount);
}

// ── LLM Song Generation ───────────────────────────────────────────

async function generateSongList(prompt: string, count: number): Promise<SongSuggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY must be set");

  const client = new OpenAI({ apiKey });

  const systemPrompt =
    "You are a music expert. Generate a list of well-known songs that match the given genre/era description. " +
    "Return ONLY a JSON array of objects with 'title' and 'artist' keys. " +
    "Focus on popular, recognizable songs that are likely available on Spotify with preview clips. " +
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

  const songs: unknown[] = JSON.parse(text);
  if (!Array.isArray(songs)) throw new Error("LLM did not return a JSON array");

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
    const allValidSongs: SpotifyTrack[] = [];
    const seenIds = new Set<string>();
    const maxRounds = 2;

    for (let round = 0; round < maxRounds; round++) {
      const needed = targetCount - allValidSongs.length;
      if (needed <= 0) break;

      // Generate more candidates than needed to account for missing previews
      const generateCount = round === 0
        ? Math.ceil(needed * 2.5)  // ask for 2.5x on first round
        : needed * 3;

      console.log(`Round ${round + 1}: Generating ${generateCount} songs (have ${allValidSongs.length}/${targetCount})`);

      const suggestions = await generateSongList(prompt, generateCount);
      const valid = await validateSongs(suggestions, needed);

      for (const song of valid) {
        if (!seenIds.has(song.spotify_id)) {
          seenIds.add(song.spotify_id);
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
