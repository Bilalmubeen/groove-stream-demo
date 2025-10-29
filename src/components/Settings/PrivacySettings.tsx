import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PrivacySettingsProps {
  userId: string;
  isArtist: boolean;
}

export default function PrivacySettings({ userId, isArtist }: PrivacySettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    profile_visibility: 'public',
    show_liked_snippets: true,
    show_playlists: true,
    allow_messages_from: 'everyone',
  });
  const [dmsOpen, setDmsOpen] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('profile_visibility, show_liked_snippets, show_playlists, allow_messages_from')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (data) setPreferences(data);

      // Load artist DM settings if applicable
      if (isArtist) {
        const { data: artistData } = await supabase
          .from('artist_profiles')
          .select('dms_open')
          .eq('user_id', userId)
          .single();

        if (artistData) setDmsOpen(artistData.dms_open);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .update(preferences)
        .eq('user_id', userId);

      if (error) throw error;

      // Update artist DM settings
      if (isArtist) {
        const { error: artistError } = await supabase
          .from('artist_profiles')
          .update({ dms_open: dmsOpen })
          .eq('user_id', userId);

        if (artistError) throw artistError;
      }

      toast({
        title: 'Privacy settings saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Privacy</CardTitle>
          <CardDescription>Control who can see your profile and content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-visibility">Profile Visibility</Label>
            <Select
              value={preferences.profile_visibility}
              onValueChange={(value) => setPreferences(prev => ({ ...prev, profile_visibility: value }))}
            >
              <SelectTrigger id="profile-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Anyone can view</SelectItem>
                <SelectItem value="followers">Followers Only</SelectItem>
                <SelectItem value="private">Private - Only you</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-liked" className="flex-1">Show liked snippets on profile</Label>
            <Switch
              id="show-liked"
              checked={preferences.show_liked_snippets}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, show_liked_snippets: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-playlists" className="flex-1">Show playlists on profile</Label>
            <Switch
              id="show-playlists"
              checked={preferences.show_playlists}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, show_playlists: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Control who can send you direct messages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="messages-from">Allow messages from</Label>
            <Select
              value={preferences.allow_messages_from}
              onValueChange={(value) => setPreferences(prev => ({ ...prev, allow_messages_from: value }))}
            >
              <SelectTrigger id="messages-from">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="followers">Followers Only</SelectItem>
                <SelectItem value="none">No One</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isArtist && (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="dms-open">Accept DMs from fans</Label>
                <p className="text-sm text-muted-foreground">Allow fans to message you directly</p>
              </div>
              <Switch
                id="dms-open"
                checked={dmsOpen}
                onCheckedChange={setDmsOpen}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}
