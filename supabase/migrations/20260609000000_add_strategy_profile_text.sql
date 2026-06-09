-- Add strategy_profile_text column to profiles table
-- Free-text field where BAs describe their investment philosophy in plain English.
-- Gets injected into the chatbot system prompt to bias AI recommendations.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strategy_profile_text TEXT;
