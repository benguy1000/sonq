export interface Song {
  title: string;
  artist: string;
  album_art: string;
  preview_url: string;
  track_id: string;
  track_number: number;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface QuizState {
  quizId: string | null;
  prompt: string;
  difficulty: Difficulty;
  songs: Song[];
  currentSongIndex: number;
  userAnswers: string[];
  correctAnswers: boolean[];
  revealed: boolean;
  startedAt: number | null;
  score: number;
  isPlaying: boolean;
  volume: number;
  isLoading: boolean;
  error: string | null;
}
