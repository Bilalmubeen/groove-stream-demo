-- Fix the security definer view issue
-- Recreate the public_profiles view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_invoker=true)
AS
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