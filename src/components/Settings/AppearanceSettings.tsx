import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';

interface AppearanceSettingsProps {
  userId: string;
}

export default function AppearanceSettings({ userId }: AppearanceSettingsProps) {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    show_animations: true,
    compact_mode: false,
  });

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('show_animations, compact_mode')
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
        .update({
          ...preferences,
          theme: theme || 'dark',
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Appearance settings saved',
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
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>Customize how BeatSeek looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="show-animations">Show animations</Label>
              <p className="text-sm text-muted-foreground">Enable smooth transitions and effects</p>
            </div>
            <Switch
              id="show-animations"
              checked={preferences.show_animations}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, show_animations: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="compact-mode">Compact mode</Label>
              <p className="text-sm text-muted-foreground">Show more content with reduced spacing</p>
            </div>
            <Switch
              id="compact-mode"
              checked={preferences.compact_mode}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, compact_mode: checked }))}
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
