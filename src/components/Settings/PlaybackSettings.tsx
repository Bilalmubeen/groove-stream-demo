import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PlaybackSettingsProps {
  userId: string;
}

export default function PlaybackSettings({ userId }: PlaybackSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    autoplay: true,
    audio_quality: 'high',
    default_volume: 80,
  });

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('autoplay, audio_quality, default_volume')
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
        title: 'Playback settings saved',
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
          <CardTitle>Audio Settings</CardTitle>
          <CardDescription>Customize your listening experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="autoplay">Autoplay next snippet</Label>
              <p className="text-sm text-muted-foreground">Automatically play the next snippet in feed</p>
            </div>
            <Switch
              id="autoplay"
              checked={preferences.autoplay}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, autoplay: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audio-quality">Audio Quality</Label>
            <Select
              value={preferences.audio_quality}
              onValueChange={(value) => setPreferences(prev => ({ ...prev, audio_quality: value }))}
            >
              <SelectTrigger id="audio-quality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - 96 kbps</SelectItem>
                <SelectItem value="medium">Medium - 160 kbps</SelectItem>
                <SelectItem value="high">High - 320 kbps</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Higher quality uses more data</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-volume">Default Volume: {preferences.default_volume}%</Label>
            <Slider
              id="default-volume"
              min={0}
              max={100}
              step={5}
              value={[preferences.default_volume]}
              onValueChange={([value]) => setPreferences(prev => ({ ...prev, default_volume: value }))}
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
