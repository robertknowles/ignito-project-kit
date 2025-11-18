-- Add share_id column to scenarios table
ALTER TABLE public.scenarios 
ADD COLUMN IF NOT EXISTS share_id TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_scenarios_share_id 
ON public.scenarios(share_id);

-- Add comment
COMMENT ON COLUMN public.scenarios.share_id IS 'Unique shareable ID for public report access';

-- Allow public read access to scenarios with share_id
CREATE POLICY "Public read access for shared scenarios"
ON public.scenarios
FOR SELECT
TO anon
USING (share_id IS NOT NULL);


