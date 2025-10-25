import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type EngagementEventType = 
  | 'impression' 
  | 'play_start' 
  | 'play_3s' 
  | 'play_15s' 
  | 'complete' 
  | 'replay' 
  | 'like' 
  | 'share' 
  | 'save' 
  | 'follow'
  | 'cta_click'
  | 'skip';

interface TrackEventOptions {
  variantId?: string;
  msPlayed?: number;
  sessionId?: string;
}

export function useEngagement() {
  // Client-side cooldown to prevent hammering the network
  const cooldownMap = useRef<Map<string, number>>(new Map());
  const COOLDOWN_MS = 3000; // 3 seconds

  const trackEvent = useCallback(async (
    snippetId: string, 
    eventType: EngagementEventType,
    options?: TrackEventOptions
  ) => {
    try {
      // Check cooldown
      const cooldownKey = `${snippetId}:${eventType}`;
      const lastTime = cooldownMap.current.get(cooldownKey);
      const now = Date.now();

      if (lastTime && (now - lastTime) < COOLDOWN_MS) {
        console.log(`Event ${eventType} for ${snippetId} is in cooldown`);
        return;
      }

      // Update cooldown
      cooldownMap.current.set(cooldownKey, now);

      // Clean old cooldowns periodically
      if (cooldownMap.current.size > 100) {
        const cutoff = now - COOLDOWN_MS * 2;
        for (const [key, time] of cooldownMap.current.entries()) {
          if (time < cutoff) {
            cooldownMap.current.delete(key);
          }
        }
      }

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No session found for tracking event');
        return;
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke('track', {
        body: {
          snippet_id: snippetId,
          event_type: eventType,
          variant_id: options?.variantId,
          ms_played: options?.msPlayed,
          session_id: options?.sessionId
        }
      });

      if (error) throw error;

      if (data?.deduped || data?.throttled) {
        console.log(`Event ${eventType} was ${data.deduped ? 'deduped' : 'throttled'} by server`);
      }

    } catch (error) {
      console.error('Error tracking engagement:', error);
    }
  }, []);

  return { trackEvent };
}
