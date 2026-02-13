import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Song, QuizState } from "./types";

interface QuizActions {
  startQuiz: (quizId: string, prompt: string, songs: Song[], difficulty: import("./types").Difficulty) => void;
  setCurrentSong: (index: number) => void;
  setUserAnswer: (index: number, answer: string) => void;
  markCorrect: (index: number) => void;
  revealAll: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetQuiz: () => void;
}

const initialState: QuizState = {
  quizId: null,
  prompt: "",
  difficulty: "medium",
  songs: [],
  currentSongIndex: 0,
  userAnswers: [],
  correctAnswers: [],
  revealed: false,
  startedAt: null,
  score: 0,
  isPlaying: false,
  volume: 0.7,
  isLoading: false,
  error: null,
};

export const useQuizStore = create<QuizState & QuizActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      startQuiz: (quizId, prompt, songs, difficulty) =>
        set({
          quizId,
          prompt,
          difficulty,
          songs,
          currentSongIndex: 0,
          userAnswers: new Array(songs.length).fill(""),
          correctAnswers: new Array(songs.length).fill(false),
          revealed: false,
          startedAt: Date.now(),
          score: 0,
          isPlaying: false,
          error: null,
          isLoading: false,
        }),

      setCurrentSong: (index) => set({ currentSongIndex: index }),

      setUserAnswer: (index, answer) => {
        const answers = [...get().userAnswers];
        answers[index] = answer;
        set({ userAnswers: answers });
      },

      markCorrect: (index) => {
        const correct = [...get().correctAnswers];
        if (!correct[index]) {
          correct[index] = true;
          set({ correctAnswers: correct, score: get().score + 1 });
        }
      },

      revealAll: () => set({ revealed: true, isPlaying: false }),

      setPlaying: (playing) => set({ isPlaying: playing }),

      setVolume: (volume) => set({ volume }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error, isLoading: false }),

      resetQuiz: () => set(initialState),
    }),
    {
      name: "sonq-quiz-state",
      partialize: (state) => ({
        quizId: state.quizId,
        prompt: state.prompt,
        difficulty: state.difficulty,
        songs: state.songs,
        currentSongIndex: state.currentSongIndex,
        userAnswers: state.userAnswers,
        correctAnswers: state.correctAnswers,
        revealed: state.revealed,
        startedAt: state.startedAt,
        score: state.score,
        volume: state.volume,
      }),
    }
  )
);
