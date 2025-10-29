import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Music } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface LikedSnippet {
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

interface LikedSnippetsGridProps {
  userId: string;
  isOwnProfile: boolean;
}

export function LikedSnippetsGrid({ userId, isOwnProfile }: LikedSnippetsGridProps) {
  const navigate = useNavigate();
  const [likedSnippets, setLikedSnippets] = useState<LikedSnippet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLikedSnippets();
  }, [userId]);

  const fetchLikedSnippets = async () => {
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
        .eq('liked', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setLikedSnippets(data || []);
    } catch (error) {
      console.error('Error fetching liked snippets:', error);
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

  if (likedSnippets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Music className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No liked snippets</h3>
        <p className="text-muted-foreground max-w-sm">
          {isOwnProfile
            ? 'Snippets you like will appear here.'
            : "This user hasn't liked any snippets yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {likedSnippets.map((item) => (
        <Card
          key={item.snippet_id}
          className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
          onClick={() => navigate('/')}
        >
          <div className="aspect-square bg-muted flex items-center justify-center">
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
