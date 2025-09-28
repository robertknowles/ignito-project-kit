-- Add missing columns to clients table
ALTER TABLE public.clients 
ADD COLUMN email text,
ADD COLUMN phone text,
ADD COLUMN notes text;