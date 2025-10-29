import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Music, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface PlaylistDetails {
  id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  creator_id: string;
  created_at: string;
}

interface PlaylistItem {
  snippet_id: string;
  position: number;
  snippet: {
    id: string;
    title: string;
    cover_image_url: string | null;
    artist_id: string;
    artist_profiles: {
      artist_name: string;
    };
  };
}

export default function Playlist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPlaylist();
      fetchPlaylistItems();
    }
  }, [id]);

  const fetchPlaylist = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPlaylist(data);
    } catch (error) {
      console.error('Error fetching playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylistItems = async () => {
    try {
      const { data, error } = await supabase
        .from('playlist_items')
        .select(`
          snippet_id,
          position,
          snippet:snippets (
            id,
            title,
            cover_image_url,
            artist_id,
            artist_profiles!snippets_artist_id_fkey (
              artist_name
            )
          )
        `)
        .eq('playlist_id', id)
        .order('position', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching playlist items:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Playlist not found</h1>
          <p className="text-muted-foreground">The playlist you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative bg-gradient-to-b from-primary/20 to-background">
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-6 items-end">
            {/* Cover Image */}
            <div className="w-48 h-48 rounded-lg bg-muted flex items-center justify-center shadow-xl flex-shrink-0">
              {playlist.cover_path ? (
                <img
                  src={playlist.cover_path}
                  alt={playlist.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Music className="w-20 h-20 text-muted-foreground" />
              )}
            </div>

            {/* Playlist Info */}
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium mb-2">Playlist</p>
              <h1 className="text-5xl font-bold mb-4">{playlist.title}</h1>
              {playlist.description && (
                <p className="text-muted-foreground mb-4">{playlist.description}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? 'snippet' : 'snippets'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist Items */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Music className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No snippets in this playlist</h3>
            <p className="text-muted-foreground max-w-sm">
              Add snippets to start building your playlist.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <Card
                key={item.snippet_id}
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground w-6 text-center">
                    {index + 1}
                  </span>
                  
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0 relative group-hover:bg-primary/20 transition-colors">
                    {item.snippet.cover_image_url ? (
                      <>
                        <img
                          src={item.snippet.cover_image_url}
                          alt={item.snippet.title}
                          className="w-full h-full object-cover rounded"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-5 h-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <Music className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{item.snippet.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.snippet.artist_profiles?.artist_name || 'Unknown Artist'}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
