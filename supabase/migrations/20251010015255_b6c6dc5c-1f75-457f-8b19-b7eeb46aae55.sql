-- Phase 3: Discovery & Engagement - Database Changes

-- 1. Create engagement events table
CREATE TABLE IF NOT EXISTS public.engagement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  snippet_id uuid NOT NULL REFERENCES snippets(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('play_start', 'play_3s', 'play_complete', 'replay', 'like', 'share', 'save')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;

-- Engagement policies
CREATE POLICY "Users can insert own engagement events"
ON public.engagement_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own engagement events"
ON public.engagement_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all engagement events"
ON public.engagement_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add index for performance
CREATE INDEX idx_engagement_events_snippet_id ON engagement_events(snippet_id);
CREATE INDEX idx_engagement_events_created_at ON engagement_events(created_at);
CREATE INDEX idx_engagement_events_event_type ON engagement_events(event_type);

-- 2. Create function to calculate trending score
CREATE OR REPLACE FUNCTION public.calculate_trending_score(snippet_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  score numeric := 0;
  hours_old numeric;
  play_count integer;
  retention_count integer;
  complete_count integer;
  like_count integer;
  replay_count integer;
BEGIN
  -- Get snippet age in hours
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 INTO hours_old
  FROM snippets WHERE id = snippet_id;
  
  -- Get engagement counts (last 7 days)
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'play_start'),
    COUNT(*) FILTER (WHERE event_type = 'play_3s'),
    COUNT(*) FILTER (WHERE event_type = 'play_complete'),
    COUNT(*) FILTER (WHERE event_type = 'like'),
    COUNT(*) FILTER (WHERE event_type = 'replay')
  INTO play_count, retention_count, complete_count, like_count, replay_count
  FROM engagement_events
  WHERE engagement_events.snippet_id = calculate_trending_score.snippet_id
  AND created_at > NOW() - INTERVAL '7 days';
  
  -- Calculate score with time decay
  score := (
    (play_count * 1) +
    (retention_count * 2) +
    (complete_count * 3) +
    (like_count * 5) +
    (replay_count * 4)
  ) / POWER(hours_old + 2, 1.5);
  
  RETURN score;
END;
$$;

-- 3. Add full text search to snippets
ALTER TABLE snippets ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.update_snippet_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_snippets_search_vector ON snippets;
CREATE TRIGGER update_snippets_search_vector
  BEFORE INSERT OR UPDATE OF title, tags ON snippets
  FOR EACH ROW
  EXECUTE FUNCTION update_snippet_search_vector();

-- Update existing snippets
UPDATE snippets SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'B');

-- Add index for full text search
CREATE INDEX IF NOT EXISTS idx_snippets_search_vector ON snippets USING gin(search_vector);