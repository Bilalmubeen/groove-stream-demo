-- Add media type enum
CREATE TYPE public.media_type AS ENUM ('audio', 'youtube');

-- Add new columns to snippets table
ALTER TABLE public.snippets
ADD COLUMN media_type public.media_type NOT NULL DEFAULT 'audio',
ADD COLUMN youtube_video_id text,
ADD COLUMN youtube_start_seconds integer DEFAULT 0;

-- Make audio_url nullable for YouTube snippets
ALTER TABLE public.snippets
ALTER COLUMN audio_url DROP NOT NULL;

-- Add check constraint to ensure YouTube snippets have video_id
ALTER TABLE public.snippets
ADD CONSTRAINT snippets_youtube_check CHECK (
  (media_type = 'audio' AND audio_url IS NOT NULL) OR
  (media_type = 'youtube' AND youtube_video_id IS NOT NULL)
);