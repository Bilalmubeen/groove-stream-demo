import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Profile() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', handle)
          .single();

        if (error) throw error;
        setProfileUserId(data.id);
      } else {
        if (!currentUserId) {
          setProfileUserId(null);
        } else {
          setProfileUserId(currentUserId);
        }
      }
    } catch (error) {
      console.error('Error loading profile user:', error);
      setProfileUserId(null);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && !handle && !currentUserId) {
    return <Navigate to="/login" replace />;
  }

  if (!loading && !profileUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Profile not found</h1>
          <p className="text-muted-foreground">The user you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      <h1 className="text-2xl font-bold">Profile Page</h1>
      <p className="text-muted-foreground">User ID: {profileUserId}</p>
    </div>
  );
}
