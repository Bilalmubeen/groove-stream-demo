import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiteYouTubeEmbedProps {
  videoId: string;
  startSeconds?: number;
  className?: string;
}

export function LiteYouTubeEmbed({ videoId, startSeconds = 0, className }: LiteYouTubeEmbedProps) {
  const [showVideo, setShowVideo] = useState(false);
  
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${startSeconds}&rel=0&modestbranding=1`;

  if (showVideo) {
    return (
      <div className={cn("relative aspect-video bg-black", className)}>
        <iframe
          src={embedUrl}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowVideo(true)}
      className={cn("relative aspect-video bg-black cursor-pointer group overflow-hidden w-full", className)}
      aria-label="Play YouTube video"
    >
      <img
        src={thumbnailUrl}
        alt="Video thumbnail"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-xl transition-transform group-hover:scale-110">
          <Play className="w-8 h-8 text-primary-foreground ml-1" />
        </div>
      </div>
      <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">
        30s Preview
      </div>
    </button>
  );
}
