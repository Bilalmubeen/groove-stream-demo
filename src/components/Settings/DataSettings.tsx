import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Download, Trash2 } from 'lucide-react';

interface DataSettingsProps {
  userId: string;
}

export default function DataSettings({ userId }: DataSettingsProps) {
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      // Fetch all user data
      const [profileRes, snippetsRes, playlistsRes, commentsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('snippets').select('*').eq('artist_id', userId),
        supabase.from('playlists').select('*').eq('creator_id', userId),
        supabase.from('comments').select('*').eq('user_id', userId),
      ]);

      const userData = {
        profile: profileRes.data,
        snippets: snippetsRes.data,
        playlists: playlistsRes.data,
        comments: commentsRes.data,
        exportedAt: new Date().toISOString(),
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beatseek-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Data exported successfully',
        description: 'Your data has been downloaded',
      });
    } catch (error: any) {
      toast({
        title: 'Error exporting data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      // Clear browser cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear local storage (except auth)
      const authKeys = Object.keys(localStorage).filter(key => key.includes('supabase'));
      localStorage.clear();
      authKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) localStorage.setItem(key, value);
      });

      toast({
        title: 'Cache cleared successfully',
        description: 'Please refresh the page',
      });
    } catch (error: any) {
      toast({
        title: 'Error clearing cache',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Your Data</CardTitle>
          <CardDescription>
            Download a copy of your BeatSeek data including profile, snippets, playlists, and comments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportData} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clear Cache</CardTitle>
          <CardDescription>
            Clear cached data to free up storage space. You'll remain signed in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleClearCache} disabled={clearing}>
            <Trash2 className="w-4 h-4 mr-2" />
            {clearing ? 'Clearing...' : 'Clear Cache'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
