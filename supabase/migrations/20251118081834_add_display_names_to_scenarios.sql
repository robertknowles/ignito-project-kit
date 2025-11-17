-- Add display name fields to scenarios table for client portal cover page
-- These fields store the names that will be displayed on the shared client report

-- Add new columns for display names
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS client_display_name TEXT,
ADD COLUMN IF NOT EXISTS agent_display_name TEXT,
ADD COLUMN IF NOT EXISTS company_display_name TEXT DEFAULT 'Ignito';

-- Add comments explaining the purpose of these fields
COMMENT ON COLUMN scenarios.client_display_name IS 'Client name displayed on the client portal cover page';
COMMENT ON COLUMN scenarios.agent_display_name IS 'Agent name displayed on the client portal cover page';
COMMENT ON COLUMN scenarios.company_display_name IS 'Company name displayed on the client portal cover page (defaults to Ignito)';

-- Update existing scenarios to populate these fields
-- Join with clients table to get client name and profiles table to get agent name
UPDATE scenarios s
SET 
  client_display_name = COALESCE(c.name, c.email, 'Client'),
  agent_display_name = COALESCE(p.full_name, 'Agent'),
  company_display_name = COALESCE(s.company_display_name, 'Ignito')
FROM clients c
LEFT JOIN profiles p ON c.user_id = p.id
WHERE s.client_id = c.id
  AND (s.client_display_name IS NULL OR s.agent_display_name IS NULL);

