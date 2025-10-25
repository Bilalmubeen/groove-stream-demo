-- ============================================
-- BeatSeek Comprehensive Upgrade Migration
-- ============================================

-- 1. CREATE ENUMS
DO $$ BEGIN
  CREATE TYPE public.cta_type AS ENUM ('full_track','presave','merch','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.feed_rail AS ENUM ('for_you','new_this_week','following','underground');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. ADD SNIPPET CTA FIELDS
ALTER TABLE public.snippets
  ADD COLUMN IF NOT EXISTS cta_type public.cta_type,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS hook_start_ms int DEFAULT 0;

-- 3. CREATE FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, artist_id)
);

-- RLS for follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can follow others"
ON public.follows
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON public.follows
FOR DELETE
USING (auth.uid() = follower_id);

CREATE POLICY "Anyone can view follows"
ON public.follows
FOR SELECT
USING (true);

-- 4. CREATE SNIPPET VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.snippet_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_snippet_id uuid NOT NULL REFERENCES public.snippets(id) ON DELETE CASCADE,
  audio_path text NOT NULL,
  cover_path text,
  label text DEFAULT 'A',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variants_parent ON public.snippet_variants(parent_snippet_id);
CREATE INDEX IF NOT EXISTS idx_variants_active ON public.snippet_variants(is_active) WHERE is_active = true;

-- RLS for snippet_variants
ALTER TABLE public.snippet_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active variants"
ON public.snippet_variants
FOR SELECT
USING (is_active = true OR EXISTS (
  SELECT 1 FROM artist_profiles
  WHERE artist_profiles.id = (SELECT artist_id FROM snippets WHERE snippets.id = parent_snippet_id)
  AND artist_profiles.user_id = auth.uid()
));

CREATE POLICY "Artists can manage own variants"
ON public.snippet_variants
FOR ALL
USING (EXISTS (
  SELECT 1 FROM snippets s
  JOIN artist_profiles ap ON ap.id = s.artist_id
  WHERE s.id = parent_snippet_id AND ap.user_id = auth.uid()
));

-- 5. EXTEND ENGAGEMENT EVENTS
ALTER TABLE public.engagement_events
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.snippet_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ms_played int,
  ADD COLUMN IF NOT EXISTS session_id uuid;

CREATE INDEX IF NOT EXISTS idx_events_variant ON public.engagement_events(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_session ON public.engagement_events(session_id) WHERE session_id IS NOT NULL;

-- 6. CREATE MATERIALIZED VIEW FOR CREATOR METRICS
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_creator_metrics_daily AS
SELECT
  s.artist_id,
  date_trunc('day', e.created_at) AS day,
  count(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
  count(*) FILTER (WHERE e.event_type = 'play_start') AS plays,
  count(*) FILTER (WHERE e.event_type = 'play_3s') AS play_3s,
  count(*) FILTER (WHERE e.event_type = 'play_15s') AS play_15s,
  count(*) FILTER (WHERE e.event_type = 'complete') AS completes,
  count(*) FILTER (WHERE e.event_type = 'like') AS likes,
  count(*) FILTER (WHERE e.event_type = 'save') AS saves,
  count(*) FILTER (WHERE e.event_type = 'follow') AS follows,
  count(*) FILTER (WHERE e.event_type = 'cta_click') AS cta_clicks,
  count(*) FILTER (WHERE e.event_type = 'skip') AS skips,
  count(DISTINCT e.user_id) FILTER (WHERE e.user_id IS NOT NULL) AS unique_users
FROM public.engagement_events e
JOIN public.snippets s ON s.id = e.snippet_id
WHERE e.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.artist_id, date_trunc('day', e.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_creator_metrics_artist_day ON public.mv_creator_metrics_daily(artist_id, day);

-- 7. CREATE TRENDING SCORES TABLE (refreshed by cron)
CREATE TABLE IF NOT EXISTS public.trending_scores (
  snippet_id uuid PRIMARY KEY REFERENCES public.snippets(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  tag text,
  artist_id uuid NOT NULL,
  last_updated timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trending_score ON public.trending_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_artist ON public.trending_scores(artist_id);
CREATE INDEX IF NOT EXISTS idx_trending_tag ON public.trending_scores(tag);

-- RLS for trending_scores
ALTER TABLE public.trending_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trending scores"
ON public.trending_scores
FOR SELECT
USING (true);

-- 8. IMPROVED INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_snippets_created_desc ON public.snippets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snippets_genre_status ON public.snippets(genre, status);
CREATE INDEX IF NOT EXISTS idx_snippets_artist_status ON public.snippets(artist_id, status);
CREATE INDEX IF NOT EXISTS idx_events_snippet_type_time ON public.engagement_events(snippet_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON public.engagement_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- 9. SECURITY FIXES

-- Fix: Drop public_profiles if it exists (security issue)
DROP VIEW IF EXISTS public.public_profiles CASCADE;

-- Fix: Consolidate redundant profile policies
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON public.profiles;

-- Fix: Update engagement events policy to restrict anonymous event viewing
DROP POLICY IF EXISTS "Users can view own engagement events" ON public.engagement_events;

CREATE POLICY "Users can view only their own events"
ON public.engagement_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events including anonymous"
ON public.engagement_events
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix: Add search_path to functions for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_snippet_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$function$;