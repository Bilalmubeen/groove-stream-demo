-- Drop existing RESTRICTIVE policies on conversations
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;

-- Create PERMISSIVE policies for conversations
CREATE POLICY "conversations_insert_policy"
ON public.conversations
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "conversations_select_policy"
ON public.conversations
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_conversation_member(id, auth.uid()));

-- Drop and recreate conversation_members policies as PERMISSIVE
DROP POLICY IF EXISTS "Members can view conversation members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can add conversation members" ON public.conversation_members;

CREATE POLICY "Members can view conversation members"
ON public.conversation_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can add conversation members"
ON public.conversation_members
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (true);