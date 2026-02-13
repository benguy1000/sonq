"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQuizStore } from "@/lib/quizStore";
import { Flag, RotateCcw } from "lucide-react";

export default function QuizControls() {
  const { songs, score, revealed, startedAt, revealAll, resetQuiz } =
    useQuizStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt || revealed) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, revealed]);

  const formatElapsed = () => {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      {/* Score */}
      <div className="text-center">
        <div className="text-3xl font-bold text-white">
          {score}
          <span className="text-zinc-500 text-lg">/{songs.length}</span>
        </div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider">
          Score
        </div>
      </div>

      {/* Timer */}
      <div className="text-center">
        <div className="text-2xl font-mono text-zinc-300">
          {formatElapsed()}
        </div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider">
          Time
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!revealed ? (
          <Button
            variant="destructive"
            onClick={revealAll}
            className="gap-2"
          >
            <Flag className="h-4 w-4" />
            Give Up
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={resetQuiz}
            className="gap-2 border-zinc-700 text-zinc-300"
          >
            <RotateCcw className="h-4 w-4" />
            New Quiz
          </Button>
        )}
      </div>
    </div>
  );
}
