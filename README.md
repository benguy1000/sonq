# SonQ

AI-powered music quiz creator. Enter a genre or era, get a quiz with 30-second audio previews, and guess the songs.

## How It Works

1. **You type a prompt** — "90s alternative rock", "2000s pop punk", etc.
2. **GPT-4.1-mini generates a song list** matching your prompt
3. **Deezer API validates each song** and fetches 30-second audio previews
4. **You listen and guess** — fuzzy matching scores your answers in real-time

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 13 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI | Radix UI primitives, Lucide icons |
| State | Zustand (persisted to localStorage) |
| AI | OpenAI GPT-4.1-mini |
| Music | Deezer API (search + 30s previews, no auth required) |
| Fuzzy matching | Fuse.js + token-based matching |
| Deployment | Vercel |

Everything runs as a single Next.js app — no separate backend server. The API route (`frontend/src/app/api/generate-quiz/route.ts`) is the entire backend, deployed as a Vercel serverless function.

## Project Structure

```
frontend/src/
├── app/
│   ├── page.tsx                         # Home — quiz config form
│   ├── layout.tsx                       # Root layout, meta tags
│   ├── globals.css                      # Theme, blob animations
│   ├── quiz/[id]/page.tsx               # Quiz gameplay
│   └── api/generate-quiz/route.ts       # API endpoint (serverless)
├── components/
│   ├── ui/                              # Button, Input, Slider
│   └── quiz/                            # AudioPlayer, AnswerGrid, SongInput, QuizControls
└── lib/
    ├── types.ts                         # Song, Difficulty, QuizState
    ├── quizStore.ts                     # Zustand store
    ├── fuzzyMatch.ts                    # Answer validation logic
    └── utils.ts                         # cn() helper
```

## Quiz Flow

```
User prompt → OpenAI (generate song list)
                 ↓
           Deezer search (parallel, per song)
                 ↓
           Filter to songs with 30s previews
                 ↓
           Return quiz (songs + album art + audio URLs)
                 ↓
           Play audio → User types guesses → Fuzzy match scoring
```

If the first round doesn't find enough songs, a second round generates more with a 2x buffer.

## Difficulty Levels

- **Easy** — fuzzy matching, close enough counts (Fuse.js threshold 0.3, 60% token overlap)
- **Medium** — minor typos allowed (threshold 0.2, 80% token overlap)
- **Hard** — exact title required (normalized, but no fuzzy tolerance)

All levels strip remaster/remix/deluxe suffixes and ignore articles (the, a, an).

## Running Locally

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
OPENAI_API_KEY=sk-...
```

```bash
npm run dev
```

Opens at http://localhost:3000.

## Deploying

Push to GitHub. Vercel auto-deploys from `main`. Set `OPENAI_API_KEY` in Vercel environment variables.

## License

MIT

## Built by [Ben](https://github.com/benguy1000)
