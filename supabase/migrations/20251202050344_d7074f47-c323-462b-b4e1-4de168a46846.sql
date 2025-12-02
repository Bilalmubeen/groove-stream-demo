-- Temporarily disable RLS on conversations to test
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;

-- Re-enable it
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on conversations
DROP POLICY IF EXISTS "Allow authenticated users to create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Members can view their conversations" ON public.conversations;

-- Create the most permissive insert policy possible
CREATE POLICY "conversations_insert_policy"
ON public.conversations
FOR INSERT
WITH CHECK (true);

-- Create select policy
CREATE POLICY "conversations_select_policy"
ON public.conversations
FOR SELECT
USING (public.is_conversation_member(id, auth.uid()));