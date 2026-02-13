"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuizStore } from "@/lib/quizStore";
import { Music, Loader2, AlertCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { startQuiz, setLoading, setError, isLoading, error, quizId } =
    useQuizStore();

  const [prompt, setPrompt] = useState("");
  const [songCount, setSongCount] = useState(50);
  const [progress, setProgress] = useState("");

  const hasExistingQuiz = quizId !== null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setProgress("Generating song list...");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/api/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), songCount }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }

      setProgress("Loading quiz...");
      const data = await res.json();

      startQuiz(data.quiz_id, data.prompt, data.songs);
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
            Name that tune! Sporcle-style music quiz with Spotify clips.
          </p>
        </div>

        {/* Form */}
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
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">
              Number of Songs
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={songCount}
                onChange={(e) =>
                  setSongCount(
                    Math.min(50, Math.max(10, parseInt(e.target.value) || 10))
                  )
                }
                min={10}
                max={50}
                className="bg-zinc-800 border-zinc-700 text-white w-24 h-12 text-base text-center"
                disabled={isLoading}
              />
              <span className="text-zinc-500 text-sm">songs (10-50)</span>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {progress}
              </>
            ) : (
              "Generate Quiz"
            )}
          </Button>

          {isLoading && (
            <p className="text-center text-zinc-500 text-sm">
              This usually takes 5-10 seconds...
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                className="mt-2 text-red-300 hover:text-red-200 p-0 h-auto"
              >
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Resume existing quiz */}
        {hasExistingQuiz && !isLoading && (
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
