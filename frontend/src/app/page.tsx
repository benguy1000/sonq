"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuizStore } from "@/lib/quizStore";
import { Difficulty } from "@/lib/types";
import { Music, Loader2 } from "lucide-react";

const difficulties: { value: Difficulty; label: string; desc: string }[] = [
  { value: "easy", label: "Easy", desc: "Fuzzy matching, close enough counts" },
  { value: "medium", label: "Medium", desc: "Minor typos allowed" },
  { value: "hard", label: "Hard", desc: "Exact title required" },
];

export default function Home() {
  const router = useRouter();
  const { startQuiz, quizId } = useQuizStore();

  const [prompt, setPrompt] = useState("");
  const [songCount, setSongCount] = useState("50");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExistingQuiz = quizId !== null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const clampedCount = Math.min(50, Math.max(10, parseInt(songCount) || 10));
    setSongCount(String(clampedCount));

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/api/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), songCount: clampedCount }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();

      startQuiz(data.quiz_id, data.prompt, data.songs, difficulty);
      router.push(`/quiz/${data.quiz_id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate quiz. Please try again.";
      setError(message);
      setLoading(false);
    }
  };

  const handleResume = () => {
    router.push(`/quiz/${quizId}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo/Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Son<span className="text-primary">Q</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            AI Song Quiz Creator
          </p>
        </div>

        {/* Form or Loading */}
        {loading ? (
          <div className="bg-zinc-900/50 rounded-2xl p-10 border border-zinc-800 flex flex-col items-center gap-5">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-white text-lg font-medium">Generating quiz...</p>
              <p className="text-zinc-500 text-sm">
                This could take 10–20 seconds
              </p>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full w-full" style={{ animation: 'loading 2s ease-in-out infinite' }} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                Music Genre / Era
              </label>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="90s alternative rock, 2000s pop punk, 80s new wave..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base"
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                Number of Songs
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={songCount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d{1,2}$/.test(v)) setSongCount(v);
                  }}
                  onBlur={() => {
                    const n = parseInt(songCount);
                    setSongCount(String(isNaN(n) ? 10 : Math.min(50, Math.max(10, n))));
                  }}
                  className="bg-zinc-800 border-zinc-700 text-white w-24 h-12 text-base text-center"
                />
                <span className="text-zinc-500 text-sm">songs (10–50)</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                Difficulty
              </label>
              <div className="flex gap-2">
                {difficulties.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                      difficulty === d.value
                        ? d.value === "easy"
                          ? "bg-green-500/20 border-green-500 text-green-400"
                          : d.value === "medium"
                          ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                          : "bg-red-500/20 border-red-500 text-red-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-zinc-500 text-xs mt-1.5">
                {difficulties.find((d) => d.value === difficulty)?.desc}
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              Generate Quiz
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              className="mt-2 text-red-300 hover:text-red-200"
            >
              Try again
            </Button>
          </div>
        )}

        {/* Resume existing quiz */}
        {hasExistingQuiz && !loading && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={handleResume}
              className="border-zinc-700 text-zinc-300"
            >
              Resume Previous Quiz
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
