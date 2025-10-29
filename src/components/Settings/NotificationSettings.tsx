import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface NotificationSettingsProps {
  userId: string;
}

export default function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    notify_follows: true,
    notify_comments: true,
    notify_likes: true,
    notify_messages: true,
    notify_mentions: true,
    notify_replies: true,
    notify_uploads: true,
    email_notifications: true,
    push_notifications: false,
  });

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('notify_follows, notify_comments, notify_likes, notify_messages, notify_mentions, notify_replies, notify_uploads, email_notifications, push_notifications')
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
        title: 'Notification preferences saved',
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

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
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
          <CardTitle>Activity Notifications</CardTitle>
          <CardDescription>Choose what activity you want to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-follows" className="flex-1">New followers</Label>
            <Switch
              id="notify-follows"
              checked={preferences.notify_follows}
              onCheckedChange={() => togglePreference('notify_follows')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-comments" className="flex-1">Comments on your snippets</Label>
            <Switch
              id="notify-comments"
              checked={preferences.notify_comments}
              onCheckedChange={() => togglePreference('notify_comments')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-likes" className="flex-1">Likes on your snippets</Label>
            <Switch
              id="notify-likes"
              checked={preferences.notify_likes}
              onCheckedChange={() => togglePreference('notify_likes')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-messages" className="flex-1">Direct messages</Label>
            <Switch
              id="notify-messages"
              checked={preferences.notify_messages}
              onCheckedChange={() => togglePreference('notify_messages')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-mentions" className="flex-1">Mentions in comments</Label>
            <Switch
              id="notify-mentions"
              checked={preferences.notify_mentions}
              onCheckedChange={() => togglePreference('notify_mentions')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-replies" className="flex-1">Replies to your comments</Label>
            <Switch
              id="notify-replies"
              checked={preferences.notify_replies}
              onCheckedChange={() => togglePreference('notify_replies')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-uploads" className="flex-1">New uploads from followed artists</Label>
            <Switch
              id="notify-uploads"
              checked={preferences.notify_uploads}
              onCheckedChange={() => togglePreference('notify_uploads')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications" className="flex-1">Email notifications</Label>
            <Switch
              id="email-notifications"
              checked={preferences.email_notifications}
              onCheckedChange={() => togglePreference('email_notifications')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="push-notifications" className="flex-1">Push notifications</Label>
            <Switch
              id="push-notifications"
              checked={preferences.push_notifications}
              onCheckedChange={() => togglePreference('push_notifications')}
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
