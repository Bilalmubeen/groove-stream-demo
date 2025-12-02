-- Fix conversations RLS policies
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix conversation_members RLS policies to allow adding other users to new conversations
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_members;

CREATE POLICY "Users can add members to conversations they're part of"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can add themselves
  auth.uid() = user_id
  OR
  -- User can add others to conversations they're creating (within same transaction)
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversation_members.conversation_id
    AND user_id = auth.uid()
  )
);