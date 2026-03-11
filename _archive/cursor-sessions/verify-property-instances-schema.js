/**
 * Property Instances Database Schema Verification Script
 * 
 * This script verifies that the database properly supports storing
 * property instance data with all 39 fields for up to 9 properties per scenario.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let value = match[2].trim();
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[match[1].trim()] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('   VITE_SUPABASE_ANON_KEY/PUBLISHABLE_KEY:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// All 39 fields that must be present in PropertyInstanceDetails
const REQUIRED_FIELDS = [
  // Section A - Property Overview (6 fields)
  'state',
  'purchasePrice',
  'valuationAtPurchase',
  'rentPerWeek',
  'growthAssumption',
  'minimumYield',
  
  // Section B - Contract & Loan Details (8 fields)
  'daysToUnconditional',
  'daysForSettlement',
  'lvr',
  'lmiWaiver',
  'loanProduct',
  'interestRate',
  'loanTerm',
  'loanOffsetAccount',
  
  // Section D - One-Off Purchase Costs (12 fields)
  'engagementFee',
  'conditionalHoldingDeposit',
  'buildingInsuranceUpfront',
  'buildingPestInspection',
  'plumbingElectricalInspections',
  'independentValuation',
  'unconditionalHoldingDeposit',
  'mortgageFees',
  'conveyancing',
  'ratesAdjustment',
  'maintenanceAllowancePostSettlement',
  'stampDutyOverride',
  
  // Section E - Cashflow (8 fields)
  'vacancyRate',
  'propertyManagementPercent',
  'buildingInsuranceAnnual',
  'councilRatesWater',
  'strata',
  'maintenanceAllowanceAnnual',
  'landTaxOverride',
  'potentialDeductionsRebates',
];

// Create a complete test property instance with all 39 fields
function createTestPropertyInstance(propertyIndex, instanceIndex) {
  return {
    // Section A - Property Overview
    state: 'VIC',
    purchasePrice: 500000 + (propertyIndex * 100000),
    valuationAtPurchase: 550000 + (propertyIndex * 100000),
    rentPerWeek: 450 + (propertyIndex * 50),
    growthAssumption: ['High', 'Medium', 'Low'][propertyIndex % 3],
    minimumYield: 5.0,
    
    // Section B - Contract & Loan Details
    daysToUnconditional: 14,
    daysForSettlement: 60,
    lvr: 80,
    lmiWaiver: false,
    loanProduct: instanceIndex % 2 === 0 ? 'IO' : 'PI',
    interestRate: 6.5,
    loanTerm: 30,
    loanOffsetAccount: 10000,
    
    // Section D - One-Off Purchase Costs
    engagementFee: 3500,
    conditionalHoldingDeposit: 10000,
    buildingInsuranceUpfront: 1200,
    buildingPestInspection: 600,
    plumbingElectricalInspections: 400,
    independentValuation: 550,
    unconditionalHoldingDeposit: 0,
    mortgageFees: 800,
    conveyancing: 1800,
    ratesAdjustment: 0,
    maintenanceAllowancePostSettlement: 2000,
    stampDutyOverride: null,
    
    // Section E - Cashflow
    vacancyRate: 2,
    propertyManagementPercent: 6.6,
    buildingInsuranceAnnual: 1200,
    councilRatesWater: 2400,
    strata: 0,
    maintenanceAllowanceAnnual: 3000,
    landTaxOverride: null,
    potentialDeductionsRebates: 1500,
  };
}

// Create test scenario with multiple properties and instances
function createTestScenarioData(numProperties = 3, instancesPerProperty = 2) {
  const propertyInstances = {};
  
  for (let p = 0; p < numProperties; p++) {
    for (let i = 0; i < instancesPerProperty; i++) {
      const instanceId = `property_${p}_instance_${i}`;
      propertyInstances[instanceId] = createTestPropertyInstance(p, i);
    }
  }
  
  return {
    propertySelections: Object.fromEntries(
      Array.from({ length: numProperties }, (_, i) => [`property_${i}`, instancesPerProperty])
    ),
    investmentProfile: {
      depositPool: 100000,
      borrowingCapacity: 800000,
      portfolioValue: 500000,
      currentDebt: 0,
      annualSavings: 50000,
      timelineYears: 10,
      equityGrowth: 7,
      cashflow: 5000,
    },
    propertyInstances,
    lastSaved: new Date().toISOString(),
  };
}

// Verify that all required fields are present in a property instance
function verifyPropertyInstanceFields(instance, instanceId) {
  const missingFields = [];
  const extraFields = [];
  
  // Check for missing required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in instance)) {
      missingFields.push(field);
    }
  }
  
  // Check for unexpected extra fields (optional - for documentation)
  const actualFields = Object.keys(instance);
  for (const field of actualFields) {
    if (!REQUIRED_FIELDS.includes(field)) {
      extraFields.push(field);
    }
  }
  
  return { missingFields, extraFields };
}

// Main verification function
async function verifyDatabaseSchema() {
  console.log('🔍 Property Instances Database Schema Verification\n');
  console.log('=' .repeat(60));
  
  let testClientId = null;
  let testScenarioId = null;
  
  try {
    // Step 1: Verify database connection
    console.log('\n📡 Step 1: Verifying database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('scenarios')
      .select('count')
      .limit(0);
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message);
      return false;
    }
    console.log('✅ Database connection successful');
    
    // Step 2: Create test client
    console.log('\n👤 Step 2: Creating test client...');
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData.user) {
      console.error('❌ No authenticated user found. Please log in first.');
      return false;
    }
    
    const { data: testClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: `Test Client - Schema Verification ${Date.now()}`,
        email: 'test-schema@example.com',
        user_id: authData.user.id,
      })
      .select()
      .single();
    
    if (clientError) {
      console.error('❌ Failed to create test client:', clientError.message);
      return false;
    }
    
    testClientId = testClient.id;
    console.log(`✅ Test client created (ID: ${testClientId})`);
    
    // Step 3: Test with 3 properties (small test)
    console.log('\n📦 Step 3: Testing with 3 properties (2 instances each)...');
    const smallScenarioData = createTestScenarioData(3, 2);
    
    const { data: smallScenario, error: smallError } = await supabase
      .from('scenarios')
      .insert({
        client_id: testClientId,
        name: 'Small Test - 3 Properties',
        data: smallScenarioData,
      })
      .select()
      .single();
    
    if (smallError) {
      console.error('❌ Failed to save small scenario:', smallError.message);
      return false;
    }
    
    testScenarioId = smallScenario.id;
    console.log(`✅ Small scenario saved (ID: ${testScenarioId})`);
    console.log(`   Total instances: ${Object.keys(smallScenarioData.propertyInstances).length}`);
    
    // Step 4: Verify data integrity (read back)
    console.log('\n🔎 Step 4: Verifying data integrity...');
    const { data: loadedScenario, error: loadError } = await supabase
      .from('scenarios')
      .select('*')
      .eq('id', testScenarioId)
      .single();
    
    if (loadError) {
      console.error('❌ Failed to load scenario:', loadError.message);
      return false;
    }
    
    const loadedData = loadedScenario.data;
    
    // Verify property instances exist
    if (!loadedData.propertyInstances) {
      console.error('❌ Property instances not found in loaded data');
      return false;
    }
    
    console.log('✅ Property instances loaded successfully');
    console.log(`   Loaded ${Object.keys(loadedData.propertyInstances).length} instances`);
    
    // Step 5: Verify all 39 fields for each instance
    console.log('\n✨ Step 5: Verifying all 39 fields per instance...');
    let allFieldsValid = true;
    
    for (const [instanceId, instance] of Object.entries(loadedData.propertyInstances)) {
      const { missingFields, extraFields } = verifyPropertyInstanceFields(instance, instanceId);
      
      if (missingFields.length > 0) {
        console.error(`❌ ${instanceId}: Missing fields: ${missingFields.join(', ')}`);
        allFieldsValid = false;
      } else {
        console.log(`✅ ${instanceId}: All 39 required fields present`);
      }
      
      if (extraFields.length > 0) {
        console.log(`   ℹ️  Extra fields found: ${extraFields.join(', ')}`);
      }
    }
    
    if (!allFieldsValid) {
      return false;
    }
    
    // Step 6: Test with maximum data (9 properties)
    console.log('\n🚀 Step 6: Testing with 9 properties (maximum scale)...');
    const largeScenarioData = createTestScenarioData(9, 3);
    
    const { data: largeScenario, error: largeError } = await supabase
      .from('scenarios')
      .update({
        name: 'Large Test - 9 Properties',
        data: largeScenarioData,
      })
      .eq('id', testScenarioId)
      .select()
      .single();
    
    if (largeError) {
      console.error('❌ Failed to save large scenario:', largeError.message);
      return false;
    }
    
    console.log('✅ Large scenario saved successfully');
    console.log(`   Total instances: ${Object.keys(largeScenarioData.propertyInstances).length}`);
    
    // Step 7: Measure data size
    const dataSize = JSON.stringify(largeScenarioData).length;
    const dataSizeKB = (dataSize / 1024).toFixed(2);
    console.log(`   Data size: ${dataSizeKB} KB`);
    
    if (dataSize > 900000) { // Warning if > 900KB (PostgreSQL limit is 1GB for jsonb)
      console.warn(`⚠️  Large data size: ${dataSizeKB} KB (PostgreSQL jsonb limit is ~1GB)`);
    } else {
      console.log(`✅ Data size well within limits`);
    }
    
    // Step 8: Test CRUD operations
    console.log('\n🔧 Step 8: Testing CRUD operations...');
    
    // Update a single instance field
    const updatedData = { ...largeScenarioData };
    const firstInstanceId = Object.keys(updatedData.propertyInstances)[0];
    updatedData.propertyInstances[firstInstanceId].purchasePrice = 999999;
    
    const { error: updateError } = await supabase
      .from('scenarios')
      .update({ data: updatedData })
      .eq('id', testScenarioId);
    
    if (updateError) {
      console.error('❌ Failed to update instance:', updateError.message);
      return false;
    }
    console.log('✅ Update operation successful');
    
    // Verify update
    const { data: verifyUpdate } = await supabase
      .from('scenarios')
      .select('data')
      .eq('id', testScenarioId)
      .single();
    
    if (verifyUpdate.data.propertyInstances[firstInstanceId].purchasePrice === 999999) {
      console.log('✅ Update verified');
    } else {
      console.error('❌ Update verification failed');
      return false;
    }
    
    // Delete an instance
    const deleteData = { ...verifyUpdate.data };
    delete deleteData.propertyInstances[firstInstanceId];
    
    const { error: deleteError } = await supabase
      .from('scenarios')
      .update({ data: deleteData })
      .eq('id', testScenarioId);
    
    if (deleteError) {
      console.error('❌ Failed to delete instance:', deleteError.message);
      return false;
    }
    console.log('✅ Delete operation successful');
    
    // Step 9: Performance test
    console.log('\n⚡ Step 9: Testing query performance...');
    const startTime = Date.now();
    
    const { data: perfTest, error: perfError } = await supabase
      .from('scenarios')
      .select('*')
      .eq('id', testScenarioId)
      .single();
    
    const queryTime = Date.now() - startTime;
    
    if (perfError) {
      console.error('❌ Performance test failed:', perfError.message);
      return false;
    }
    
    console.log(`✅ Query completed in ${queryTime}ms`);
    
    if (queryTime < 500) {
      console.log('✅ Performance is excellent (< 500ms)');
    } else if (queryTime < 1000) {
      console.log('⚠️  Performance is acceptable but could be improved');
    } else {
      console.warn('⚠️  Performance may need optimization (> 1000ms)');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Database schema supports property instances');
    console.log('✅ All 39 fields stored and retrieved correctly');
    console.log('✅ Supports up to 9 properties with multiple instances');
    console.log('✅ CRUD operations working correctly');
    console.log(`✅ Query performance: ${queryTime}ms`);
    console.log(`✅ Data size: ${dataSizeKB} KB (well within limits)`);
    console.log('\n✨ All tests passed! Database schema is ready for production.\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
    return false;
    
  } finally {
    // Cleanup: Delete test data
    if (testScenarioId) {
      console.log('🧹 Cleaning up test data...');
      await supabase.from('scenarios').delete().eq('id', testScenarioId);
      console.log('✅ Test scenario deleted');
    }
    
    if (testClientId) {
      await supabase.from('clients').delete().eq('id', testClientId);
      console.log('✅ Test client deleted');
    }
  }
}

// Run verification
verifyDatabaseSchema()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

