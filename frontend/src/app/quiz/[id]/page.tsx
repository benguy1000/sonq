"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuizStore } from "@/lib/quizStore";
import AudioPlayer from "@/components/quiz/AudioPlayer";
import AnswerGrid from "@/components/quiz/AnswerGrid";
import QuizControls from "@/components/quiz/QuizControls";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Music } from "lucide-react";

export default function QuizPage() {
  const router = useRouter();
  const { quizId, prompt, songs, score, revealed, resetQuiz } = useQuizStore();

  useEffect(() => {
    if (!quizId || songs.length === 0) {
      router.push("/");
    }
  }, [quizId, songs, router]);

  if (!quizId || songs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Music className="h-12 w-12 text-zinc-500 mx-auto" />
          <p className="text-zinc-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  const handleNewQuiz = () => {
    resetQuiz();
    router.push("/");
  };

  return (
    <main className="min-h-screen p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewQuiz}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">
              Son<span className="text-primary">Q</span>
            </h1>
            <p className="text-zinc-500 text-sm truncate max-w-xs sm:max-w-md">
              {prompt}
            </p>
          </div>
        </div>
      </div>

      {/* Completion banner */}
      {revealed && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-1">
            {score === songs.length
              ? "Perfect Score!"
              : score >= songs.length * 0.8
              ? "Great Job!"
              : score >= songs.length * 0.5
              ? "Nice Try!"
              : "Better Luck Next Time!"}
          </h2>
          <p className="text-zinc-400">
            You got {score} out of {songs.length} songs correct
          </p>
        </div>
      )}

      {/* Audio Player */}
      <AudioPlayer />

      {/* Quiz Controls */}
      <QuizControls />

      {/* Answer Grid */}
      <AnswerGrid />

      {/* Keyboard shortcuts hint */}
      <div className="text-center text-xs text-zinc-600 pb-4">
        Click any tile to jump to that song. Type your answer and press Enter.
      </div>
    </main>
  );
}
