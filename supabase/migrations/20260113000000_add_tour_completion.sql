-- Add has_completed_tour column to profiles table for persistent tour tracking
-- This ensures the onboarding tour only shows for truly new users, not returning users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_tour BOOLEAN DEFAULT FALSE;
