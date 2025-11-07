-- Phase 2: Collaborative Playlists Schema

-- Add columns to playlists table
ALTER TABLE playlists 
ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_suggestions BOOLEAN DEFAULT false;

-- Create playlist_collaborators table
CREATE TABLE IF NOT EXISTS playlist_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(playlist_id, user_id)
);

-- Create playlist_invites table
CREATE TABLE IF NOT EXISTS playlist_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  accepted BOOLEAN DEFAULT false
);

-- Create playlist_activity table
CREATE TABLE IF NOT EXISTS playlist_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE playlist_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playlist_collaborators
CREATE POLICY "Users can view collaborators of accessible playlists"
  ON playlist_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playlists WHERE id = playlist_id AND creator_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Playlist owners and admins can manage collaborators"
  ON playlist_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM playlists WHERE id = playlist_id AND creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM playlist_collaborators 
      WHERE playlist_id = playlist_collaborators.playlist_id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
  );

-- RLS Policies for playlist_invites
CREATE POLICY "Playlist owners can manage invites"
  ON playlist_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM playlists WHERE id = playlist_id AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can view invites sent to their email"
  ON playlist_invites FOR SELECT
  USING (
    email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- RLS Policies for playlist_activity
CREATE POLICY "Collaborators can view activity"
  ON playlist_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playlists WHERE id = playlist_id AND creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM playlist_collaborators 
      WHERE playlist_id = playlist_activity.playlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can log activity"
  ON playlist_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update playlist_items policy to allow editors
DROP POLICY IF EXISTS "Playlist owners can manage items" ON playlist_items;

CREATE POLICY "Playlist owners and editors can manage items"
  ON playlist_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM playlists WHERE id = playlist_id AND creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM playlist_collaborators 
      WHERE playlist_id = playlist_items.playlist_id 
        AND user_id = auth.uid() 
        AND role IN ('editor', 'admin')
    )
  );

-- Phase 3: Audio Editor Schema

-- Add columns to snippets table for audio editing
ALTER TABLE snippets
ADD COLUMN IF NOT EXISTS original_audio_url TEXT,
ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edit_metadata JSONB;

-- Enable realtime for playlist_activity
ALTER PUBLICATION supabase_realtime ADD TABLE playlist_activity;