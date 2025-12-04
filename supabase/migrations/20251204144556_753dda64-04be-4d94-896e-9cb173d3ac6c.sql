-- Drop existing restrictive INSERT policies
DROP POLICY IF EXISTS "Users can follow artists" ON follows;
DROP POLICY IF EXISTS "Users can follow others" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;
DROP POLICY IF EXISTS "Users can unfollow artists" ON follows;

-- Recreate as PERMISSIVE policies (PERMISSIVE is default)
CREATE POLICY "Users can follow others"
ON follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON follows FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);