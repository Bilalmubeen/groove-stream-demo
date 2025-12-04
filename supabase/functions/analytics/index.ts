import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();
    const body = req.method === 'POST' ? await req.json() : {};

    // Get artist profile
    const { data: artistProfile } = await supabaseClient
      .from('artist_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!artistProfile) {
      return new Response(JSON.stringify({ error: 'Artist profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;

    switch (endpoint) {
      case 'overview':
        result = await getOverview(supabaseClient, artistProfile.id, body);
        break;
      case 'snippet':
        result = await getSnippetAnalytics(supabaseClient, body.snippet_id, artistProfile.id);
        break;
      case 'compare':
        result = await compareSnippets(supabaseClient, body.snippet_ids, artistProfile.id);
        break;
      case 'export':
        result = await exportData(supabaseClient, artistProfile.id, body);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getOverview(supabase: any, artistId: string, params: any) {
  const days = params.days || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Get total metrics from materialized view
  const { data: dailyMetrics } = await supabase
    .from('mv_artist_metrics_daily')
    .select('*')
    .eq('artist_id', artistId)
    .gte('metric_date', cutoff.toISOString())
    .order('metric_date', { ascending: true });

  // Calculate totals with default values
  const defaultTotals = {
    impressions: 0,
    plays: 0,
    retention_3s: 0,
    retention_15s: 0,
    completions: 0,
    likes: 0,
    shares: 0,
    saves: 0,
    unique_listeners: 0,
  };

  const totals = (dailyMetrics && dailyMetrics.length > 0) 
    ? dailyMetrics.reduce((acc: any, day: any) => ({
        impressions: acc.impressions + (day.impressions || 0),
        plays: acc.plays + (day.plays || 0),
        retention_3s: acc.retention_3s + (day.retention_3s || 0),
        retention_15s: acc.retention_15s + (day.retention_15s || 0),
        completions: acc.completions + (day.completions || 0),
        likes: acc.likes + (day.likes || 0),
        shares: acc.shares + (day.shares || 0),
        saves: acc.saves + (day.saves || 0),
        unique_listeners: acc.unique_listeners + (day.unique_listeners || 0),
      }), defaultTotals)
    : defaultTotals;

  // Get top snippets
  const { data: snippets } = await supabase
    .from('snippets')
    .select('id, title, audio_url, cover_image_url, created_at, mv_snippet_metrics(*)')
    .eq('artist_id', artistId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10);

  // Get follower growth
  const { data: followerGrowth } = await supabase
    .from('follows')
    .select('created_at')
    .eq('following_id', artistId)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: true });

  // Calculate completion rate
  const completionRate = totals.plays > 0 
    ? (totals.completions / totals.plays * 100).toFixed(2)
    : 0;

  return {
    totals: {
      ...totals,
      completion_rate: completionRate,
    },
    timeline: dailyMetrics || [],
    top_snippets: snippets || [],
    follower_growth: followerGrowth || [],
  };
}

async function getSnippetAnalytics(supabase: any, snippetId: string, artistId: string) {
  // Verify ownership
  const { data: snippet } = await supabase
    .from('snippets')
    .select('*, artist_profiles!inner(user_id)')
    .eq('id', snippetId)
    .eq('artist_id', artistId)
    .single();

  if (!snippet) {
    throw new Error('Snippet not found or unauthorized');
  }

  // Get engagement funnel
  const { data: events } = await supabase
    .from('engagement_events')
    .select('event_type, created_at, ms_played, user_id')
    .eq('snippet_id', snippetId)
    .order('created_at', { ascending: true });

  const funnel = {
    impressions: events?.filter((e: any) => e.event_type === 'impression').length || 0,
    play_starts: events?.filter((e: any) => e.event_type === 'play_start').length || 0,
    retention_3s: events?.filter((e: any) => e.event_type === 'play_3s').length || 0,
    retention_15s: events?.filter((e: any) => e.event_type === 'play_15s').length || 0,
    completions: events?.filter((e: any) => e.event_type === 'complete').length || 0,
    likes: events?.filter((e: any) => e.event_type === 'like').length || 0,
    shares: events?.filter((e: any) => e.event_type === 'share').length || 0,
    replays: events?.filter((e: any) => e.event_type === 'replay').length || 0,
  };

  // Calculate unique listeners
  const uniqueListeners = new Set(events?.map((e: any) => e.user_id)).size;

  // Get avg watch time
  const playedEvents = events?.filter((e: any) => e.ms_played) || [];
  const avgWatchTime = playedEvents.length > 0
    ? playedEvents.reduce((sum: number, e: any) => sum + e.ms_played, 0) / playedEvents.length
    : 0;

  // Get A/B test results if exists
  const { data: abTest } = await supabase
    .from('ab_test_results')
    .select('*, snippet_variants!variant_a_id(*), snippet_variants!variant_b_id(*)')
    .eq('snippet_id', snippetId)
    .maybeSingle();

  return {
    snippet,
    funnel,
    unique_listeners: uniqueListeners,
    avg_watch_time: avgWatchTime,
    timeline: groupEventsByDay(events || []),
    ab_test: abTest,
  };
}

async function compareSnippets(supabase: any, snippetIds: string[], artistId: string) {
  const comparisons = [];

  for (const snippetId of snippetIds) {
    const analytics = await getSnippetAnalytics(supabase, snippetId, artistId);
    comparisons.push(analytics);
  }

  return { comparisons };
}

async function exportData(supabase: any, artistId: string, params: any) {
  const format = params.format || 'json';
  const days = params.days || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { data: events } = await supabase
    .from('engagement_events')
    .select('*, snippets!inner(artist_id, title)')
    .eq('snippets.artist_id', artistId)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false });

  if (format === 'csv') {
    const csv = convertToCSV(events || []);
    return { data: csv, format: 'csv' };
  }

  return { data: events, format: 'json' };
}

function groupEventsByDay(events: any[]) {
  const grouped: any = {};
  
  events.forEach((event) => {
    const date = new Date(event.created_at).toISOString().split('T')[0];
    if (!grouped[date]) {
      grouped[date] = {
        date,
        impressions: 0,
        plays: 0,
        retention_3s: 0,
        retention_15s: 0,
        completions: 0,
        likes: 0,
        shares: 0,
      };
    }
    
    if (event.event_type === 'impression') grouped[date].impressions++;
    if (event.event_type === 'play_start') grouped[date].plays++;
    if (event.event_type === 'play_3s') grouped[date].retention_3s++;
    if (event.event_type === 'play_15s') grouped[date].retention_15s++;
    if (event.event_type === 'complete') grouped[date].completions++;
    if (event.event_type === 'like') grouped[date].likes++;
    if (event.event_type === 'share') grouped[date].shares++;
  });

  return Object.values(grouped);
}

function convertToCSV(data: any[]) {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  
  return `${headers}\n${rows}`;
}
