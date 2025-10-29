import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Bell, Lock, Volume2, Palette, ListMusic, BarChart3, Database, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AccountSettings from '@/components/Settings/AccountSettings';
import NotificationSettings from '@/components/Settings/NotificationSettings';
import PrivacySettings from '@/components/Settings/PrivacySettings';
import PlaybackSettings from '@/components/Settings/PlaybackSettings';
import AppearanceSettings from '@/components/Settings/AppearanceSettings';
import ContentSettings from '@/components/Settings/ContentSettings';
import ArtistSettings from '@/components/Settings/ArtistSettings';
import DataSettings from '@/components/Settings/DataSettings';
import AboutSettings from '@/components/Settings/AboutSettings';

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isArtist, setIsArtist] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      setUserId(user.id);

      // Check if user is an artist
      const { data: artistProfile } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      setIsArtist(!!artistProfile);

      // Initialize preferences if they don't exist
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!prefs) {
        await supabase
          .from('user_preferences')
          .insert({ user_id: user.id });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      toast({
        title: 'Error loading settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid grid-cols-3 lg:grid-cols-9 gap-2 h-auto p-2">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="playback" className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">Playback</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <ListMusic className="w-4 h-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
            {isArtist && (
              <TabsTrigger value="artist" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Artist</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">About</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <AccountSettings userId={userId} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings userId={userId} />
          </TabsContent>

          <TabsContent value="privacy">
            <PrivacySettings userId={userId} isArtist={isArtist} />
          </TabsContent>

          <TabsContent value="playback">
            <PlaybackSettings userId={userId} />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceSettings userId={userId} />
          </TabsContent>

          <TabsContent value="content">
            <ContentSettings userId={userId} />
          </TabsContent>

          {isArtist && (
            <TabsContent value="artist">
              <ArtistSettings userId={userId} />
            </TabsContent>
          )}

          <TabsContent value="data">
            <DataSettings userId={userId} />
          </TabsContent>

          <TabsContent value="about">
            <AboutSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
