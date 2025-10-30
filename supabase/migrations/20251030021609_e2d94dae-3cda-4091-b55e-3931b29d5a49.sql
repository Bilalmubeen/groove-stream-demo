-- Add scheduled uploads and draft support to snippets
ALTER TABLE snippets 
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS draft BOOLEAN DEFAULT false;

-- Create upload templates table
CREATE TABLE IF NOT EXISTS upload_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE upload_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own templates"
  ON upload_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM artist_profiles
    WHERE artist_profiles.id = upload_templates.artist_id
    AND artist_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Artists can create own templates"
  ON upload_templates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM artist_profiles
    WHERE artist_profiles.id = upload_templates.artist_id
    AND artist_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Artists can update own templates"
  ON upload_templates FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM artist_profiles
    WHERE artist_profiles.id = upload_templates.artist_id
    AND artist_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Artists can delete own templates"
  ON upload_templates FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM artist_profiles
    WHERE artist_profiles.id = upload_templates.artist_id
    AND artist_profiles.user_id = auth.uid()
  ));

-- Create artist achievements table
CREATE TABLE IF NOT EXISTS artist_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

ALTER TABLE artist_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
  ON artist_achievements FOR SELECT
  USING (true);

CREATE POLICY "System can create achievements"
  ON artist_achievements FOR INSERT
  WITH CHECK (true);

-- Create A/B test results table
CREATE TABLE IF NOT EXISTS ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snippet_id UUID NOT NULL REFERENCES snippets(id) ON DELETE CASCADE,
  variant_a_id UUID REFERENCES snippet_variants(id) ON DELETE CASCADE,
  variant_b_id UUID REFERENCES snippet_variants(id) ON DELETE CASCADE,
  winner_id UUID,
  confidence_score NUMERIC,
  sample_size_a INTEGER,
  sample_size_b INTEGER,
  metric_name TEXT,
  test_duration_days INTEGER DEFAULT 7,
  started_at TIMESTAMPTZ DEFAULT now(),
  concluded_at TIMESTAMPTZ
);

ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view test results"
  ON ab_test_results FOR SELECT
  USING (true);

CREATE POLICY "Artists can manage own test results"
  ON ab_test_results FOR ALL
  USING (EXISTS (
    SELECT 1 FROM snippets s
    JOIN artist_profiles ap ON ap.id = s.artist_id
    WHERE s.id = ab_test_results.snippet_id
    AND ap.user_id = auth.uid()
  ));

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_events_artist_snippet ON engagement_events(snippet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_snippet ON engagement_events(user_id, snippet_id);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON engagement_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snippets_scheduled ON snippets(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_snippets_artist_status ON snippets(artist_id, status, created_at DESC);

-- Create materialized view for daily artist metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_artist_metrics_daily AS
SELECT 
  s.artist_id,
  DATE(e.created_at) as metric_date,
  COUNT(DISTINCT CASE WHEN e.event_type = 'impression' THEN e.id END) as impressions,
  COUNT(DISTINCT CASE WHEN e.event_type = 'play_start' THEN e.id END) as plays,
  COUNT(DISTINCT CASE WHEN e.event_type = 'play_3s' THEN e.id END) as retention_3s,
  COUNT(DISTINCT CASE WHEN e.event_type = 'play_15s' THEN e.id END) as retention_15s,
  COUNT(DISTINCT CASE WHEN e.event_type = 'complete' THEN e.id END) as completions,
  COUNT(DISTINCT CASE WHEN e.event_type = 'like' THEN e.id END) as likes,
  COUNT(DISTINCT CASE WHEN e.event_type = 'share' THEN e.id END) as shares,
  COUNT(DISTINCT CASE WHEN e.event_type = 'save' THEN e.id END) as saves,
  COUNT(DISTINCT e.user_id) as unique_listeners
FROM engagement_events e
JOIN snippets s ON s.id = e.snippet_id
GROUP BY s.artist_id, DATE(e.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_artist_metrics_daily ON mv_artist_metrics_daily(artist_id, metric_date);

-- Create materialized view for snippet metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_snippet_metrics AS
SELECT 
  e.snippet_id,
  COUNT(DISTINCT CASE WHEN e.event_type = 'play_start' THEN e.id END) as total_plays,
  COUNT(DISTINCT CASE WHEN e.event_type = 'complete' THEN e.id END) as total_completions,
  COUNT(DISTINCT CASE WHEN e.event_type = 'like' THEN e.id END) as total_likes,
  COUNT(DISTINCT CASE WHEN e.event_type = 'share' THEN e.id END) as total_shares,
  COUNT(DISTINCT CASE WHEN e.event_type = 'save' THEN e.id END) as total_saves,
  COUNT(DISTINCT e.user_id) as unique_listeners,
  AVG(CASE WHEN e.ms_played IS NOT NULL THEN e.ms_played END) as avg_ms_played,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN e.event_type = 'play_start' THEN e.id END) > 0 
    THEN (COUNT(DISTINCT CASE WHEN e.event_type = 'complete' THEN e.id END)::NUMERIC / 
          COUNT(DISTINCT CASE WHEN e.event_type = 'play_start' THEN e.id END)::NUMERIC * 100)
    ELSE 0
  END as completion_rate
FROM engagement_events e
GROUP BY e.snippet_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_snippet_metrics ON mv_snippet_metrics(snippet_id);