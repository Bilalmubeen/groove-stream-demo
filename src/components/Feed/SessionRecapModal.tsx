import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Bookmark, Music, TrendingUp } from "lucide-react";

interface SessionRecapModalProps {
  open: boolean;
  onClose: () => void;
  stats: {
    playsCount: number;
    likesCount: number;
    savesCount: number;
    uniqueArtists: number;
  };
}

export function SessionRecapModal({ open, onClose, stats }: SessionRecapModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">Your Session Recap</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-lg p-4 text-center space-y-2">
              <Music className="w-8 h-8 mx-auto text-primary" />
              <div className="text-3xl font-bold">{stats.playsCount}</div>
              <div className="text-sm text-muted-foreground">Tracks Played</div>
            </div>

            <div className="glass rounded-lg p-4 text-center space-y-2">
              <Heart className="w-8 h-8 mx-auto text-primary" />
              <div className="text-3xl font-bold">{stats.likesCount}</div>
              <div className="text-sm text-muted-foreground">Liked</div>
            </div>

            <div className="glass rounded-lg p-4 text-center space-y-2">
              <Bookmark className="w-8 h-8 mx-auto text-secondary" />
              <div className="text-3xl font-bold">{stats.savesCount}</div>
              <div className="text-sm text-muted-foreground">Saved</div>
            </div>

            <div className="glass rounded-lg p-4 text-center space-y-2">
              <TrendingUp className="w-8 h-8 mx-auto text-accent" />
              <div className="text-3xl font-bold">{stats.uniqueArtists}</div>
              <div className="text-sm text-muted-foreground">New Artists</div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Great session! You discovered some amazing music.
            </p>
          </div>

          <Button onClick={onClose} className="w-full" size="lg">
            Continue Listening
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
