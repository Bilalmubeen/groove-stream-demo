import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type EngagementEventType = 'play_start' | 'play_3s' | 'play_complete' | 'replay' | 'like' | 'share' | 'save';

export function useEngagement() {
  const trackEvent = useCallback(async (snippetId: string, eventType: EngagementEventType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('engagement_events').insert({
        user_id: user?.id || null,
        snippet_id: snippetId,
        event_type: eventType
      });
    } catch (error) {
      console.error('Error tracking engagement:', error);
    }
  }, []);

  return { trackEvent };
}
