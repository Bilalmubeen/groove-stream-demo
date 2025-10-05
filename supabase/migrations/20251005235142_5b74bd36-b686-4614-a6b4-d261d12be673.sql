-- Phase 1: Critical Security Fixes

-- Fix 1.1: Secure the profiles table - deny anonymous access to emails
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Fix 1.2: Add RLS policies to public_profiles view
-- Grant proper access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Fix 1.3: Secure the follows table - remove public access
DROP POLICY IF EXISTS "Follows viewable by everyone" ON public.follows;

-- Users can view their own follows (who they follow)
CREATE POLICY "Users can view their own follows"
ON public.follows
FOR SELECT
USING (auth.uid() = follower_id);

-- Users can view who follows them
CREATE POLICY "Users can view their followers"
ON public.follows
FOR SELECT
USING (auth.uid() = following_id);

-- Artists can view their followers
CREATE POLICY "Artists can view all their followers"
ON public.follows
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.artist_profiles
    WHERE artist_profiles.id = follows.following_id
    AND artist_profiles.user_id = auth.uid()
  )
);

-- Admins can view all follows
CREATE POLICY "Admins can view all follows"
ON public.follows
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Phase 2: Medium Priority Fixes

-- Fix 2.1: Add profile deletion policies
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);

CREATE POLICY "Admins can delete any profile"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Fix 2.2: Add interaction deletion policy
CREATE POLICY "Users can delete own interactions"
ON public.user_snippet_interactions
FOR DELETE
USING (auth.uid() = user_id);

-- Fix 2.3: Add artist content deletion policies
CREATE POLICY "Artists can delete own snippets"
ON public.snippets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.artist_profiles
    WHERE artist_profiles.id = snippets.artist_id
    AND artist_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Artists can delete own profile"
ON public.artist_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Fix 2.4: Update handle_new_user to assign default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Phase 3: Fix function search path (use CASCADE to drop dependencies)
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate all the triggers that were dropped with CASCADE
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