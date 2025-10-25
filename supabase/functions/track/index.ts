import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Event tracking schema
const trackEventSchema = z.object({
  snippet_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  event_type: z.enum([
    'impression',
    'play_start',
    'play_3s',
    'play_15s',
    'complete',
    'replay',
    'like',
    'save',
    'follow',
    'cta_click',
    'skip',
    'share'
  ]),
  ms_played: z.number().optional(),
  session_id: z.string().uuid().optional()
});

// In-memory deduplication cache (per-instance)
const recentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 60000; // 60 seconds

// Clean old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentEvents.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentEvents.delete(key);
    }
  }
}, 300000);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth required
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate input
    const body = await req.json();
    const validatedData = trackEventSchema.parse(body);

    // Deduplication logic
    const dedupKey = `${user.id}:${validatedData.snippet_id}:${validatedData.event_type}`;
    const lastEventTime = recentEvents.get(dedupKey);
    const now = Date.now();

    // Apply deduplication rules
    if (lastEventTime) {
      const timeSinceLast = now - lastEventTime;
      
      // play_start: once per 60s
      if (validatedData.event_type === 'play_start' && timeSinceLast < DEDUP_WINDOW_MS) {
        console.log(`Deduped play_start for user ${user.id}, snippet ${validatedData.snippet_id}`);
        return new Response(JSON.stringify({ ok: true, deduped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // like/save/follow: idempotent, but throttle rapid clicks
      if (['like', 'save', 'follow'].includes(validatedData.event_type) && timeSinceLast < 3000) {
        console.log(`Throttled ${validatedData.event_type} for user ${user.id}`);
        return new Response(JSON.stringify({ ok: true, throttled: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Update dedup cache
    recentEvents.set(dedupKey, now);

    // Insert event
    const { error: insertError } = await supabase
      .from('engagement_events')
      .insert({
        user_id: user.id,
        snippet_id: validatedData.snippet_id,
        event_type: validatedData.event_type,
        variant_id: validatedData.variant_id || null,
        ms_played: validatedData.ms_played || null,
        session_id: validatedData.session_id || null
      });

    if (insertError) {
      console.error('Failed to insert event:', insertError);
      throw insertError;
    }

    console.log(`Tracked ${validatedData.event_type} for user ${user.id}, snippet ${validatedData.snippet_id}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in track function:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: error.errors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
