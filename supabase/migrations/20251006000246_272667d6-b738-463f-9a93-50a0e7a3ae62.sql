-- Phase 1: Critical Security Fixes

-- 1. Drop the conflicting "Deny anonymous access" policy on profiles
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- 2. Remove email column from profiles table (it's already in auth.users)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- 3. Add proper SELECT policy for profiles - authenticated users can view all profiles
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 4. Update the handle_new_user function to not insert email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert profile without email (it's in auth.users)
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  
  -- Assign default listener role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'listener');
  
  RETURN NEW;
END;
$$;

-- Phase 2: Storage Security Enhancements

-- Drop ALL existing storage policies first
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload snippets to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update own snippets" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete own snippets" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload covers to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update own covers" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete own covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Snippets bucket: Only artists can upload audio files (with SELECT for public access)
CREATE POLICY "Snippets are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'snippets');

CREATE POLICY "Artists can upload snippets to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'snippets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.extension(name) IN ('mp3', 'wav', 'ogg', 'm4a', 'aac'))
);

CREATE POLICY "Artists can update own snippets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'snippets' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'snippets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artists can delete own snippets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'snippets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Covers bucket: Only artists can upload image files (with SELECT for public access)
CREATE POLICY "Covers are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'covers');

CREATE POLICY "Artists can upload covers to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp', 'gif'))
);

CREATE POLICY "Artists can update own covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artists can delete own covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars bucket: Users can upload their own avatar images (with SELECT for public access)
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp'))
);

CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update bucket configurations with file size limits
UPDATE storage.buckets 
SET file_size_limit = 10485760, -- 10MB for audio files
    allowed_mime_types = ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac']
WHERE id = 'snippets';

UPDATE storage.buckets 
SET file_size_limit = 5242880, -- 5MB for images
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'covers';

UPDATE storage.buckets 
SET file_size_limit = 5242880, -- 5MB for images
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatars';