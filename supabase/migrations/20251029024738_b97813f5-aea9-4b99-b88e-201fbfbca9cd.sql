-- Fix upload bypass vulnerability by restricting snippet INSERT to service role only
-- This ensures all uploads go through the upload-snippet edge function which validates files

-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Artists can insert own snippets" ON public.snippets;

-- Create new INSERT policy that only allows service role (edge functions)
-- This forces all uploads to go through the upload-snippet edge function
-- which validates file types, sizes, and durations
CREATE POLICY "Only service role can insert snippets"
ON public.snippets
FOR INSERT
TO service_role
WITH CHECK (true);

-- Note: Regular authenticated artists can no longer directly INSERT into snippets
-- They must use the /upload-snippet edge function which enforces all validation rules