import { useState, useRef, useEffect, useCallback } from "react";
import { Heart, Share2, Bookmark, Play, Pause, Music, ExternalLink, MessageCircle, ListPlus, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEngagement } from "@/hooks/useEngagement";
import { useAudio } from "@/contexts/AudioContext";
import { CommentsSheet } from "@/components/Comments/CommentsSheet";
import { AddToPlaylistDialog } from "@/components/Playlist/AddToPlaylistDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSwipeable } from "react-swipeable";
import { LiteYouTubeEmbed } from "@/components/YouTube/LiteYouTubeEmbed";

interface SnippetCardProps {
  snippet: {
    id: string;
    title: string;
    artist_name: string;
    cover_image_url?: string;
    audio_url?: string;
    likes: number;
    genre: string;
    cta_type?: string;
    cta_url?: string;
    media_type?: 'audio' | 'youtube';
    youtube_video_id?: string;
    youtube_start_seconds?: number;
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
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { trackEvent } = useEngagement();
  const { play, pause, isPlaying: isAudioPlaying, currentlyPlaying, userHasInteracted, progress, currentTime, duration } = useAudio();
  const isMobile = useIsMobile();
  
  const isYouTube = snippet.media_type === 'youtube';
  const isPlaying = !isYouTube && isAudioPlaying(snippet.id);
  const showProgress = currentlyPlaying === snippet.id;

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Store callbacks in refs to avoid recreating observer
  const playRef = useRef(play);
  const pauseRef = useRef(pause);
  const trackEventRef = useRef(trackEvent);
  const currentlyPlayingRef = useRef(currentlyPlaying);
  const userHasInteractedRef = useRef(userHasInteracted);
  
  useEffect(() => {
    playRef.current = play;
    pauseRef.current = pause;
    trackEventRef.current = trackEvent;
    currentlyPlayingRef.current = currentlyPlaying;
    userHasInteractedRef.current = userHasInteracted;
  });

  const swipeHandlers = useSwipeable({
    onSwipedUp: () => {
      if (isMobile && cardRef.current) {
        cardRef.current.parentElement?.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
      }
    },
    onSwipedDown: () => {
      if (isMobile && cardRef.current) {
        cardRef.current.parentElement?.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
      }
    },
    trackMouse: false,
    trackTouch: true,
  });

  useEffect(() => {
    console.log('[SnippetCard] useEffect for observer running', { 
      snippetId: snippet.id, 
      hasCardRef: !!cardRef.current, 
      isYouTube, 
      audioUrl: snippet.audio_url 
    });
    
    if (!cardRef.current || isYouTube) {
      console.log('[SnippetCard] Skipping observer - no card ref or is YouTube');
      return;
    }

    const card = cardRef.current;
    let hasPlayed = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const ratio = entry.intersectionRatio;
        
        // Only trigger play when card is mostly visible (>50%)
        if (ratio >= 0.5 && snippet.audio_url && !hasPlayed && userHasInteractedRef.current) {
          const nothingPlaying = !currentlyPlayingRef.current;
          if (nothingPlaying) {
            console.log('[SnippetCard] Auto-playing', snippet.id);
            hasPlayed = true;
            playRef.current(snippet.id, snippet.audio_url!);
            trackEventRef.current(snippet.id, 'play_start');
          }
        }
        
        // Only pause when card is completely out of view (ratio = 0) AND this snippet is playing
        if (ratio === 0 && currentlyPlayingRef.current === snippet.id) {
          console.log('[SnippetCard] Card scrolled away, pausing', snippet.id);
          hasPlayed = false;
          pauseRef.current(true); // Force pause when scrolled away
        }
      },
      { 
        threshold: [0, 0.5], // Simplified: only care about visible/not-visible and >50%
        rootMargin: '-80px 0px 0px 0px'
      }
    );

    observer.observe(card);
    console.log('[SnippetCard] Observer attached for', snippet.id);
    return () => {
      console.log('[SnippetCard] Observer disconnected for', snippet.id);
      observer.disconnect();
    };
  }, [snippet.id, snippet.audio_url, isYouTube]);

  const togglePlayPause = useCallback(() => {
    console.log('[SnippetCard] togglePlayPause clicked', {
      snippetId: snippet.id,
      isYouTube,
      audioUrl: snippet.audio_url,
      isPlaying,
      currentlyPlaying
    });
    if (isYouTube || !snippet.audio_url) {
      console.log('[SnippetCard] Skipping - isYouTube or no audio_url');
      return;
    }
    if (isPlaying) {
      console.log('[SnippetCard] Pausing...');
      pause();
    } else {
      console.log('[SnippetCard] Playing...');
      play(snippet.id, snippet.audio_url);
    }
  }, [isPlaying, snippet.id, snippet.audio_url, isYouTube, currentlyPlaying, play, pause]);

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
      {...swipeHandlers}
      ref={cardRef}
      className="relative h-screen w-full snap-start snap-always flex items-center justify-center bg-gradient-to-br from-background via-card to-background"
    >
      <div className="absolute inset-0 opacity-20" style={{ background: "var(--gradient-glow)" }} />
      {snippet.cover_image_url && (
        <div className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30" style={{ backgroundImage: `url(${snippet.cover_image_url})` }} />
      )}

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 md:px-6 flex flex-col items-center">
        <div className="relative mb-6 md:mb-8">
          {isYouTube && snippet.youtube_video_id ? (
            <div className={cn("rounded-3xl overflow-hidden shadow-2xl", isMobile ? "w-80" : "w-[480px]")}>
              <LiteYouTubeEmbed
                videoId={snippet.youtube_video_id}
                startSeconds={snippet.youtube_start_seconds || 0}
              />
            </div>
          ) : (
            <div className={cn("rounded-3xl overflow-hidden shadow-2xl animate-pulse-glow", isMobile ? "w-64 h-64" : "w-80 h-80")}>
              {snippet.cover_image_url ? (
                <img src={snippet.cover_image_url} alt={snippet.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Music className="w-32 h-32 text-primary-foreground opacity-50" />
                </div>
              )}
            </div>
          )}
          {!isYouTube && snippet.audio_url && (
            <Button onClick={togglePlayPause} size={isMobile ? "default" : "lg"} className={cn("absolute rounded-full bg-primary/90 hover:bg-primary shadow-xl", isMobile ? "bottom-3 right-3 w-12 h-12" : "bottom-4 right-4 w-16 h-16")}>
              {isPlaying ? <Pause className={isMobile ? "w-5 h-5" : "w-8 h-8"} /> : <Play className={cn(isMobile ? "w-5 h-5 ml-0.5" : "w-8 h-8 ml-1")} />}
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {!isYouTube && snippet.audio_url && showProgress && (
          <div className={cn("w-full mb-4", isMobile ? "max-w-[16rem]" : "max-w-[20rem]")}>
            <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        <div className="text-center mb-6 md:mb-8 space-y-2">
          <h2 className={cn("font-bold text-foreground", isMobile ? "text-2xl" : "text-3xl")}>{snippet.title}</h2>
          <p className={cn("text-muted-foreground", isMobile ? "text-lg" : "text-xl")}>{snippet.artist_name}</p>
          <span className={cn("inline-block px-3 md:px-4 py-1 rounded-full bg-primary/20 text-primary font-medium", isMobile ? "text-xs" : "text-sm")}>{snippet.genre}</span>
        </div>

        {snippet.cta_type && snippet.cta_url && (
          <Button onClick={handleCTAClick} className="mb-6 gap-2" size="lg" aria-label={ctaLabel}>
            <ExternalLink className="w-4 h-4" />{ctaLabel}
          </Button>
        )}

        <div className={cn("flex items-center", isMobile ? "gap-4" : "gap-8")}>
          <button onClick={onLike} className="flex flex-col items-center gap-1 md:gap-2 transition-transform active:scale-95 md:hover:scale-110" aria-label={isLiked ? "Unlike" : "Like"}>
            <div className={cn("rounded-full flex items-center justify-center glass transition-colors", isMobile ? "w-12 h-12" : "w-14 h-14", isLiked && "bg-primary/30")}>
              <Heart className={cn("transition-all", isMobile ? "w-5 h-5" : "w-6 h-6", isLiked && "fill-primary text-primary scale-110")} />
            </div>
            <span className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>{snippet.likes}</span>
          </button>
          <button onClick={onSave} className="flex flex-col items-center gap-1 md:gap-2 transition-transform active:scale-95 md:hover:scale-110" aria-label={isSaved ? "Remove from favorites" : "Add to favorites"}>
            <div className={cn("rounded-full flex items-center justify-center glass transition-colors", isMobile ? "w-12 h-12" : "w-14 h-14", isSaved && "bg-secondary/30")}>
              <Bookmark className={cn("transition-all", isMobile ? "w-5 h-5" : "w-6 h-6", isSaved && "fill-secondary text-secondary scale-110")} />
            </div>
            <span className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-sm")}>{isMobile ? "Fav" : "Favorite"}</span>
          </button>
          <button onClick={() => setAddToPlaylistOpen(true)} className="flex flex-col items-center gap-1 md:gap-2 transition-transform active:scale-95 md:hover:scale-110" aria-label="Add to playlist">
            <div className={cn("rounded-full flex items-center justify-center glass", isMobile ? "w-12 h-12" : "w-14 h-14")}><ListPlus className={isMobile ? "w-5 h-5" : "w-6 h-6"} /></div>
            <span className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-sm")}>Playlist</span>
          </button>
          <button onClick={() => setCommentsOpen(true)} className="flex flex-col items-center gap-1 md:gap-2 transition-transform active:scale-95 md:hover:scale-110" aria-label="Comments">
            <div className={cn("rounded-full flex items-center justify-center glass", isMobile ? "w-12 h-12" : "w-14 h-14")}><MessageCircle className={isMobile ? "w-5 h-5" : "w-6 h-6"} /></div>
            <span className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-sm")}>Comment</span>
          </button>
          <button onClick={onShare} className="flex flex-col items-center gap-1 md:gap-2 transition-transform active:scale-95 md:hover:scale-110" aria-label="Share">
            <div className={cn("rounded-full flex items-center justify-center glass", isMobile ? "w-12 h-12" : "w-14 h-14")}><Share2 className={isMobile ? "w-5 h-5" : "w-6 h-6"} /></div>
            <span className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-sm")}>Share</span>
          </button>
        </div>
      </div>

      <CommentsSheet snippetId={snippet.id} isOpen={commentsOpen} onClose={() => setCommentsOpen(false)} isArtist={isArtist} />
      <AddToPlaylistDialog open={addToPlaylistOpen} onOpenChange={setAddToPlaylistOpen} snippetId={snippet.id} />
    </div>
  );
}