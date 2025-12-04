-- Add permissive policy allowing artists to insert their own snippets
CREATE POLICY "Artists can insert own snippets" 
ON public.snippets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM artist_profiles 
    WHERE artist_profiles.id = snippets.artist_id 
    AND artist_profiles.user_id = auth.uid()
  )
);