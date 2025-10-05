-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('listener', 'artist', 'admin');

-- Create enum for snippet status
CREATE TYPE public.snippet_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for genres
CREATE TYPE public.music_genre AS ENUM ('hip-hop', 'trap', 'indie-pop', 'edm', 'house', 'r&b', 'soul', 'lo-fi', 'pop', 'rock', 'electronic', 'jazz', 'classical', 'other');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create artist_profiles table
CREATE TABLE public.artist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  artist_name TEXT NOT NULL,
  genres music_genre[] NOT NULL DEFAULT '{}',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  total_views INTEGER NOT NULL DEFAULT 0,
  total_likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create snippets table
CREATE TABLE public.snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  genre music_genre NOT NULL,
  tags TEXT[] DEFAULT '{}',
  audio_url TEXT NOT NULL,
  cover_image_url TEXT,
  duration INTEGER NOT NULL, -- in seconds
  status snippet_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CONSTRAINT valid_duration CHECK (duration > 0 AND duration <= 30)
);

-- Create user_snippet_interactions table
CREATE TABLE public.user_snippet_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  snippet_id UUID NOT NULL REFERENCES public.snippets(id) ON DELETE CASCADE,
  liked BOOLEAN NOT NULL DEFAULT FALSE,
  saved BOOLEAN NOT NULL DEFAULT FALSE,
  viewed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, snippet_id)
);

-- Create follows table
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_snippet_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles RLS policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User roles RLS policies
CREATE POLICY "User roles viewable by owner or admin"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Artist profiles RLS policies
CREATE POLICY "Artist profiles viewable by everyone"
  ON public.artist_profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "Artists can update own profile"
  ON public.artist_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Artists can insert own profile"
  ON public.artist_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'artist'));

-- Snippets RLS policies
CREATE POLICY "Approved snippets viewable by everyone"
  ON public.snippets FOR SELECT
  USING (status = 'approved' OR 
         EXISTS (SELECT 1 FROM public.artist_profiles WHERE id = snippets.artist_id AND user_id = auth.uid()) OR
         public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Artists can insert own snippets"
  ON public.snippets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.artist_profiles WHERE id = artist_id AND user_id = auth.uid()));

CREATE POLICY "Artists can update own snippets"
  ON public.snippets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.artist_profiles WHERE id = artist_id AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete snippets"
  ON public.snippets FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- User snippet interactions RLS policies
CREATE POLICY "Users can view own interactions"
  ON public.user_snippet_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
  ON public.user_snippet_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions"
  ON public.user_snippet_interactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Follows RLS policies
CREATE POLICY "Follows viewable by everyone"
  ON public.follows FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can follow artists"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow artists"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artist_profiles_updated_at
  BEFORE UPDATE ON public.artist_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_snippets_updated_at
  BEFORE UPDATE ON public.snippets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_snippet_interactions_updated_at
  BEFORE UPDATE ON public.user_snippet_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for audio snippets
INSERT INTO storage.buckets (id, name, public)
VALUES ('snippets', 'snippets', TRUE);

-- Create storage bucket for cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', TRUE);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE);

-- Storage policies for snippets bucket
CREATE POLICY "Snippet audio files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'snippets');

CREATE POLICY "Artists can upload snippets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'snippets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Artists can update own snippets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'snippets' AND auth.uid() IS NOT NULL);

-- Storage policies for covers bucket
CREATE POLICY "Cover images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "Artists can upload covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'covers' AND auth.uid() IS NOT NULL);

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);