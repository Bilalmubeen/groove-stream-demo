-- Create security definer function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Drop problematic recursive policies
DROP POLICY IF EXISTS "Members can view conversation members" ON public.conversation_members;
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;

-- Create new non-recursive policies using the security definer function

-- conversation_members policies
CREATE POLICY "Members can view conversation members"
ON public.conversation_members
FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));

-- conversations policies
CREATE POLICY "Members can view conversations"
ON public.conversations
FOR SELECT
USING (public.is_conversation_member(id, auth.uid()));

-- messages policies
CREATE POLICY "Members can view messages"
ON public.messages
FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));