-- Create mentions table to track @mentions in comments
CREATE TABLE public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, mentioned_user_id)
);

-- Enable RLS on mentions
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Anyone can view mentions
CREATE POLICY "Anyone can view mentions"
ON public.mentions
FOR SELECT
USING (true);

-- Authenticated users can create mentions
CREATE POLICY "Authenticated users can create mentions"
ON public.mentions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create hashtags table
CREATE TABLE public.hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on hashtags
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;

-- Anyone can view hashtags
CREATE POLICY "Anyone can view hashtags"
ON public.hashtags
FOR SELECT
USING (true);

-- System can manage hashtags
CREATE POLICY "System can manage hashtags"
ON public.hashtags
FOR ALL
USING (true);

-- Create snippet_hashtags junction table
CREATE TABLE public.snippet_hashtags (
  snippet_id UUID NOT NULL REFERENCES public.snippets(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (snippet_id, hashtag_id)
);

-- Enable RLS on snippet_hashtags
ALTER TABLE public.snippet_hashtags ENABLE ROW LEVEL SECURITY;

-- Anyone can view snippet hashtags
CREATE POLICY "Anyone can view snippet hashtags"
ON public.snippet_hashtags
FOR SELECT
USING (true);

-- Artists can manage their snippet hashtags
CREATE POLICY "Artists can manage own snippet hashtags"
ON public.snippet_hashtags
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM snippets s
    JOIN artist_profiles ap ON ap.id = s.artist_id
    WHERE s.id = snippet_hashtags.snippet_id
    AND ap.user_id = auth.uid()
  )
);

-- Create index for hashtag searches
CREATE INDEX idx_hashtags_tag ON public.hashtags(tag);
CREATE INDEX idx_snippet_hashtags_hashtag_id ON public.snippet_hashtags(hashtag_id);
CREATE INDEX idx_mentions_mentioned_user_id ON public.mentions(mentioned_user_id);

-- Create trigger function to create notifications for mentions
CREATE OR REPLACE FUNCTION public.handle_mention_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comment_author_id UUID;
  snippet_id_val UUID;
BEGIN
  -- Get the comment author and snippet
  SELECT user_id, snippet_id INTO comment_author_id, snippet_id_val
  FROM comments
  WHERE id = NEW.comment_id;

  -- Don't notify if user mentions themselves
  IF comment_author_id != NEW.mentioned_user_id THEN
    -- Create notification for the mentioned user
    INSERT INTO notifications (user_id, from_user_id, snippet_id, comment_id, type, read)
    VALUES (NEW.mentioned_user_id, comment_author_id, snippet_id_val, NEW.comment_id, 'mention', false);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for mention notifications
CREATE TRIGGER on_mention_created
  AFTER INSERT ON public.mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_mention_notification();

-- Create trigger to update hashtag usage count
CREATE OR REPLACE FUNCTION public.update_hashtag_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags
    SET usage_count = usage_count + 1,
        updated_at = now()
    WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hashtags
    SET usage_count = GREATEST(usage_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.hashtag_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for hashtag usage tracking
CREATE TRIGGER on_snippet_hashtag_change
  AFTER INSERT OR DELETE ON public.snippet_hashtags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hashtag_usage();