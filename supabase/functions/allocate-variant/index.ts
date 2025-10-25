import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const allocationSchema = z.object({
  snippet_id: z.string().uuid()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const body = await req.json();
    const { snippet_id } = allocationSchema.parse(body);

    // Get active variants for this snippet
    const { data: variants, error: variantsError } = await supabase
      .from('snippet_variants')
      .select('id, label, is_active')
      .eq('parent_snippet_id', snippet_id)
      .eq('is_active', true);

    if (variantsError) throw variantsError;

    // If no variants, return null (use original snippet)
    if (!variants || variants.length === 0) {
      console.log(`No active variants for snippet ${snippet_id}`);
      return new Response(JSON.stringify({ 
        variant_id: null,
        label: 'original'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 50/50 split (or equal distribution if more variants)
    const randomIndex = Math.floor(Math.random() * variants.length);
    const selectedVariant = variants[randomIndex];

    // Log allocation event (optional, for tracking)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabaseWithAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabaseWithAuth.auth.getUser();
      if (user) {
        await supabaseWithAuth.from('engagement_events').insert({
          user_id: user.id,
          snippet_id: snippet_id,
          variant_id: selectedVariant.id,
          event_type: 'allocation'
        });
      }
    }

    console.log(`Allocated variant ${selectedVariant.label} (${selectedVariant.id}) for snippet ${snippet_id}`);

    return new Response(JSON.stringify({ 
      variant_id: selectedVariant.id,
      label: selectedVariant.label
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in allocate-variant function:', error);
    
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
