import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Music, Plus, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

interface Playlist {
  id: string;
  title: string;
  cover_path: string | null;
}

interface AddToPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippetId: string;
}

export function AddToPlaylistDialog({
  open,
  onOpenChange,
  snippetId,
}: AddToPlaylistDialogProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [addedPlaylists, setAddedPlaylists] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchUserPlaylists();
      checkExistingPlaylistItems();
    }
  }, [open]);

  const fetchUserPlaylists = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('playlists')
        .select('id, title, cover_path')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load playlists',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkExistingPlaylistItems = async () => {
    try {
      const { data, error } = await supabase
        .from('playlist_items')
        .select('playlist_id')
        .eq('snippet_id', snippetId);

      if (error) throw error;
      setAddedPlaylists(new Set(data.map(item => item.playlist_id)));
    } catch (error) {
      console.error('Error checking playlist items:', error);
    }
  };

  const addToPlaylist = async (playlistId: string) => {
    try {
      setAdding(playlistId);

      // Get max position
      const { data: items } = await supabase
        .from('playlist_items')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = items && items.length > 0 ? items[0].position + 1 : 0;

      // Add to playlist
      const { error } = await supabase
        .from('playlist_items')
        .insert({
          playlist_id: playlistId,
          snippet_id: snippetId,
          position: nextPosition,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already in playlist',
            description: 'This snippet is already in the playlist',
          });
        } else {
          throw error;
        }
      } else {
        setAddedPlaylists(prev => new Set([...prev, playlistId]));
        toast({
          title: 'Success',
          description: 'Added to playlist',
        });
      }
    } catch (error) {
      console.error('Error adding to playlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to add to playlist',
        variant: 'destructive',
      });
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
          <DialogDescription>
            Select a playlist to add this snippet to
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Music className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              You don't have any playlists yet
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Create a Playlist
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {playlists.map((playlist) => {
              const isAdded = addedPlaylists.has(playlist.id);
              const isAdding = adding === playlist.id;

              return (
                <Card
                  key={playlist.id}
                  className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => !isAdded && !isAdding && addToPlaylist(playlist.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      {playlist.cover_path ? (
                        <img
                          src={playlist.cover_path}
                          alt={playlist.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Music className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">
                        {playlist.title}
                      </h3>
                    </div>
                    <div className="flex-shrink-0">
                      {isAdding ? (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : isAdded ? (
                        <Check className="w-5 h-5 text-primary" />
                      ) : (
                        <Plus className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
