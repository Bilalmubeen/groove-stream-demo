import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileHeader } from '@/components/Profile/ProfileHeader';
import { SnippetsGrid } from '@/components/Profile/SnippetsGrid';
import { UploadDialog } from '@/components/Profile/UploadDialog';
import { EditProfileDialog } from '@/components/Profile/EditProfileDialog';
import { Music } from 'lucide-react';

export default function Profile() {
  const { handle } = useParams();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
        // Load profile by handle for /u/:handle route
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', handle)
          .single();

        if (error) throw error;
        setProfileUserId(data.id);
        setIsOwnProfile(data.id === currentUserId);
      } else {
        // /profile route - show current user's profile
        if (!currentUserId) {
          setProfileUserId(null);
          setIsOwnProfile(false);
        } else {
          setProfileUserId(currentUserId);
          setIsOwnProfile(true);
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

  // Redirect to login if trying to access /profile without being logged in
  if (!loading && !handle && !currentUserId) {
    return <Navigate to="/login" replace />;
  }

  // Show 404 if profile not found
  if (!loading && !profileUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Profile not found</h1>
          <p className="text-muted-foreground">The user you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient glow */}
      <div className="relative">
        <div className="absolute inset-0 bg-[var(--gradient-glow)] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-6">
          <ProfileHeader
            userId={profileUserId!}
            isOwnProfile={isOwnProfile}
            onUploadClick={() => setShowUploadDialog(true)}
            onEditClick={() => setShowEditDialog(true)}
          />
        </div>
      </div>

      {/* Tabs Section */}
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
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Music className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No liked snippets</h3>
              <p className="text-muted-foreground max-w-sm">
                {isOwnProfile
                  ? 'Snippets you like will appear here.'
                  : 'This user hasn\'t liked any snippets yet.'}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="playlists" className="mt-6">
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Music className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No playlists yet</h3>
              <p className="text-muted-foreground max-w-sm">
                {isOwnProfile
                  ? 'Create playlists to organize your favorite snippets.'
                  : 'This user hasn\'t created any playlists yet.'}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <UploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={handleUploadSuccess}
      />

      <EditProfileDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        userId={currentUserId!}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
