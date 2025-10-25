import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const querySchema = z.object({
  rail: z.enum(['for_you', 'new_this_week', 'following', 'underground']).optional().default('for_you'),
  limit: z.number().min(1).max(50).optional().default(20),
  genre: z.string().optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rail = url.searchParams.get('rail') || 'for_you';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const genre = url.searchParams.get('genre');

    const validatedQuery = querySchema.parse({ rail, limit, genre });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get auth user if available (for 'following' rail)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const supabaseWithAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseWithAuth.auth.getUser();
      userId = user?.id || null;
    }

    let snippets = [];

    // Calculate trending based on rail
    if (validatedQuery.rail === 'for_you') {
      // Trending algorithm with decay
      const { data, error } = await supabase.rpc('calculate_trending_feed', {
        time_window_hours: 48,
        result_limit: validatedQuery.limit,
        genre_filter: validatedQuery.genre
      });

      if (error) throw error;
      snippets = data || [];

    } else if (validatedQuery.rail === 'new_this_week') {
      // New snippets from last 7 days
      let query = supabase
        .from('snippets')
        .select(`
          id, title, audio_url, cover_image_url, genre, likes, views,
          artist_profiles!inner(artist_name, user_id)
        `)
        .eq('status', 'approved')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(validatedQuery.limit);

      if (validatedQuery.genre) {
        query = query.eq('genre', validatedQuery.genre);
      }

      const { data, error } = await query;
      if (error) throw error;
      snippets = data || [];

    } else if (validatedQuery.rail === 'following') {
      // Snippets from followed artists
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Authentication required for following feed' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // First get followed artist IDs
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('artist_id')
        .eq('follower_id', userId);

      if (followError) throw followError;
      
      const followedArtistIds = followData?.map(f => f.artist_id) || [];

      if (followedArtistIds.length > 0) {
        const { data, error } = await supabase
          .from('snippets')
          .select(`
            id, title, audio_url, cover_image_url, genre, likes, views,
            artist_profiles!inner(artist_name, user_id, id)
          `)
          .eq('status', 'approved')
          .in('artist_id', followedArtistIds)
          .order('created_at', { ascending: false })
          .limit(validatedQuery.limit);

        if (error) throw error;
        snippets = data || [];
      }

    } else if (validatedQuery.rail === 'underground') {
      // Artists with <500 followers or snippets <7 days old
      const { data, error } = await supabase
        .from('snippets')
        .select(`
          id, title, audio_url, cover_image_url, genre, likes, views, created_at,
          artist_profiles!inner(artist_name, user_id, id)
        `)
        .eq('status', 'approved')
        .or(`created_at.gte.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()},views.lt.500`)
        .order('created_at', { ascending: false })
        .limit(validatedQuery.limit);

      if (error) throw error;
      snippets = data || [];
    }

    // Enforce diversity: max 2 snippets per artist in results
    const diverseSnippets = [];
    const artistCounts = new Map<string, number>();

    for (const snippet of snippets) {
      const artistId = snippet.artist_profiles?.id || snippet.artist_profiles?.user_id;
      const count = artistCounts.get(artistId) || 0;
      
      if (count < 2) {
        diverseSnippets.push({
          ...snippet,
          artist_name: snippet.artist_profiles?.artist_name
        });
        artistCounts.set(artistId, count + 1);
      }

      if (diverseSnippets.length >= validatedQuery.limit) break;
    }

    console.log(`Trending ${validatedQuery.rail}: returned ${diverseSnippets.length} snippets`);

    return new Response(JSON.stringify({ 
      snippets: diverseSnippets,
      rail: validatedQuery.rail 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in trending function:', error);
    
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
