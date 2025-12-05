import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Play, Heart, Eye, Upload, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudio } from '@/contexts/AudioContext';

interface Snippet {
  id: string;
  title: string;
  cover_image_url: string | null;
  audio_url: string;
  duration: number;
  likes: number;
  views: number;
  status: string;
}

interface SnippetsGridProps {
  userId: string;
  isOwnProfile: boolean;
  onUploadClick?: () => void;
}

export function SnippetsGrid({ userId, isOwnProfile, onUploadClick }: SnippetsGridProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const { play, pause, isPlaying } = useAudio();

  useEffect(() => {
    loadSnippets();
  }, [userId]);

  const loadSnippets = async () => {
    try {
      setLoading(true);
      
      // Get artist profile first
      const { data: artistProfile } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!artistProfile) {
        setSnippets([]);
        return;
      }

      const { data, error } = await supabase
        .from('snippets')
        .select('id, title, cover_image_url, audio_url, duration, likes, views, status')
        .eq('artist_id', artistProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSnippets(data || []);
    } catch (error) {
      console.error('Error loading snippets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = (snippet: Snippet) => {
    if (isPlaying(snippet.id)) {
      pause();
    } else {
      play(snippet.id, snippet.audio_url);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (snippets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Upload className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {isOwnProfile ? 'No snippets yet' : 'No snippets to show'}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          {isOwnProfile
            ? 'Upload your first 30-second music snippet to share with the world.'
            : 'This user hasn\'t uploaded any snippets yet.'}
        </p>
        {isOwnProfile && onUploadClick && (
          <Button variant="gradient" onClick={onUploadClick}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Your First Snippet
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {snippets.map((snippet) => (
        <Card
          key={snippet.id}
          className="group relative aspect-square overflow-hidden cursor-pointer hover:scale-105 transition-smooth border-2 border-transparent hover:border-primary/50"
          onClick={() => handlePlayPause(snippet)}
        >
          {/* Cover Image */}
          <div className="absolute inset-0">
            {snippet.cover_image_url ? (
              <img
                src={snippet.cover_image_url}
                alt={snippet.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Music className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-smooth" />

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-smooth">
            <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center">
              {isPlaying(snippet.id) ? (
                <div className="w-4 h-4 border-2 border-primary-foreground" />
              ) : (
                <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
              )}
            </div>
          </div>

          {/* Duration Badge */}
          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium">
            0:{snippet.duration < 10 ? '0' : ''}{snippet.duration}
          </div>

          {/* Stats */}
          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
            <p className="text-sm font-medium line-clamp-1 text-foreground group-hover:text-primary transition-smooth">
              {snippet.title}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {snippet.likes}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {snippet.views}
              </span>
            </div>
          </div>

          {/* Pending Status Badge */}
          {snippet.status !== 'approved' && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-muted/90 backdrop-blur-sm text-xs font-medium">
              {snippet.status === 'pending' ? 'Pending' : 'Rejected'}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
