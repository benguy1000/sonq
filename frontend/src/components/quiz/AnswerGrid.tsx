"use client";

import { useQuizStore } from "@/lib/quizStore";
import SongInput from "./SongInput";

export default function AnswerGrid() {
  const { songs } = useQuizStore();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
      {songs.map((_, index) => (
        <SongInput key={index} index={index} />
      ))}
    </div>
  );
}
