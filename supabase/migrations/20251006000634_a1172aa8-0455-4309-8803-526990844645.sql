-- Fix: Add policy to allow authenticated users to view public profiles
-- Drop if exists and recreate to ensure consistency
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON public.profiles;

CREATE POLICY "Public profiles viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);