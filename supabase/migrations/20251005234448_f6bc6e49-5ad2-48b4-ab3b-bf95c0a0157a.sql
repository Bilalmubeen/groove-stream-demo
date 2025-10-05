-- Fix email exposure in profiles table
-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new policies that protect email addresses
-- Policy 1: Users can view all profile data EXCEPT emails (public data)
CREATE POLICY "Public profile data viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- Note: The above policy allows SELECT but we'll control which columns are accessible via a view
-- However, RLS doesn't support column-level restrictions directly
-- So we need a different approach: restrict to owner/admin for full access

-- Better approach: Replace with owner/admin policy
DROP POLICY IF EXISTS "Public profile data viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile with email"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles with email"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a view for public profile data without email
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  avatar_url,
  bio,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;