import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileHeader } from '@/components/Profile/ProfileHeader';
import { SnippetsGrid } from '@/components/Profile/SnippetsGrid';
import { PlaylistsGrid } from '@/components/Profile/PlaylistsGrid';
import { LikedSnippetsGrid } from '@/components/Profile/LikedSnippetsGrid';
import { FavoritesSnippetsGrid } from '@/components/Profile/FavoritesSnippetsGrid';
import { UploadDialog } from '@/components/Profile/UploadDialog';
import { EditProfileDialog } from '@/components/Profile/EditProfileDialog';
import { CreatePlaylistDialog } from '@/components/Profile/CreatePlaylistDialog';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Profile() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreatePlaylistDialog, setShowCreatePlaylistDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isArtist, setIsArtist] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId !== null) {
      loadProfileUser();
    }
  }, [currentUserId, handle]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error('Error loading current user:', error);
      setCurrentUserId(null);
    }
  };

  const loadProfileUser = async () => {
    try {
      setLoading(true);

      if (handle) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', handle)
          .single();

        if (error) throw error;
        setProfileUserId(data.id);
        setIsOwnProfile(data.id === currentUserId);
        
        const { data: artistData } = await supabase
          .from('artist_profiles')
          .select('id')
          .eq('user_id', data.id)
          .maybeSingle();
        setIsArtist(!!artistData);
      } else {
        if (!currentUserId) {
          setProfileUserId(null);
          setIsOwnProfile(false);
        } else {
          setProfileUserId(currentUserId);
          setIsOwnProfile(true);
          
          const { data: artistData } = await supabase
            .from('artist_profiles')
            .select('id')
            .eq('user_id', currentUserId)
            .maybeSingle();
          setIsArtist(!!artistData);
        }
      }
    } catch (error) {
      console.error('Error loading profile user:', error);
      setProfileUserId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleEditSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!loading && !handle && !currentUserId) {
    return <Navigate to="/login" replace />;
  }

  if (!loading && !profileUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Profile not found</h1>
          <p className="text-muted-foreground">The user you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="mb-4 hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <ProfileHeader
            userId={profileUserId!}
            isOwnProfile={isOwnProfile}
            isArtist={isArtist}
            onUploadClick={() => setShowUploadDialog(true)}
            onEditClick={() => setShowEditDialog(true)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="snippets" className="w-full">
          <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0">
            <TabsTrigger
              value="snippets"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Snippets
            </TabsTrigger>
            <TabsTrigger
              value="liked"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Liked
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Favorites
            </TabsTrigger>
            <TabsTrigger
              value="playlists"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Playlists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="snippets" className="mt-6">
            <SnippetsGrid
              key={`snippets-${refreshKey}`}
              userId={profileUserId!}
              isOwnProfile={isOwnProfile}
              onUploadClick={() => setShowUploadDialog(true)}
            />
          </TabsContent>

          <TabsContent value="liked" className="mt-6">
            <LikedSnippetsGrid
              key={`liked-${refreshKey}`}
              userId={profileUserId!}
              isOwnProfile={isOwnProfile}
            />
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            <FavoritesSnippetsGrid
              key={`favorites-${refreshKey}`}
              userId={profileUserId!}
              isOwnProfile={isOwnProfile}
            />
          </TabsContent>

          <TabsContent value="playlists" className="mt-6">
            <PlaylistsGrid
              key={`playlists-${refreshKey}`}
              userId={profileUserId!}
              isOwnProfile={isOwnProfile}
              onCreateClick={() => setShowCreatePlaylistDialog(true)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <UploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={handleUploadSuccess}
      />

      {currentUserId && (
        <EditProfileDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          userId={currentUserId}
          onSuccess={handleEditSuccess}
        />
      )}

      <CreatePlaylistDialog
        open={showCreatePlaylistDialog}
        onOpenChange={setShowCreatePlaylistDialog}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
