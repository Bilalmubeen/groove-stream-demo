import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface ContentSettingsProps {
  userId: string;
}

const AVAILABLE_GENRES = [
  'hip_hop', 'pop', 'rock', 'electronic', 'r_and_b', 'indie', 'jazz', 'classical', 
  'country', 'latin', 'afrobeats', 'k_pop', 'metal', 'punk', 'reggae', 'blues'
];

export default function ContentSettings({ userId }: ContentSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    preferred_genres: [] as string[],
    show_explicit: true,
  });

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferred_genres, show_explicit')
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
        title: 'Content preferences saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving preferences',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_genres: prev.preferred_genres.includes(genre)
        ? prev.preferred_genres.filter(g => g !== genre)
        : [...prev.preferred_genres, genre]
    }));
  };

  const formatGenre = (genre: string) => {
    return genre.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
          <CardTitle>Preferred Genres</CardTitle>
          <CardDescription>Select genres you want to see more of in your feed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_GENRES.map(genre => (
              <Badge
                key={genre}
                variant={preferences.preferred_genres.includes(genre) ? 'default' : 'outline'}
                className="cursor-pointer hover:scale-105 transition-smooth"
                onClick={() => toggleGenre(genre)}
              >
                {formatGenre(genre)}
                {preferences.preferred_genres.includes(genre) && (
                  <X className="w-3 h-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Filters</CardTitle>
          <CardDescription>Control what type of content you see</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="show-explicit">Show explicit content</Label>
              <p className="text-sm text-muted-foreground">Display snippets marked as explicit</p>
            </div>
            <Switch
              id="show-explicit"
              checked={preferences.show_explicit}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, show_explicit: checked }))}
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
