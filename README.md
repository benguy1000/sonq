# SonQ - AI Song Quiz Creator

SonQ is an AI-powered music quiz app that generates Sporcle-style quizzes using Spotify previews. Enter a genre or era, and SonQ uses AI to curate a playlist of songs — then challenges you to name each track from a short audio clip.

## Features

- **AI-Generated Quizzes** — Describe any genre, era, or theme and get a custom quiz
- **Spotify Audio Previews** — Listen to 30-second clips and guess the song title
- **Difficulty Modes** — Easy (fuzzy matching), Medium (minor typos allowed), Hard (exact match only)
- **Countdown Timer** — 30 seconds per song to keep the pressure on
- **10-50 Songs** — Configurable quiz length
- **Smart Title Matching** — Strips remastered/live/deluxe suffixes for fair matching

## Tech Stack

- **Frontend**: Next.js 13, React 18, TypeScript, Tailwind CSS, Zustand
- **AI**: OpenAI GPT-4.1-mini for song list generation
- **Music**: Spotify Web API for track search and audio previews
- **Deployment**: Vercel (fullstack — API routes handle backend logic)

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key
- Spotify Developer app (Client ID + Secret)

### Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
OPENAI_API_KEY=your_openai_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

### Run Locally

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy to Vercel — connect the GitHub repo and add the three environment variables above. The `vercel.json` handles build configuration automatically.

## License

MIT
