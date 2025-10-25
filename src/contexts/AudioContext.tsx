import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

interface AudioContextType {
  currentlyPlaying: string | null;
  play: (snippetId: string, audioUrl: string) => Promise<void>;
  pause: () => void;
  isPlaying: (snippetId: string) => boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  requestAudioPermission: () => Promise<boolean>;
  hasAudioPermission: boolean;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const unlockAttempted = useRef(false);

  // Request audio permission on first user interaction
  const requestAudioPermission = useCallback(async () => {
    if (unlockAttempted.current) return hasAudioPermission;

    try {
      if (audioRef.current) {
        // Try to play a silent moment to unlock audio on mobile
        audioRef.current.volume = 0;
        audioRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.volume = 1;
        audioRef.current.src = '';
        
        setHasAudioPermission(true);
        unlockAttempted.current = true;
        console.log('Audio unlocked successfully');
        return true;
      }
    } catch (error) {
      console.log('Audio unlock not needed or failed:', error);
    }
    
    setHasAudioPermission(true);
    unlockAttempted.current = true;
    return true;
  }, [hasAudioPermission]);

  // Auto-unlock on first user interaction
  useEffect(() => {
    const unlock = () => {
      if (!unlockAttempted.current) {
        requestAudioPermission();
      }
    };

    // Listen for first user interaction
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });

    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, [requestAudioPermission]);

  const play = useCallback(async (snippetId: string, audioUrl: string) => {
    if (!audioRef.current) return;

    // Request permission if not yet granted
    if (!hasAudioPermission) {
      await requestAudioPermission();
    }

    try {
      if (currentlyPlaying === snippetId) {
        // Resume current track
        await audioRef.current.play();
      } else {
        // Stop current and play new
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        setCurrentlyPlaying(snippetId);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, [currentlyPlaying, hasAudioPermission, requestAudioPermission]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const isPlaying = useCallback((snippetId: string) => {
    return currentlyPlaying === snippetId && !audioRef.current?.paused;
  }, [currentlyPlaying]);

  // Pause on tab blur
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current) {
        audioRef.current.pause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <AudioContext.Provider value={{ 
      currentlyPlaying, 
      play, 
      pause, 
      isPlaying, 
      audioRef,
      requestAudioPermission,
      hasAudioPermission
    }}>
      {children}
      <audio ref={audioRef} preload="metadata" />
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
