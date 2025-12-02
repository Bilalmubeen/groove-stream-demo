-- First, let's see all current policies on conversations table and drop them
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Create a simple, permissive policy for authenticated users to create conversations
CREATE POLICY "Allow authenticated users to create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Recreate the SELECT policy using our helper function
CREATE POLICY "Members can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_conversation_member(id, auth.uid()));