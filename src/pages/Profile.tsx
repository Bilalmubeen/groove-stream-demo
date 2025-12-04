import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileHeader } from '@/components/Profile/ProfileHeader';
import { SnippetsGrid } from '@/components/Profile/SnippetsGrid';
import { PlaylistsGrid } from '@/components/Profile/PlaylistsGrid';
import { LikedSnippetsGrid } from '@/components/Profile/LikedSnippetsGrid';
import { FavoritesSnippetsGrid } from '@/components/Profile/FavoritesSnippetsGrid';
import { UploadDialog } from '@/components/Profile/UploadDialog';
import { EditProfileDialog } from '@/components/Profile/EditProfileDialog';
import { CreatePlaylistDialog } from '@/components/Profile/CreatePlaylistDialog';

export default function Profile() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isArtist, setIsArtist] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('snippets');

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
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setProfileUserId(data.id);
          checkArtistStatus(data.id);
        } else {
          setProfileUserId(null);
        }
      } else {
        if (!currentUserId) {
          setProfileUserId(null);
        } else {
          setProfileUserId(currentUserId);
          checkArtistStatus(currentUserId);
        }
      }
    } catch (error) {
      console.error('Error loading profile user:', error);
      setProfileUserId(null);
    } finally {
      setLoading(false);
    }
  };

  const checkArtistStatus = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      setIsArtist(!!data);
    } catch (error) {
      console.error('Error checking artist status:', error);
    }
  };

  const isOwnProfile = currentUserId === profileUserId;

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
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <ProfileHeader
          userId={profileUserId!}
          isOwnProfile={isOwnProfile}
          onUploadClick={() => setUploadOpen(true)}
          onEditClick={() => setEditOpen(true)}
          isArtist={isArtist}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="snippets">Snippets</TabsTrigger>
            <TabsTrigger value="playlists">Playlists</TabsTrigger>
            <TabsTrigger value="liked">Liked</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>

          <TabsContent value="snippets" className="mt-6">
            <SnippetsGrid
              userId={profileUserId!}
              isOwnProfile={isOwnProfile}
              onUploadClick={() => setUploadOpen(true)}
            />
          </TabsContent>

          <TabsContent value="playlists" className="mt-6">
            <PlaylistsGrid
              userId={profileUserId!}
              isOwnProfile={isOwnProfile}
              onCreateClick={() => setCreatePlaylistOpen(true)}
            />
          </TabsContent>

          <TabsContent value="liked" className="mt-6">
            <LikedSnippetsGrid userId={profileUserId!} isOwnProfile={isOwnProfile} />
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            <FavoritesSnippetsGrid userId={profileUserId!} isOwnProfile={isOwnProfile} />
          </TabsContent>
        </Tabs>
      </div>

      {isOwnProfile && (
        <>
          <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
          <EditProfileDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            userId={profileUserId!}
            onSuccess={() => window.location.reload()}
          />
          <CreatePlaylistDialog
            open={createPlaylistOpen}
            onOpenChange={setCreatePlaylistOpen}
          />
        </>
      )}
    </div>
  );
}
