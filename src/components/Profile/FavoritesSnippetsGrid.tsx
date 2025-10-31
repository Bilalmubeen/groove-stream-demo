import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Music, ListPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FavoritedSnippet {
  snippet_id: string;
  snippets: {
    id: string;
    title: string;
    cover_image_url: string | null;
    artist_id: string;
    artist_profiles: {
      artist_name: string;
    };
  };
}

interface FavoritesSnippetsGridProps {
  userId: string;
  isOwnProfile: boolean;
}

export function FavoritesSnippetsGrid({ userId, isOwnProfile }: FavoritesSnippetsGridProps) {
  const navigate = useNavigate();
  const [favoritedSnippets, setFavoritedSnippets] = useState<FavoritedSnippet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavoritedSnippets();
  }, [userId]);

  const fetchFavoritedSnippets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_snippet_interactions')
        .select(`
          snippet_id,
          snippets!inner (
            id,
            title,
            cover_image_url,
            artist_id,
            artist_profiles!snippets_artist_id_fkey (
              artist_name
            )
          )
        `)
        .eq('user_id', userId)
        .eq('saved', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setFavoritedSnippets(data || []);
    } catch (error) {
      console.error('Error fetching favorited snippets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (favoritedSnippets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Music className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No favorited snippets</h3>
        <p className="text-muted-foreground max-w-sm">
          {isOwnProfile
            ? 'Use the bookmark button to save snippets you want to revisit!'
            : "This user hasn't favorited any snippets yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {favoritedSnippets.map((item) => (
        <Card
          key={item.snippet_id}
          className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden relative"
        >
          <div 
            onClick={() => navigate('/')}
            className="aspect-square bg-muted flex items-center justify-center"
          >
            {item.snippets.cover_image_url ? (
              <img
                src={item.snippets.cover_image_url}
                alt={item.snippets.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-sm truncate">{item.snippets.title}</h3>
            <p className="text-xs text-muted-foreground truncate mt-1">
              {item.snippets.artist_profiles?.artist_name || 'Unknown Artist'}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
