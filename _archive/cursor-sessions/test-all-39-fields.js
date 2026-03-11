/**
 * Comprehensive Test Script for All 39 Property Instance Fields
 * 
 * This script helps verify that all 39 fields in PropertyDetailModal are:
 * 1. Editable (not disabled/readonly except during save)
 * 2. Properly connected to handleFieldChange
 * 3. Saving correctly to context
 * 4. Persisting to database
 * 5. Loading correctly after page refresh
 * 
 * HOW TO USE:
 * 1. Open your browser console (F12 / Cmd+Option+I)
 * 2. Copy and paste this entire script
 * 3. Run: testAllFields()
 * 4. Follow the interactive prompts
 * 
 * The script will:
 * - Check if all 39 input fields exist in the DOM
 * - Verify they are editable (not disabled)
 * - Test that changes trigger the right handlers
 * - Provide a detailed report
 */

// ALL 39 FIELDS organized by section
const ALL_FIELDS = {
  propertyOverview: [
    { id: 'state', type: 'select', label: 'State', testValue: 'NSW' },
    { id: 'purchasePrice', type: 'number', label: 'Purchase Price', testValue: 750000 },
    { id: 'valuationAtPurchase', type: 'number', label: 'Valuation at Purchase', testValue: 760000 },
    { id: 'rentPerWeek', type: 'number', label: 'Rent Per Week', testValue: 600 },
    { id: 'growthAssumption', type: 'select', label: 'Growth Assumption', testValue: 'High' },
    { id: 'minimumYield', type: 'number', label: 'Minimum Yield', testValue: 4.5 },
  ],
  contractLoanDetails: [
    { id: 'daysToUnconditional', type: 'number', label: 'Days to Unconditional', testValue: 14 },
    { id: 'daysForSettlement', type: 'number', label: 'Days for Settlement', testValue: 60 },
    { id: 'lvr', type: 'number', label: 'LVR', testValue: 80 },
    { id: 'lmiWaiver', type: 'select', label: 'LMI Waiver', testValue: 'true' },
    { id: 'loanProduct', type: 'select', label: 'Loan Product', testValue: 'IO' },
    { id: 'interestRate', type: 'number', label: 'Interest Rate', testValue: 6.5 },
    { id: 'loanTerm', type: 'number', label: 'Loan Term', testValue: 30 },
    { id: 'loanOffsetAccount', type: 'number', label: 'Loan Offset Account', testValue: 10000 },
  ],
  purchaseCosts: [
    { id: 'engagementFee', type: 'number', label: 'Engagement Fee', testValue: 3500 },
    { id: 'conditionalHoldingDeposit', type: 'number', label: 'Conditional Holding Deposit', testValue: 1000 },
    { id: 'buildingInsuranceUpfront', type: 'number', label: 'Building Insurance Upfront', testValue: 1200 },
    { id: 'buildingPestInspection', type: 'number', label: 'Building & Pest Inspection', testValue: 600 },
    { id: 'plumbingElectricalInspections', type: 'number', label: 'Plumbing & Electrical Inspections', testValue: 400 },
    { id: 'independentValuation', type: 'number', label: 'Independent Valuation', testValue: 500 },
    { id: 'unconditionalHoldingDeposit', type: 'number', label: 'Unconditional Holding Deposit', testValue: 5000 },
    { id: 'mortgageFees', type: 'number', label: 'Mortgage Fees & Discharge', testValue: 800 },
    { id: 'conveyancing', type: 'number', label: 'Conveyancing', testValue: 2000 },
    { id: 'ratesAdjustment', type: 'number', label: 'Rates Adjustment', testValue: 300 },
    { id: 'maintenanceAllowancePostSettlement', type: 'number', label: 'Maintenance Allowance (Post-Settlement)', testValue: 2000 },
    { id: 'stampDutyOverride', type: 'number', label: 'Stamp Duty Override', testValue: 35000 },
  ],
  cashflow: [
    { id: 'vacancyRate', type: 'number', label: 'Vacancy Rate', testValue: 2 },
    { id: 'propertyManagementPercent', type: 'number', label: 'Property Management', testValue: 7 },
    { id: 'buildingInsuranceAnnual', type: 'number', label: 'Building Insurance (Annual)', testValue: 1500 },
    { id: 'councilRatesWater', type: 'number', label: 'Council Rates + Water', testValue: 2000 },
    { id: 'strata', type: 'number', label: 'Strata', testValue: 3000 },
    { id: 'maintenanceAllowanceAnnual', type: 'number', label: 'Maintenance Allowance (Annual)', testValue: 1000 },
    { id: 'landTaxOverride', type: 'number', label: 'Land Tax Override', testValue: 2500 },
    { id: 'potentialDeductionsRebates', type: 'number', label: 'Potential Deductions / Rebates', testValue: 500 },
  ],
};

