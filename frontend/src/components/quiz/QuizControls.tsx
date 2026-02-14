"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useQuizStore } from "@/lib/quizStore";
import { Flag, RotateCcw, Clock } from "lucide-react";

export default function QuizControls() {
  const { songs, score, revealed, startedAt, revealAll, resetQuiz } =
    useQuizStore();

  const totalSeconds = songs.length * 30;
  const [remaining, setRemaining] = useState(totalSeconds);

  const handleTimeUp = useCallback(() => {
    revealAll();
  }, [revealAll]);

  useEffect(() => {
    if (!startedAt || revealed) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, totalSeconds - elapsed);
      setRemaining(left);

      if (left === 0) {
        handleTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, revealed, totalSeconds, handleTimeUp]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const urgency = remaining <= 30 ? "text-red-400" : remaining <= 60 ? "text-orange-400" : "text-zinc-300";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      {/* Score */}
      <div className="text-center">
        <div className="text-3xl font-bold text-white">
          {score}
          <span className="text-zinc-400 text-lg">/{songs.length}</span>
        </div>
        <div className="text-xs text-zinc-400 uppercase tracking-wider">
          Score
        </div>
      </div>

      {/* Timer */}
      <div className="text-center">
        <div className={`text-2xl font-mono ${urgency} ${remaining <= 30 && !revealed ? "animate-pulse" : ""}`}>
          <Clock className="inline h-4 w-4 mr-1 mb-0.5" />
          {revealed ? formatTime(totalSeconds - remaining) : formatTime(remaining)}
        </div>
        <div className="text-xs text-zinc-400 uppercase tracking-wider">
          {revealed ? "Final Time" : "Remaining"}
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
