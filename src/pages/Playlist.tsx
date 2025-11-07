import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Music, Play, Trash2, ListPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CollaboratorsDialog } from '@/components/Playlist/CollaboratorsDialog';
import { PlaylistActivityFeed } from '@/components/Playlist/PlaylistActivityFeed';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PlaylistDetails {
  id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  creator_id: string;
  created_at: string;
  is_collaborative: boolean;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (id && currentUserId) {
      fetchPlaylist();
      fetchPlaylistItems();
      fetchCollaborators();
      checkUserRole();
    }
  }, [id, currentUserId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

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

  const fetchCollaborators = async () => {
    try {
      const { data } = await supabase
        .from('playlist_collaborators')
        .select('*, profiles:user_id(username, avatar_url)')
        .eq('playlist_id', id)
        .limit(5);
      
      setCollaborators(data || []);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const checkUserRole = async () => {
    if (!currentUserId || !id) return;
    
    const { data } = await supabase
      .from('playlist_collaborators')
      .select('role')
      .eq('playlist_id', id)
      .eq('user_id', currentUserId)
      .single();
    
    setUserRole(data?.role || null);
  };

  const removeFromPlaylist = async (snippetId: string) => {
    try {
      setRemovingId(snippetId);
      
      // Find the snippet title for activity log
      const removedItem = items.find(i => i.snippet_id === snippetId);
      
      const { error } = await supabase
        .from('playlist_items')
        .delete()
        .eq('playlist_id', id)
        .eq('snippet_id', snippetId);

      if (error) throw error;

      // Log activity
      if (currentUserId) {
        await supabase.from('playlist_activity').insert({
          playlist_id: id,
          user_id: currentUserId,
          action: 'removed_snippet',
          metadata: { snippet_title: removedItem?.snippet.title }
        });
      }

      toast({
        title: 'Success',
        description: 'Removed from playlist',
      });

      fetchPlaylistItems();
    } catch (error) {
      console.error('Error removing from playlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove from playlist',
        variant: 'destructive',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const isOwner = playlist && currentUserId === playlist.creator_id;
  const canEdit = isOwner || userRole === 'admin' || userRole === 'editor';

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
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-medium">Playlist</p>
                {playlist.is_collaborative && (
                  <Badge variant="secondary">Collaborative</Badge>
                )}
              </div>
              <h1 className="text-5xl font-bold mb-4">{playlist.title}</h1>
              {playlist.description && (
                <p className="text-muted-foreground mb-4">{playlist.description}</p>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {items.length} {items.length === 1 ? 'snippet' : 'snippets'}
                </p>
                
                {/* Collaborator avatars */}
                {collaborators.length > 0 && (
                  <div className="flex -space-x-2">
                    {collaborators.map((collab: any) => (
                      <Avatar key={collab.id} className="h-6 w-6 border-2 border-background">
                        <AvatarImage src={collab.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {collab.profiles?.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
                
                {(isOwner || userRole === 'admin') && (
                  <CollaboratorsDialog playlistId={id!} isOwner={!!isOwner} />
                )}
                
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/')}
                    className="gap-2"
                  >
                    <ListPlus className="w-4 h-4" />
                    Add Snippets
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content - Playlist items */}
          <div className="lg:col-span-2">{items.length === 0 ? (
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
            <div className="space-y-2">{items.map((item, index) => (
              <Card
                key={item.snippet_id}
                className="p-4 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground w-6 text-center">
                    {index + 1}
                  </span>
                  
                  <div 
                    className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0 relative group-hover:bg-primary/20 transition-colors cursor-pointer"
                    onClick={() => navigate('/')}
                  >
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

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/')}>
                    <h3 className="font-semibold truncate">{item.snippet.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.snippet.artist_profiles?.artist_name || 'Unknown Artist'}
                    </p>
                  </div>

                  {canEdit && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromPlaylist(item.snippet_id)}
                            disabled={removingId === item.snippet_id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {removingId === item.snippet_id ? (
                              <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-destructive" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove from playlist</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </Card>
            ))}</div>
          )}</div>

          {/* Sidebar - Activity Feed */}
          {playlist.is_collaborative && (
            <div className="lg:col-span-1">
              <Card className="p-4 sticky top-4">
                <PlaylistActivityFeed playlistId={id!} />
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
