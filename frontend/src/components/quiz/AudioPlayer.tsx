"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useQuizStore } from "@/lib/quizStore";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const preloadRef = useRef<HTMLAudioElement>(null);
  const {
    songs,
    currentSongIndex,
    isPlaying,
    volume,
    revealed,
    correctAnswers,
    setCurrentSong,
    setPlaying,
    setVolume,
  } = useQuizStore();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);

  const currentSong = songs[currentSongIndex];
  const nextSong = songs[currentSongIndex + 1];

  // Load audio when song changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    setAudioError(false);
    setProgress(0);
    audio.src = currentSong.preview_url;
    audio.load();

    if (isPlaying) {
      audio.play().catch(() => setAudioError(true));
    }
  }, [currentSongIndex, currentSong]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload next song
  useEffect(() => {
    const preload = preloadRef.current;
    if (!preload || !nextSong) return;
    preload.src = nextSong.preview_url;
    preload.load();
  }, [nextSong]);

  // Volume changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Play/pause state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      audio.play().catch(() => {
        setAudioError(true);
        setPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);
    setDuration(audio.duration || 30);
  }, []);

  const handleEnded = useCallback(() => {
    // Auto-advance to next song
    if (currentSongIndex < songs.length - 1) {
      setCurrentSong(currentSongIndex + 1);
    } else {
      setPlaying(false);
    }
  }, [currentSongIndex, songs.length, setCurrentSong, setPlaying]);

  const handleError = useCallback(() => {
    setAudioError(true);
    // Auto-skip to next song on error
    if (currentSongIndex < songs.length - 1) {
      setTimeout(() => setCurrentSong(currentSongIndex + 1), 500);
    }
  }, [currentSongIndex, songs.length, setCurrentSong]);

  const togglePlay = () => {
    if (audioError) return;
    setPlaying(!isPlaying);
  };

  const skipBack = () => {
    if (currentSongIndex > 0) {
      setCurrentSong(currentSongIndex - 1);
    }
  };

  const skipForward = () => {
    if (currentSongIndex < songs.length - 1) {
      setCurrentSong(currentSongIndex + 1);
    }
  };

  const seekTo = (value: number[]) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value[0];
      setProgress(value[0]);
    }
  };

  if (!currentSong) return null;

  const showInfo = revealed || correctAnswers[currentSongIndex];

  return (
    <div className="bg-zinc-900 rounded-xl p-4 sm:p-6 shadow-lg border border-zinc-800">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
      />
      <audio ref={preloadRef} preload="auto" className="hidden" />

      {/* Song info */}
      <div className="flex items-center gap-4 mb-4">
        {showInfo && currentSong.album_art ? (
          <img
            src={currentSong.album_art}
            alt="Album art"
            className="w-14 h-14 rounded-md object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-400 text-lg font-bold">
            ?
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-zinc-400">
            Song {currentSongIndex + 1} of {songs.length}
          </div>
          {showInfo ? (
            <>
              <div className="text-white font-semibold truncate">
                {currentSong.title}
              </div>
              <div className="text-zinc-400 text-sm truncate">
                {currentSong.artist}
              </div>
            </>
          ) : (
            <div className="text-zinc-400 italic">Guess the song!</div>
          )}
        </div>
      </div>

      {/* Error state */}
      {audioError && (
        <div className="text-red-400 text-sm mb-3 text-center">
          Audio unavailable - skipping...
        </div>
      )}

      {/* Progress bar */}
      <Slider
        value={[progress]}
        max={duration || 30}
        step={0.1}
        onValueChange={seekTo}
        className="mb-4"
      />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={skipBack}
            disabled={currentSongIndex === 0}
            className="text-zinc-300 hover:text-white"
          >
            <SkipBack className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            disabled={audioError}
            className="text-zinc-300 hover:text-white h-12 w-12"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={skipForward}
            disabled={currentSongIndex === songs.length - 1}
            className="text-zinc-300 hover:text-white"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 w-28">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
            className="text-zinc-300 hover:text-white h-8 w-8"
          >
            {volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={(v) => setVolume(v[0])}
            className="flex-1"
          />
        </div>
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs text-zinc-400 mt-1">
        <span>{formatTime(progress)}</span>
        <span>{formatTime(duration || 30)}</span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
