-- Add has_completed_property_onboarding column to profiles table
-- This tracks whether a user has completed the property blocks onboarding flow
-- New users will see the onboarding modal until they complete or skip it
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_property_onboarding BOOLEAN DEFAULT FALSE;
