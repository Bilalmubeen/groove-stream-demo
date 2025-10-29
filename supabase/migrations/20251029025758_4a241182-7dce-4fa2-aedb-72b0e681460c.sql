-- Create user_preferences table to store all user settings
CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification preferences
  notify_follows boolean NOT NULL DEFAULT true,
  notify_comments boolean NOT NULL DEFAULT true,
  notify_likes boolean NOT NULL DEFAULT true,
  notify_messages boolean NOT NULL DEFAULT true,
  notify_mentions boolean NOT NULL DEFAULT true,
  notify_replies boolean NOT NULL DEFAULT true,
  notify_uploads boolean NOT NULL DEFAULT true,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT false,
  
  -- Privacy preferences
  profile_visibility text NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'followers', 'private')),
  show_liked_snippets boolean NOT NULL DEFAULT true,
  show_playlists boolean NOT NULL DEFAULT true,
  allow_messages_from text NOT NULL DEFAULT 'everyone' CHECK (allow_messages_from IN ('everyone', 'followers', 'none')),
  
  -- Playback preferences
  autoplay boolean NOT NULL DEFAULT true,
  audio_quality text NOT NULL DEFAULT 'high' CHECK (audio_quality IN ('low', 'medium', 'high')),
  default_volume integer NOT NULL DEFAULT 80 CHECK (default_volume BETWEEN 0 AND 100),
  
  -- Appearance preferences
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  show_animations boolean NOT NULL DEFAULT true,
  compact_mode boolean NOT NULL DEFAULT false,
  
  -- Content preferences
  preferred_genres text[] DEFAULT '{}',
  content_language text NOT NULL DEFAULT 'en',
  show_explicit boolean NOT NULL DEFAULT true,
  
  -- Artist-specific settings (only relevant if user is an artist)
  show_analytics boolean NOT NULL DEFAULT true,
  auto_publish boolean NOT NULL DEFAULT false,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
ON public.user_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
ON public.user_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
ON public.user_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all preferences
CREATE POLICY "Admins can view all preferences"
ON public.user_preferences
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);