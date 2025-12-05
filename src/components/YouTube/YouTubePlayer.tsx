import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  startSeconds?: number;
  maxDuration?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onComplete?: () => void;
  className?: string;
  autoPlay?: boolean;
}

// Track if API is loaded globally
let apiLoaded = false;
let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      apiLoaded = true;
      resolve();
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);
  });

  return apiLoadPromise;
}

export function YouTubePlayer({
  videoId,
  startSeconds = 0,
  maxDuration = 30,
  onTimeUpdate,
  onComplete,
  className,
  autoPlay = false,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);
  const autoPlayRef = useRef(autoPlay);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Keep autoPlayRef in sync
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  const endSeconds = startSeconds + maxDuration;
  const progress = (currentTime / maxDuration) * 100;
  const remainingTime = Math.max(0, maxDuration - currentTime);

  const clearTimeInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimeTracking = useCallback(() => {
    clearTimeInterval();
    intervalRef.current = window.setInterval(() => {
      if (!playerRef.current) return;

      try {
        const playerTime = playerRef.current.getCurrentTime();
        const elapsed = playerTime - startSeconds;
        
        // Check if we've exceeded the 30-second limit
        if (elapsed >= maxDuration) {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
          setCurrentTime(maxDuration);
          setHasCompleted(true);
          clearTimeInterval();
          onComplete?.();
          return;
        }

        // Prevent seeking beyond allowed range
        if (playerTime < startSeconds || playerTime > endSeconds) {
          playerRef.current.seekTo(startSeconds, true);
          return;
        }

        setCurrentTime(Math.max(0, elapsed));
        onTimeUpdate?.(elapsed);
      } catch (e) {
        // Player might not be ready
      }
    }, 100);
  }, [startSeconds, maxDuration, endSeconds, onTimeUpdate, onComplete, clearTimeInterval]);

  useEffect(() => {
    let mounted = true;

    loadYouTubeAPI().then(() => {
      if (!mounted || !containerRef.current) return;

      // Create unique ID for the player
      const playerId = `yt-player-${videoId}-${Date.now()}`;
      const playerDiv = document.createElement('div');
      playerDiv.id = playerId;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(playerDiv);

      playerRef.current = new window.YT.Player(playerId, {
        videoId,
        playerVars: {
          start: startSeconds,
          autoplay: autoPlayRef.current ? 1 : 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0,
          disablekb: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            setIsReady(true);
            if (autoPlayRef.current) {
              setIsPlaying(true);
              startTimeTracking();
            }
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startTimeTracking();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              clearTimeInterval();
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              clearTimeInterval();
              setHasCompleted(true);
              onComplete?.();
            }
          },
        },
      });
    });

    return () => {
      mounted = false;
      clearTimeInterval();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Player might already be destroyed
        }
      }
    };
  }, [videoId, startSeconds]);

  // Handle autoPlay changes without recreating the player
  useEffect(() => {
    if (!isReady || !playerRef.current) return;
    
    try {
      if (autoPlay && !isPlaying) {
        playerRef.current.playVideo();
      } else if (!autoPlay && isPlaying) {
        playerRef.current.pauseVideo();
      }
    } catch (e) {
      // Player might not be ready
    }
  }, [autoPlay, isReady]);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !isReady) return;

    if (hasCompleted) {
      // Restart from beginning
      playerRef.current.seekTo(startSeconds, true);
      setCurrentTime(0);
      setHasCompleted(false);
      playerRef.current.playVideo();
    } else if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isReady, isPlaying, hasCompleted, startSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('relative w-full aspect-video rounded-xl overflow-hidden bg-card', className)}>
      {/* YouTube iframe container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 pointer-events-none"
      />

      {/* Overlay for controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Play/Pause button overlay */}
      <Button
        onClick={togglePlayPause}
        disabled={!isReady}
        size="lg"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full w-16 h-16 bg-primary/90 hover:bg-primary shadow-xl z-10"
      >
        {isPlaying ? (
          <Pause className="w-8 h-8" />
        ) : (
          <Play className="w-8 h-8 ml-1" />
        )}
      </Button>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        {/* Progress bar */}
        <Progress value={progress} className="h-1 mb-2" />
        
        {/* Time display */}
        <div className="flex justify-between text-xs text-white/80">
          <span>{formatTime(currentTime)}</span>
          <span className="font-medium text-primary">
            {remainingTime > 0 ? `${formatTime(remainingTime)} remaining` : 'Complete'}
          </span>
          <span>{formatTime(maxDuration)}</span>
        </div>
      </div>

      {/* 30-second limit indicator */}
      <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 text-xs text-white/80 z-10">
        30s Preview
      </div>
    </div>
  );
}