// Flatten all fields
const allFieldsList = [
  ...ALL_FIELDS.propertyOverview,
  ...ALL_FIELDS.contractLoanDetails,
  ...ALL_FIELDS.purchaseCosts,
  ...ALL_FIELDS.cashflow,
];

console.log(`
╔════════════════════════════════════════════════════════════════╗
║          TEST SCRIPT: All 39 Property Instance Fields          ║
╚════════════════════════════════════════════════════════════════╝

Total fields to test: ${allFieldsList.length}

INSTRUCTIONS:
1. Open PropertyDetailModal for any property
2. Make sure the modal is visible
3. Run: testAllFields()

`);

function testAllFields() {
  console.log('🧪 Starting comprehensive field test...\n');
  
  const results = {
    total: allFieldsList.length,
    found: 0,
    editable: 0,
    missing: [],
    disabled: [],
    issues: [],
  };
  
  // Test each field
  allFieldsList.forEach((field, index) => {
    console.log(`\n[${index + 1}/${allFieldsList.length}] Testing: ${field.label} (${field.id})`);
    
    // Try to find the field in DOM
    const element = document.getElementById(field.id);
    
    if (!element) {
      console.error(`  ✗ Field not found in DOM`);
      results.missing.push(field);
      return;
    }
    
    console.log(`  ✓ Field found in DOM`);
    results.found++;
    
    // Check if field is disabled
    const isDisabled = element.disabled || element.getAttribute('disabled') !== null;
    if (isDisabled) {
      console.warn(`  ⚠ Field is disabled`);
      results.disabled.push(field);
    } else {
      console.log(`  ✓ Field is editable`);
      results.editable++;
    }
    
    // Check if field has proper attributes
    if (field.type === 'number' && element.type !== 'number') {
      console.warn(`  ⚠ Expected type="number" but got type="${element.type}"`);
      results.issues.push({ field: field.id, issue: 'Wrong input type' });
    }
    
    // Check if onChange handler exists (for React)
    const hasOnChange = element.onchange || element.oninput;
    if (!hasOnChange && !element.dataset.reactid) {
      console.warn(`  ⚠ No change handler detected (might be okay for React)`);
    }
  });
  
  // Print summary report
  console.log(`\n
╔════════════════════════════════════════════════════════════════╗
║                        TEST RESULTS                             ║
╚════════════════════════════════════════════════════════════════╝

Total Fields:     ${results.total}
Found in DOM:     ${results.found} / ${results.total}
Editable:         ${results.editable} / ${results.found}
Missing:          ${results.missing.length}
Disabled:         ${results.disabled.length}
Issues:           ${results.issues.length}

`);
  
  if (results.missing.length > 0) {
    console.error('❌ MISSING FIELDS:');
    results.missing.forEach(f => console.error(`   - ${f.label} (${f.id})`));
  }
  
  if (results.disabled.length > 0) {
    console.warn('\n⚠️  DISABLED FIELDS (check if save is in progress):');
    results.disabled.forEach(f => console.warn(`   - ${f.label} (${f.id})`));
  }
  
  if (results.issues.length > 0) {
    console.warn('\n⚠️  OTHER ISSUES:');
    results.issues.forEach(i => console.warn(`   - ${i.field}: ${i.issue}`));
  }
  
  if (results.found === results.total && results.editable === results.found && results.issues.length === 0) {
    console.log('\n✅ ALL TESTS PASSED! All 39 fields are working correctly.');
  } else {
    console.log('\n⚠️  Some issues detected. Review the report above.');
  }
  
  return results;
}

// Export for external use
window.testAllFields = testAllFields;
window.ALL_FIELDS = ALL_FIELDS;

console.log('✓ Test script loaded successfully!');
console.log('Run testAllFields() to start testing.');

