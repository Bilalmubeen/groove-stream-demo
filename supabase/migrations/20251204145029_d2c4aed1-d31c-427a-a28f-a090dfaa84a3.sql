-- Drop the constraint that references artist_profiles
ALTER TABLE follows DROP CONSTRAINT follows_following_id_fkey;

-- Add constraint that references profiles instead
ALTER TABLE follows 
  ADD CONSTRAINT follows_following_id_fkey 
  FOREIGN KEY (following_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;