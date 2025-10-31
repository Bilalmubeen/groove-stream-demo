import { useState, useRef, useEffect, useCallback } from "react";
import { Heart, Share2, Bookmark, Play, Pause, Music, ExternalLink, MessageCircle, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEngagement } from "@/hooks/useEngagement";
import { useAudio } from "@/contexts/AudioContext";
import { CommentsSheet } from "@/components/Comments/CommentsSheet";
import { AddToPlaylistDialog } from "@/components/Playlist/AddToPlaylistDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SnippetCardProps {
  snippet: {
    id: string;
    title: string;
    artist_name: string;
    cover_image_url?: string;
    audio_url: string;
    likes: number;
    genre: string;
    cta_type?: string;
    cta_url?: string;
  };
  isActive: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  isLiked: boolean;
  isSaved: boolean;
  isArtist?: boolean;
}

export function SnippetCard({
  snippet,
  isActive,
  onLike,
  onSave,
  onShare,
  isLiked,
  isSaved,
  isArtist = false,
}: SnippetCardProps) {
  const [hasTracked3s, setHasTracked3s] = useState(false);
  const [hasTrackedComplete, setHasTrackedComplete] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { trackEvent } = useEngagement();
  const { play, pause, isPlaying: isAudioPlaying, currentlyPlaying } = useAudio();
  
  const isPlaying = isAudioPlaying(snippet.id);

  // Auto-play when card becomes active and visible
  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && isActive) {
          play(snippet.id, snippet.audio_url);
          trackEvent(snippet.id, 'play_start');
        } else if (currentlyPlaying === snippet.id) {
          pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isActive, snippet.id, snippet.audio_url, currentlyPlaying]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play(snippet.id, snippet.audio_url);
    }
  }, [isPlaying, snippet.id, snippet.audio_url]);

  const handleCTAClick = useCallback(() => {
    if (snippet.cta_url) {
      trackEvent(snippet.id, 'cta_click');
      window.open(snippet.cta_url, '_blank', 'noopener,noreferrer');
    }
  }, [snippet.id, snippet.cta_url]);

  const ctaLabel = {
    'full_track': 'Listen to Full Track',
    'presave': 'Pre-Save',
    'merch': 'Shop Merch',
    'custom': 'Learn More'
  }[snippet.cta_type || 'custom'] || 'Learn More';


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

        {/* CTA Button */}
        {snippet.cta_type && snippet.cta_url && (
          <Button
            onClick={handleCTAClick}
            className="mb-6 gap-2"
            size="lg"
            aria-label={ctaLabel}
          >
            <ExternalLink className="w-4 h-4" />
            {ctaLabel}
          </Button>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-8">
          <button
            onClick={onLike}
            className="flex flex-col items-center gap-2 transition-transform hover:scale-110"
            aria-label={isLiked ? "Unlike" : "Like"}
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

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onSave}
                  className="flex flex-col items-center gap-2 transition-transform hover:scale-110"
                  aria-label={isSaved ? "Remove from favorites" : "Add to favorites"}
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
                  <span className="text-sm text-muted-foreground">Favorite</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add to favorites</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setAddToPlaylistOpen(true)}
                  className="flex flex-col items-center gap-2 transition-transform hover:scale-110"
                  aria-label="Add to playlist"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center glass">
                    <ListPlus className="w-6 h-6" />
                  </div>
                  <span className="text-sm text-muted-foreground">Playlist</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add to playlist</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button
            onClick={() => setCommentsOpen(true)}
            className="flex flex-col items-center gap-2 transition-transform hover:scale-110"
            aria-label="Comments"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center glass">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-sm text-muted-foreground">Comment</span>
          </button>

          <button
            onClick={onShare}
            className="flex flex-col items-center gap-2 transition-transform hover:scale-110"
            aria-label="Share"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center glass">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-sm text-muted-foreground">Share</span>
          </button>
        </div>
      </div>

      <CommentsSheet
        snippetId={snippet.id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        isArtist={isArtist}
      />

      <AddToPlaylistDialog
        open={addToPlaylistOpen}
        onOpenChange={setAddToPlaylistOpen}
        snippetId={snippet.id}
      />
    </div>
  );
}
