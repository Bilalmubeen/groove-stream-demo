-- Enable full replica identity for messages table to ensure complete row data is captured
ALTER TABLE public.messages REPLICA IDENTITY FULL;