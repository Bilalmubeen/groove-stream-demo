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
import { EditProfileDialog } from '@/components/Profile/EditProfileDialog';

export default function Profile() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isArtist, setIsArtist] = useState(false);
  const [activeTab, setActiveTab] = useState('snippets');
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch (error) {
        console.error('Error:', error);
        setCurrentUserId(null);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (currentUserId === null && !handle) {
        setLoading(false);
        return;
      }
      
      try {
        if (handle) {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', handle)
            .maybeSingle();
          if (data) {
            setProfileUserId(data.id);
            checkArtist(data.id);
          } else {
            setProfileUserId(null);
          }
        } else if (currentUserId) {
          setProfileUserId(currentUserId);
          checkArtist(currentUserId);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUserId !== null || handle) {
      loadProfile();
    }
  }, [currentUserId, handle]);

  const checkArtist = async (userId: string) => {
    const { data } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    setIsArtist(!!data);
  };

  const isOwnProfile = currentUserId === profileUserId;

  if (!loading && !handle && !currentUserId) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Profile not found</h1>
          <p className="text-muted-foreground">User doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <ProfileHeader
          userId={profileUserId}
          isOwnProfile={isOwnProfile}
          onUploadClick={() => navigate('/upload')}
          onEditClick={() => setEditProfileOpen(true)}
          isArtist={isArtist}
        />

        <EditProfileDialog
          open={editProfileOpen}
          onOpenChange={setEditProfileOpen}
          userId={profileUserId}
          onSuccess={() => window.location.reload()}
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
              userId={profileUserId}
              isOwnProfile={isOwnProfile}
              onUploadClick={() => navigate('/upload')}
            />
          </TabsContent>

          <TabsContent value="playlists" className="mt-6">
            <PlaylistsGrid
              userId={profileUserId}
              isOwnProfile={isOwnProfile}
              onCreateClick={() => {}}
            />
          </TabsContent>

          <TabsContent value="liked" className="mt-6">
            <LikedSnippetsGrid userId={profileUserId} isOwnProfile={isOwnProfile} />
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            <FavoritesSnippetsGrid userId={profileUserId} isOwnProfile={isOwnProfile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
