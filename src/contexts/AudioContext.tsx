import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

interface AudioContextType {
  currentlyPlaying: string | null;
  play: (snippetId: string, audioUrl: string) => Promise<void>;
  pause: (force?: boolean, clearState?: boolean) => void;
  isPlaying: (snippetId: string) => boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  requestAudioPermission: () => Promise<boolean>;
  hasAudioPermission: boolean;
  userHasInteracted: boolean;
  progress: number; // 0-100
  currentTime: number;
  duration: number;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const unlockAttempted = useRef(false);
  const playStartTimeRef = useRef<number>(0);

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
        // Don't clear src - just leave it, will be overwritten on next play
        
        setHasAudioPermission(true);
        unlockAttempted.current = true;
        console.log('[AudioContext] Audio unlocked successfully');
        return true;
      }
    } catch (error) {
      console.log('[AudioContext] Audio unlock not needed or failed:', error);
    }
    
    setHasAudioPermission(true);
    unlockAttempted.current = true;
    return true;
  }, [hasAudioPermission]);

  // Add audio event listeners for progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setProgress(0);
      setCurrentTime(0);
      setCurrentlyPlaying(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Auto-unlock on first user interaction
  useEffect(() => {
    const unlock = () => {
      console.log('[AudioContext] User interaction detected, unlocking audio');
      setUserHasInteracted(true);
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
    console.log('[AudioContext] play() called', { snippetId, audioUrl, hasAudioRef: !!audioRef.current });
    
    if (!audioRef.current) {
      console.error('[AudioContext] No audio ref available');
      return;
    }

    // Validate audioUrl - prevent playing null/empty URLs
    if (!audioUrl || audioUrl.trim() === '') {
      console.warn('[AudioContext] Cannot play audio: No valid audio URL provided for snippet', snippetId);
      return;
    }

    // Request permission if not yet granted
    if (!hasAudioPermission) {
      console.log('[AudioContext] Requesting audio permission...');
      await requestAudioPermission();
    }

    try {
      if (currentlyPlaying === snippetId) {
        // Resume current track
        console.log('[AudioContext] Resuming current track', snippetId);
        await audioRef.current.play();
      } else {
        // Stop current and play new
        console.log('[AudioContext] Playing new track', { snippetId, audioUrl });
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = audioUrl;
        console.log('[AudioContext] Audio src set, calling play()...');
        await audioRef.current.play();
        console.log('[AudioContext] play() succeeded, setting currentlyPlaying');
        playStartTimeRef.current = Date.now(); // Mark play start time
        setCurrentlyPlaying(snippetId);
      }
    } catch (error) {
      console.error('[AudioContext] Error playing audio:', error);
      // Reset state on error
      setCurrentlyPlaying(null);
    }
  }, [currentlyPlaying, hasAudioPermission, requestAudioPermission]);

  const pause = useCallback((force: boolean = false, clearState: boolean = true) => {
    // Prevent pausing within 500ms of starting play (unless forced)
    const timeSinceStart = Date.now() - playStartTimeRef.current;
    if (!force && timeSinceStart < 500) {
      console.log('[AudioContext] pause() blocked - audio just started', { timeSinceStart });
      return;
    }
    console.log('[AudioContext] pause() called', { force, timeSinceStart, clearState });
    if (audioRef.current) {
      audioRef.current.pause();
    }
    // Clear currentlyPlaying so auto-play can work on next visible card
    if (clearState) {
      setCurrentlyPlaying(null);
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
      hasAudioPermission,
      userHasInteracted,
      progress,
      currentTime,
      duration
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
