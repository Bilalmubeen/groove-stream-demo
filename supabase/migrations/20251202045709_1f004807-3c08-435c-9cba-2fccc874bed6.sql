-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can add members to conversations they're part of" ON public.conversation_members;

-- Allow users to add themselves to any conversation
CREATE POLICY "Users can add themselves to conversations"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to add other members to conversations where they are already a member
-- This is handled by a separate policy that checks after the user is added
CREATE POLICY "Users can invite others to their conversations"  
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if conversation has no members yet (brand new conversation)
  NOT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversation_members.conversation_id
  )
  OR
  -- Or if the inviting user is already a member
  EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversation_members.conversation_id
    AND cm.user_id = auth.uid()
  )
);