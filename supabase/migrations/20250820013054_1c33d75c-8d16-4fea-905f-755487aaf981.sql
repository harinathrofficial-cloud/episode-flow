-- Insert a profile for existing users who don't have one
INSERT INTO public.profiles (user_id, first_name, last_name)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'first_name', 'User'),
  COALESCE(au.raw_user_meta_data ->> 'last_name', '')
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL;