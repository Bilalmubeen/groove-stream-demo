-- Update handle_new_user to assign 'listener' role (not 'user')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  );
  
  -- Assign default listener role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'listener');
  
  RETURN NEW;
END;
$$;