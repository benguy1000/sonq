"use client";

import { useRef } from "react";
import { useQuizStore } from "@/lib/quizStore";
import { checkAnswer, stripSuffix } from "@/lib/fuzzyMatch";
import { cn } from "@/lib/utils";

interface SongInputProps {
  index: number;
}

export default function SongInput({ index }: SongInputProps) {
  const {
    songs,
    currentSongIndex,
    userAnswers,
    correctAnswers,
    revealed,
    difficulty,
    setCurrentSong,
    setUserAnswer,
    markCorrect,
    setPlaying,
  } = useQuizStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const song = songs[index];
  const displayTitle = stripSuffix(song.title);
  const isCorrect = correctAnswers[index];
  const isCurrent = currentSongIndex === index;
  const answer = userAnswers[index] || "";

  const handleClick = () => {
    setCurrentSong(index);
    setPlaying(true);
    // Focus input after a tick so audio starts
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleChange = (value: string) => {
    setUserAnswer(index, value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (!isCorrect && answer.length >= 2) {
        const matched = checkAnswer(answer, song.title, song.artist, difficulty);
        if (matched) markCorrect(index);
      }
      // Move to next unanswered
      const next = correctAnswers.findIndex((c, i) => i > index && !c);
      if (next !== -1) {
        setCurrentSong(next);
        setPlaying(true);
      }
    }
  };

  const showAnswer = revealed || isCorrect;

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 transition-all cursor-pointer overflow-hidden",
        isCurrent && !isCorrect && "border-blue-500 shadow-lg shadow-blue-500/20",
        isCorrect && "border-green-500 bg-green-500/10",
        !isCurrent && !isCorrect && "border-zinc-700 hover:border-zinc-500",
        revealed && !isCorrect && "border-zinc-600 bg-zinc-800/50"
      )}
      onClick={handleClick}
    >
      {/* Album art background when revealed */}
      {showAnswer && song.album_art && (
        <div
          className="absolute inset-0 opacity-15 bg-cover bg-center"
          style={{ backgroundImage: `url(${song.album_art})` }}
        />
      )}

      <div className="relative p-2 sm:p-3">
        {/* Number badge */}
        <div
          className={cn(
            "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mb-1",
            isCorrect && "bg-green-500 text-white",
            !isCorrect && isCurrent && "bg-blue-500 text-white",
            !isCorrect && !isCurrent && "bg-zinc-700 text-zinc-300"
          )}
        >
          {index + 1}
        </div>

        {/* Input or revealed answer */}
        {isCorrect ? (
          <div className="text-green-400 font-medium text-sm truncate">
            {displayTitle}
          </div>
        ) : revealed ? (
          <div className="text-red-400 font-medium text-sm truncate">
            {displayTitle}
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            placeholder="..."
            className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-zinc-600 p-0"
            autoComplete="off"
            spellCheck={false}
          />
        )}

        {/* Artist name when revealed */}
        {showAnswer && (
          <div className="text-zinc-400 text-xs truncate mt-0.5">
            {song.artist}
          </div>
        )}
      </div>
    </div>
  );
}
