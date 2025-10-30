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

    const { test_id } = await req.json();

    // Get test details
    const { data: test } = await supabaseClient
      .from('ab_test_results')
      .select('*, snippets!inner(artist_id, artist_profiles!inner(user_id))')
      .eq('id', test_id)
      .single();

    if (!test || test.snippets.artist_profiles.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Test not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get metrics for both variants
    const metricName = test.metric_name || 'completion_rate';

    const { data: variantAEvents } = await supabaseClient
      .from('engagement_events')
      .select('event_type, user_id')
      .eq('variant_id', test.variant_a_id);

    const { data: variantBEvents } = await supabaseClient
      .from('engagement_events')
      .select('event_type, user_id')
      .eq('variant_id', test.variant_b_id);

    // Calculate metrics based on test type
    const metricsA = calculateMetrics(variantAEvents || [], metricName);
    const metricsB = calculateMetrics(variantBEvents || [], metricName);

    // Calculate statistical significance (Chi-square test)
    const significance = calculateSignificance(metricsA, metricsB);

    // Determine winner
    let winnerId = null;
    if (significance.p_value < 0.05) {
      winnerId = metricsA.value > metricsB.value ? test.variant_a_id : test.variant_b_id;
    }

    // Update test results
    const { error: updateError } = await supabaseClient
      .from('ab_test_results')
      .update({
        sample_size_a: metricsA.sample_size,
        sample_size_b: metricsB.sample_size,
        winner_id: winnerId,
        confidence_score: significance.confidence,
        concluded_at: new Date().toISOString(),
      })
      .eq('id', test_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      test_id,
      variant_a: {
        id: test.variant_a_id,
        metric_value: metricsA.value,
        sample_size: metricsA.sample_size,
      },
      variant_b: {
        id: test.variant_b_id,
        metric_value: metricsB.value,
        sample_size: metricsB.sample_size,
      },
      winner_id: winnerId,
      p_value: significance.p_value,
      confidence: significance.confidence,
      is_significant: significance.p_value < 0.05,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Calculate A/B results error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateMetrics(events: any[], metricName: string) {
  const uniqueUsers = new Set(events.map(e => e.user_id)).size;
  
  let value = 0;
  
  switch (metricName) {
    case 'completion_rate':
      const plays = events.filter(e => e.event_type === 'play_start').length;
      const completions = events.filter(e => e.event_type === 'complete').length;
      value = plays > 0 ? (completions / plays) * 100 : 0;
      break;
    case 'engagement_score':
      const likes = events.filter(e => e.event_type === 'like').length;
      const shares = events.filter(e => e.event_type === 'share').length;
      const saves = events.filter(e => e.event_type === 'save').length;
      value = likes * 1 + shares * 2 + saves * 1.5;
      break;
    case 'cta_click_rate':
      const impressions = events.filter(e => e.event_type === 'impression').length;
      const ctaClicks = events.filter(e => e.event_type === 'cta_click').length;
      value = impressions > 0 ? (ctaClicks / impressions) * 100 : 0;
      break;
  }

  return {
    value,
    sample_size: uniqueUsers,
  };
}

function calculateSignificance(metricsA: any, metricsB: any) {
  // Simple chi-square test approximation
  const n1 = metricsA.sample_size;
  const n2 = metricsB.sample_size;
  
  if (n1 === 0 || n2 === 0) {
    return { p_value: 1, confidence: 0 };
  }

  const p1 = metricsA.value / 100;
  const p2 = metricsB.value / 100;
  
  const pPool = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
  
  if (se === 0) {
    return { p_value: 1, confidence: 0 };
  }

  const zScore = Math.abs((p1 - p2) / se);
  
  // Approximate p-value from z-score
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
  const confidence = (1 - pValue) * 100;

  return {
    p_value: pValue,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// Standard normal cumulative distribution function
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}
