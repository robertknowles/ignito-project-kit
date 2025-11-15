-- Optional: Property Instances Schema Optimization
-- 
-- This migration is OPTIONAL and should only be applied if:
-- 1. You have > 1000 scenarios in the database
-- 2. Query performance on scenarios table is slow (> 1 second)
-- 3. You frequently query specific property instance fields
--
-- Current Status: NOT NEEDED - Current JSONB approach is sufficient
-- Created: 2025-11-15
-- Status: OPTIONAL/FUTURE

-- ============================================================================
-- OPTION 1: Add GIN Index for JSONB Queries (Recommended if needed)
-- ============================================================================
-- This improves queries that search within the data column
-- Overhead: ~10-20% increase in storage, slightly slower writes
-- Benefit: 10-100x faster queries on nested JSON fields

-- Uncomment to apply:
-- CREATE INDEX IF NOT EXISTS idx_scenarios_data_gin 
-- ON scenarios USING GIN (data);

-- For more specific indexing on propertyInstances:
-- CREATE INDEX IF NOT EXISTS idx_scenarios_property_instances 
-- ON scenarios USING GIN ((data->'propertyInstances'));

-- ============================================================================
-- OPTION 2: Add Check Constraint for Data Integrity (Recommended for production)
-- ============================================================================
-- Ensures data column has required structure

-- Uncomment to apply:
-- ALTER TABLE scenarios
-- ADD CONSTRAINT check_scenarios_data_structure
-- CHECK (
--   data IS NOT NULL AND
--   data ? 'propertySelections' AND
--   data ? 'investmentProfile' AND
--   data ? 'lastSaved'
-- );

-- ============================================================================
-- OPTION 3: Add Validation for Property Instance Fields
-- ============================================================================
-- This is complex and not recommended - use application-level validation instead

-- Example (DO NOT USE - for reference only):
-- CREATE OR REPLACE FUNCTION validate_property_instance(instance jsonb)
-- RETURNS boolean AS $$
-- BEGIN
--   -- Check required fields exist
--   RETURN (
--     instance ? 'state' AND
--     instance ? 'purchasePrice' AND
--     instance ? 'valuationAtPurchase' AND
--     -- ... all 39 fields ...
--     instance ? 'potentialDeductionsRebates'
--   );
-- END;
-- $$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- OPTION 4: Separate Property Instances Table (NOT RECOMMENDED)
-- ============================================================================
-- Only consider this if:
-- - You have millions of property instances
-- - You need to query instances independently of scenarios
-- - You need to share instances between scenarios
--
-- For our use case (< 10,000 scenarios), JSONB is superior.

-- Example structure (DO NOT USE unless absolutely necessary):
-- CREATE TABLE property_instances (
--   id SERIAL PRIMARY KEY,
--   scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
--   instance_key TEXT NOT NULL, -- e.g., 'property_0_instance_0'
--   
--   -- Section A: Property Overview (6 fields)
--   state TEXT NOT NULL,
--   purchase_price NUMERIC NOT NULL,
--   valuation_at_purchase NUMERIC NOT NULL,
--   rent_per_week NUMERIC NOT NULL,
--   growth_assumption TEXT CHECK (growth_assumption IN ('High', 'Medium', 'Low')),
--   minimum_yield NUMERIC NOT NULL,
--   
--   -- Section B: Contract & Loan Details (8 fields)
--   days_to_unconditional INTEGER NOT NULL,
--   days_for_settlement INTEGER NOT NULL,
--   lvr NUMERIC NOT NULL,
--   lmi_waiver BOOLEAN NOT NULL,
--   loan_product TEXT CHECK (loan_product IN ('IO', 'PI')),
--   interest_rate NUMERIC NOT NULL,
--   loan_term INTEGER NOT NULL,
--   loan_offset_account NUMERIC NOT NULL,
--   
--   -- Section D: One-Off Purchase Costs (12 fields)
--   engagement_fee NUMERIC NOT NULL,
--   conditional_holding_deposit NUMERIC NOT NULL,
--   building_insurance_upfront NUMERIC NOT NULL,
--   building_pest_inspection NUMERIC NOT NULL,
--   plumbing_electrical_inspections NUMERIC NOT NULL,
--   independent_valuation NUMERIC NOT NULL,
--   unconditional_holding_deposit NUMERIC NOT NULL,
--   mortgage_fees NUMERIC NOT NULL,
--   conveyancing NUMERIC NOT NULL,
--   rates_adjustment NUMERIC NOT NULL,
--   maintenance_allowance_post_settlement NUMERIC NOT NULL,
--   stamp_duty_override NUMERIC,
--   
--   -- Section E: Cashflow (8 fields)
--   vacancy_rate NUMERIC NOT NULL,
--   property_management_percent NUMERIC NOT NULL,
--   building_insurance_annual NUMERIC NOT NULL,
--   council_rates_water NUMERIC NOT NULL,
--   strata NUMERIC NOT NULL,
--   maintenance_allowance_annual NUMERIC NOT NULL,
--   land_tax_override NUMERIC,
--   potential_deductions_rebates NUMERIC NOT NULL,
--   
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   
--   UNIQUE (scenario_id, instance_key)
-- );

-- CREATE INDEX idx_property_instances_scenario ON property_instances(scenario_id);
-- CREATE INDEX idx_property_instances_key ON property_instances(instance_key);

-- Enable RLS
-- ALTER TABLE property_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- CREATE POLICY "Users can view their own property instances"
-- ON property_instances FOR SELECT
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM scenarios s
--     JOIN clients c ON c.id = s.client_id
--     WHERE s.id = property_instances.scenario_id
--     AND c.user_id = auth.uid()
--   )
-- );

-- CREATE POLICY "Users can insert property instances for their scenarios"
-- ON property_instances FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM scenarios s
--     JOIN clients c ON c.id = s.client_id
--     WHERE s.id = property_instances.scenario_id
--     AND c.user_id = auth.uid()
--   )
-- );

-- CREATE POLICY "Users can update their own property instances"
-- ON property_instances FOR UPDATE
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM scenarios s
--     JOIN clients c ON c.id = s.client_id
--     WHERE s.id = property_instances.scenario_id
--     AND c.user_id = auth.uid()
--   )
-- );

-- CREATE POLICY "Users can delete their own property instances"
-- ON property_instances FOR DELETE
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM scenarios s
--     JOIN clients c ON c.id = s.client_id
--     WHERE s.id = property_instances.scenario_id
--     AND c.user_id = auth.uid()
--   )
-- );

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- To rollback Option 1 (GIN indexes):
-- DROP INDEX IF EXISTS idx_scenarios_data_gin;
-- DROP INDEX IF EXISTS idx_scenarios_property_instances;

-- To rollback Option 2 (check constraint):
-- ALTER TABLE scenarios DROP CONSTRAINT IF EXISTS check_scenarios_data_structure;

-- To rollback Option 3 (validation function):
-- DROP FUNCTION IF EXISTS validate_property_instance(jsonb);

-- To rollback Option 4 (separate table):
-- DROP TABLE IF EXISTS property_instances CASCADE;

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================

-- Current recommendation (as of 2025-11-15):
--   ✅ Keep JSONB approach (what we have now)
--   ✅ No migration needed
--   ✅ Application-level validation is sufficient
--   ✅ Performance is excellent for our scale
--
-- Only apply these migrations if:
--   ⚠️ You have proven performance issues
--   ⚠️ You've exhausted application-level optimizations
--   ⚠️ You've measured the impact with real data
--
-- Remember: Premature optimization is the root of all evil!

-- ============================================================================

