-- Create playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create playlist_items table
CREATE TABLE IF NOT EXISTS public.playlist_items (
  playlist_id uuid REFERENCES public.playlists(id) ON DELETE CASCADE,
  snippet_id uuid REFERENCES public.snippets(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (playlist_id, snippet_id)
);

-- Enable RLS on playlists
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Playlists policies
CREATE POLICY "Public playlists viewable by everyone"
ON public.playlists
FOR SELECT
USING (true);

CREATE POLICY "Users can create own playlists"
ON public.playlists
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own playlists"
ON public.playlists
FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own playlists"
ON public.playlists
FOR DELETE
USING (auth.uid() = creator_id);

-- Enable RLS on playlist_items
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- Playlist items policies
CREATE POLICY "Playlist items viewable by everyone"
ON public.playlist_items
FOR SELECT
USING (true);

CREATE POLICY "Playlist owners can manage items"
ON public.playlist_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_items.playlist_id
    AND playlists.creator_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_playlists_creator ON public.playlists(creator_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created ON public.playlists(created_at);
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON public.playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_snippet ON public.playlist_items(snippet_id);

-- Add trigger for updated_at
CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();