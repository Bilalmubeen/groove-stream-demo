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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Checking for scheduled snippets to publish...');

    // Find snippets that are scheduled to be published now
    const { data: scheduledSnippets, error: fetchError } = await supabaseClient
      .from('snippets')
      .select('id, title, artist_id, scheduled_at')
      .eq('draft', true)
      .lte('scheduled_at', new Date().toISOString())
      .not('scheduled_at', 'is', null);

    if (fetchError) {
      console.error('Error fetching scheduled snippets:', fetchError);
      throw fetchError;
    }

    if (!scheduledSnippets || scheduledSnippets.length === 0) {
      console.log('No snippets to publish');
      return new Response(JSON.stringify({ message: 'No snippets to publish', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${scheduledSnippets.length} snippets to publish`);

    // Publish each snippet
    const results = [];
    for (const snippet of scheduledSnippets) {
      try {
        // Update snippet to published status
        const { error: updateError } = await supabaseClient
          .from('snippets')
          .update({ 
            draft: false,
            status: 'pending', // Set to pending for moderation
            scheduled_at: null 
          })
          .eq('id', snippet.id);

        if (updateError) {
          console.error(`Error publishing snippet ${snippet.id}:`, updateError);
        results.push({ id: snippet.id, success: false, error: updateError.message });
        continue;
      }

      // Get artist's followers for notifications
      const { data: followers } = await supabaseClient
        .from('follows')
        .select('follower_id')
        .eq('following_id', snippet.artist_id);

      // Create notifications for followers
      if (followers && followers.length > 0) {
        const notifications = followers.map((follow: any) => ({
          user_id: follow.follower_id,
          type: 'new_upload',
          snippet_id: snippet.id,
          from_user_id: snippet.artist_id,
        }));

        await supabaseClient
          .from('notifications')
          .insert(notifications);
      }

      console.log(`Successfully published snippet ${snippet.id} (${snippet.title})`);
      results.push({ id: snippet.id, success: true, title: snippet.title });
    } catch (error) {
      console.error(`Error processing snippet ${snippet.id}:`, error);
      results.push({ id: snippet.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

    return new Response(JSON.stringify({ 
      message: 'Publishing complete',
      count: results.filter(r => r.success).length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Publish scheduled error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
