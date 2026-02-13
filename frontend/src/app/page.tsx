"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuizStore } from "@/lib/quizStore";
import { Difficulty } from "@/lib/types";
import { Music, Loader2, Sparkles } from "lucide-react";

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
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-pink-500/30 blur-[100px]"
          style={{ animation: "blob1 10s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[-15%] right-[-5%] w-[550px] h-[550px] rounded-full bg-orange-500/25 blur-[120px]"
          style={{ animation: "blob2 12s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[30%] right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/20 blur-[100px]"
          style={{ animation: "blob3 14s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[60%] left-[15%] w-[350px] h-[350px] rounded-full bg-fuchsia-500/20 blur-[110px]"
          style={{ animation: "blob4 9s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[10%] right-[30%] w-[300px] h-[300px] rounded-full bg-amber-400/20 blur-[90px]"
          style={{ animation: "blob5 11s ease-in-out infinite" }}
        />
      </div>

      <div className="w-full max-w-lg space-y-8">
        {/* Logo/Title */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center justify-center w-28 h-28 rounded-3xl mb-4"
            style={{
              background: "linear-gradient(135deg, hsl(330 85% 60%), hsl(24 90% 55%))",
              animation: "float 3s ease-in-out infinite",
            }}
          >
            <Music className="h-14 w-14 text-white" />
          </div>
          <h1 className="text-6xl sm:text-8xl font-extrabold tracking-tight">
            Son
            <span className="bg-gradient-to-r from-pink-500 via-orange-400 to-emerald-400 bg-clip-text text-transparent">
              Q
            </span>
          </h1>
          <p className="text-muted-foreground text-xl sm:text-2xl">
            AI Song Quiz Creator
          </p>
        </div>

        {/* Form or Loading */}
        {loading ? (
          <div className="rounded-2xl p-10 border border-white/10 backdrop-blur-sm flex flex-col items-center gap-5"
            style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(251,146,60,0.08))" }}
          >
            <Loader2 className="h-10 w-10 text-pink-400 animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-white text-lg font-medium">Generating quiz...</p>
              <p className="text-zinc-400 text-sm">
                This could take 10-20 seconds
              </p>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full w-full"
                style={{
                  background: "linear-gradient(90deg, hsl(330 85% 60%), hsl(24 90% 55%), hsl(160 70% 45%))",
                  animation: "loading 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm"
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))" }}
          >
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                Music Genre / Era
              </label>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="90s alternative rock, 2000s pop punk, 80s new wave..."
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12 text-base focus:border-pink-500/50 focus:ring-pink-500/20"
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
                  className="bg-white/5 border-white/10 text-white w-24 h-12 text-base text-center focus:border-pink-500/50 focus:ring-pink-500/20"
                />
                <span className="text-zinc-500 text-sm">songs (10-50)</span>
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
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border ${
                      difficulty === d.value
                        ? d.value === "easy"
                          ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-400 shadow-lg shadow-emerald-500/10"
                          : d.value === "medium"
                          ? "bg-orange-500/20 border-orange-400/50 text-orange-400 shadow-lg shadow-orange-500/10"
                          : "bg-pink-500/20 border-pink-400/50 text-pink-400 shadow-lg shadow-pink-500/10"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
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
              className="w-full h-12 text-base font-semibold text-white border-0 disabled:opacity-40"
              style={{
                background: prompt.trim()
                  ? "linear-gradient(135deg, hsl(330 85% 55%), hsl(24 90% 50%))"
                  : undefined,
              }}
              size="lg"
            >
              <Sparkles className="mr-2 h-5 w-5" />
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
              className="border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
            >
              Resume Previous Quiz
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
