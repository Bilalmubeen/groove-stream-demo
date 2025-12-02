-- Fix infinite recursion in playlist_collaborators policy
DROP POLICY IF EXISTS "Playlist owners and admins can manage collaborators" ON playlist_collaborators;

-- Create corrected policy without self-referencing recursion
CREATE POLICY "Playlist owners and admins can manage collaborators"
ON playlist_collaborators
FOR ALL
USING (
  -- Playlist owner can manage
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_collaborators.playlist_id
    AND playlists.creator_id = auth.uid()
  )
  -- OR user is the collaborator being referenced (can view themselves)
  OR user_id = auth.uid()
);