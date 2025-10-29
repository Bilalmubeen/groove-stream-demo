-- Fix all "warn" level security issues

-- 1. Add length validation to messages table (messages_xss_risk)
-- Add CHECK constraint to limit message length to 5000 characters
ALTER TABLE public.messages
ADD CONSTRAINT messages_text_length_check 
CHECK (LENGTH(text) BETWEEN 1 AND 5000);

-- 2. Add length validation to comments table (related to comment_text_validation)
ALTER TABLE public.comments
ADD CONSTRAINT comments_text_length_check 
CHECK (LENGTH(text) BETWEEN 1 AND 5000);

-- 3. Fix calculate_trending_score function - add search_path (calculate_trending_missing_path)
CREATE OR REPLACE FUNCTION public.calculate_trending_score(snippet_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
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

-- 4. Fix update_snippet_search_vector function - add search_path
CREATE OR REPLACE FUNCTION public.update_snippet_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$;

-- 5. Add explicit write policies to trending_scores table (trending_scores_no_write_policy)
-- Only admins can modify trending scores
CREATE POLICY "Only admins can insert trending scores"
ON public.trending_scores
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update trending scores"
ON public.trending_scores
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete trending scores"
ON public.trending_scores
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 6. Restrict follow relationships to authenticated users only (follows_public_social_graph)
-- Drop the overly permissive "Anyone can view follows" policy
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;

-- Create new policy: authenticated users can view follows
CREATE POLICY "Authenticated users can view follows"
ON public.follows
FOR SELECT
TO authenticated
USING (true);

-- 7. Remove materialized view from API exposure (SUPA_materialized_view_in_api)
-- Revoke permissions from anon and authenticated roles on materialized view
REVOKE ALL ON public.mv_creator_metrics_daily FROM anon;
REVOKE ALL ON public.mv_creator_metrics_daily FROM authenticated;

-- Grant SELECT only to service_role (for internal use only)
GRANT SELECT ON public.mv_creator_metrics_daily TO service_role;