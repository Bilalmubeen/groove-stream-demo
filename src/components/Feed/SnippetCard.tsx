import { useState, useRef, useEffect, useCallback } from "react";
import { Heart, Share2, Bookmark, Play, Pause, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEngagement } from "@/hooks/useEngagement";

interface SnippetCardProps {
  snippet: {
    id: string;
    title: string;
    artist_name: string;
    cover_image_url?: string;
    audio_url: string;
    likes: number;
    genre: string;
  };
  isActive: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  isLiked: boolean;
  isSaved: boolean;
}

export function SnippetCard({
  snippet,
  isActive,
  onLike,
  onSave,
  onShare,
  isLiked,
  isSaved,
}: SnippetCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasTracked3s, setHasTracked3s] = useState(false);
  const [hasTrackedComplete, setHasTrackedComplete] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { trackEvent } = useEngagement();
  const playStartTime = useRef<number>(0);

  // Intersection Observer for viewport visibility
  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && isActive) {
          audioRef.current?.play();
          setIsPlaying(true);
          trackEvent(snippet.id, 'play_start');
          playStartTime.current = Date.now();
        } else {
          audioRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isActive, snippet.id, trackEvent]);

  // Tab blur detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track engagement events
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      
      // Track 3-second retention
      if (currentTime >= 3 && !hasTracked3s) {
        trackEvent(snippet.id, 'play_3s');
        setHasTracked3s(true);
      }
    };

    const handleEnded = () => {
      if (!hasTrackedComplete) {
        trackEvent(snippet.id, 'complete');
        setHasTrackedComplete(true);
      }
      
      // Track replay if user replays
      if (hasTrackedComplete) {
        trackEvent(snippet.id, 'replay');
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [snippet.id, hasTracked3s, hasTrackedComplete, trackEvent]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div 
      ref={cardRef}
      className="relative h-screen w-full snap-start snap-always flex items-center justify-center bg-gradient-to-br from-background via-card to-background"
    >
      {/* Background gradient glow */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{ background: "var(--gradient-glow)" }}
      />

      {/* Cover image background */}
      {snippet.cover_image_url && (
        <div 
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30"
          style={{ backgroundImage: `url(${snippet.cover_image_url})` }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 flex flex-col items-center">
        {/* Album Art */}
        <div className="relative mb-8">
          <div className="w-80 h-80 rounded-3xl overflow-hidden shadow-2xl animate-pulse-glow">
            {snippet.cover_image_url ? (
              <img 
                src={snippet.cover_image_url} 
                alt={snippet.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Music className="w-32 h-32 text-primary-foreground opacity-50" />
              </div>
            )}
          </div>

          {/* Play/Pause button overlay */}
          <Button
            onClick={togglePlayPause}
            size="lg"
            className="absolute bottom-4 right-4 w-16 h-16 rounded-full bg-primary/90 hover:bg-primary shadow-xl"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </Button>
        </div>

        {/* Track Info */}
        <div className="text-center mb-8 space-y-2">
          <h2 className="text-3xl font-bold text-foreground">{snippet.title}</h2>
          <p className="text-xl text-muted-foreground">{snippet.artist_name}</p>
          <span className="inline-block px-4 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
            {snippet.genre}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-8">
          <button
            onClick={onLike}
            className="flex flex-col items-center gap-2 transition-transform hover:scale-110"
          >
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center glass transition-colors",
              isLiked && "bg-primary/30"
            )}>
              <Heart 
                className={cn(
                  "w-6 h-6 transition-all",
                  isLiked && "fill-primary text-primary scale-110"
                )}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {snippet.likes}
            </span>
          </button>

          <button
            onClick={onSave}
            className="flex flex-col items-center gap-2 transition-transform hover:scale-110"
          >
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center glass transition-colors",
              isSaved && "bg-secondary/30"
            )}>
              <Bookmark 
                className={cn(
                  "w-6 h-6 transition-all",
                  isSaved && "fill-secondary text-secondary scale-110"
                )}
              />
            </div>
            <span className="text-sm text-muted-foreground">Save</span>
          </button>

          <button
            onClick={onShare}
            className="flex flex-col items-center gap-2 transition-transform hover:scale-110"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center glass">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-sm text-muted-foreground">Share</span>
          </button>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio 
        ref={audioRef}
        src={snippet.audio_url}
        loop
        preload="auto"
      />
    </div>
  );
}
