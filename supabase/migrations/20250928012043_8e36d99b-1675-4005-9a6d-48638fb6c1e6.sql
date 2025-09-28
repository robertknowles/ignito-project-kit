-- Remove the foreign key constraint from clients to profiles
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;

-- Add a direct reference to auth.users instead
-- Note: We'll just remove the constraint for now since auth.users foreign keys should be avoided in production