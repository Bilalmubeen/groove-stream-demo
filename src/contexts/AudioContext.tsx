import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

interface AudioContextType {
  currentlyPlaying: string | null;
  play: (snippetId: string, audioUrl: string) => void;
  pause: () => void;
  isPlaying: (snippetId: string) => boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const play = useCallback((snippetId: string, audioUrl: string) => {
    if (audioRef.current) {
      if (currentlyPlaying === snippetId) {
        audioRef.current.play();
      } else {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setCurrentlyPlaying(snippetId);
      }
    }
  }, [currentlyPlaying]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const isPlaying = useCallback((snippetId: string) => {
    return currentlyPlaying === snippetId && !audioRef.current?.paused;
  }, [currentlyPlaying]);

  return (
    <AudioContext.Provider value={{ currentlyPlaying, play, pause, isPlaying, audioRef }}>
      {children}
      <audio ref={audioRef} />
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
