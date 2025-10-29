import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Music, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  created_at: string;
}

interface PlaylistsGridProps {
  userId: string;
  isOwnProfile: boolean;
  onCreateClick: () => void;
}

export function PlaylistsGrid({ userId, isOwnProfile, onCreateClick }: PlaylistsGridProps) {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaylists();
  }, [userId]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('playlists')
        .select('id, title, description, cover_path, created_at')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
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

  if (playlists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Music className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No playlists yet</h3>
        <p className="text-muted-foreground max-w-sm mb-6">
          {isOwnProfile
            ? 'Create playlists to organize your favorite snippets.'
            : "This user hasn't created any playlists yet."}
        </p>
        {isOwnProfile && (
          <Button onClick={onCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            Create Playlist
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      {isOwnProfile && (
        <div className="mb-6 flex justify-end">
          <Button onClick={onCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            Create Playlist
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {playlists.map((playlist) => (
          <Card
            key={playlist.id}
            className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
            onClick={() => navigate(`/playlist/${playlist.id}`)}
          >
            <div className="aspect-square bg-muted flex items-center justify-center">
              {playlist.cover_path ? (
                <img
                  src={playlist.cover_path}
                  alt={playlist.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm truncate">{playlist.title}</h3>
              {playlist.description && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {playlist.description}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
