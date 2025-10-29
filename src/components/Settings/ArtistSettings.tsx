import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ArtistSettingsProps {
  userId: string;
}

export default function ArtistSettings({ userId }: ArtistSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    show_analytics: true,
    auto_publish: false,
  });

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('show_analytics, auto_publish')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (data) setPreferences(data);
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

      toast({
        title: 'Artist settings saved',
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
          <CardTitle>Creator Tools</CardTitle>
          <CardDescription>Manage your artist account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="show-analytics">Show analytics on profile</Label>
              <p className="text-sm text-muted-foreground">Display performance metrics to visitors</p>
            </div>
            <Switch
              id="show-analytics"
              checked={preferences.show_analytics}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, show_analytics: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="auto-publish">Auto-publish uploads</Label>
              <p className="text-sm text-muted-foreground">Skip moderation queue (requires verification)</p>
            </div>
            <Switch
              id="auto-publish"
              checked={preferences.auto_publish}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, auto_publish: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}
