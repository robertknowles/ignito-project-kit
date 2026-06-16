-- Company strategies: replace the single free-text strategy_profile_text with a
-- list of NAMED strategies ("Company Strategy 1/2/3"). The buyers' agent picks
-- one per client via pills in the chat input; its text is injected into the AI
-- prompt and the AI infers the best-fit engine preset from it + the brief.
-- Each item: { id, name, text }.
--
-- The legacy strategy_profile_text column is kept (not dropped) so this is
-- non-destructive; nothing reads it after this change.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strategy_profiles JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: any existing free-text strategy becomes the firm's first named
-- strategy so current users keep their setup.
UPDATE profiles
SET strategy_profiles = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', 'Company Strategy 1',
    'text', strategy_profile_text
  )
)
WHERE strategy_profile_text IS NOT NULL
  AND length(trim(strategy_profile_text)) > 0
  AND (strategy_profiles IS NULL OR strategy_profiles = '[]'::jsonb);
