import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

export function GlobalUploadCTA() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Don't show if user is not authenticated
  if (!session) {
    return null;
  }

  // Don't show on the upload page itself
  if (location.pathname === '/upload') {
    return null;
  }

  return (
    <>
      {/* Mobile: Floating Action Button (bottom right) */}
      <Button
        variant="gradient"
        size="icon"
        onClick={() => navigate('/profile')}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50",
          "md:hidden",
          "hover:scale-110 active:scale-100"
        )}
        aria-label="Upload new music snippet"
      >
        <Upload className="w-6 h-6" />
      </Button>

      {/* Desktop: Top Nav Button */}
      <Button
        variant="gradient"
        onClick={() => navigate('/profile')}
        className={cn(
          "hidden md:flex fixed top-6 right-6 z-50",
          "hover:scale-105 active:scale-100"
        )}
        aria-label="Upload new music snippet"
      >
        <Upload className="w-4 h-4" />
        Upload Snippet
      </Button>
    </>
  );
}
