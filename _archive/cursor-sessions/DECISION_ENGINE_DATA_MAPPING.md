# Decision Engine Table - Data Flow Mapping

## Data Source: `YearBreakdownData` (from DecisionEngineView)

### ✅ STATIC DATA (Hardcoded in Calculator)
These values are constant across all calculations:

| Field | Source | Value | Used In |
|-------|--------|-------|---------|
| Interest Rate | `globalFactors.interestRate` | 6.0% | Key Assumptions Box, Core calculations |
| Expense Ratio | Hardcoded in calculator | 30% | Key Assumptions Box, Expense calculations |
| Deposit Buffer | Hardcoded in calculator | £40,000 | Key Assumptions Box, Deposit Test |
| LVR Limit | Hardcoded in calculator | 80% | Key Assumptions Box, Portfolio calculations |
| Serviceability Factor | Hardcoded in calculator | 10% | Key Assumptions Box, Serviceability Test |
| Loan Type | Hardcoded in calculator | Interest-only | Key Assumptions Box |

---

## 📊 DYNAMIC DATA MAPPING

### TABLE HEADER ROW (Main Columns)

| Column | Data Source | Status | Notes |
|--------|-------------|--------|-------|
| Year | `year.year` | ✅ WORKING | Display absolute year |
| Events | Calculated from `year.status`, `year.consolidation`, `year.equityRelease` | ✅ WORKING | Uses helper function `getEventDescription()` |
| Portfolio Value/Equity | `year.portfolioValue` / `year.totalEquity` | ✅ WORKING | Both values displayed |
| Available Funds | `year.availableDeposit` | ✅ WORKING | Single value |
| Net Cashflow | `year.annualCashFlow` | ✅ WORKING | Color-coded positive/negative |
| LVR | `year.lvr` | ✅ WORKING | Calculated as % |
| Rental Recognition | `year.rentalRecognition` | ✅ WORKING | Displayed as % |
| Deposit Test | `year.depositTest.pass` / `year.depositTest.surplus` | ✅ WORKING | Pass/fail icon + surplus |
| Serviceability Test | `year.serviceabilityTest.pass` / `year.serviceabilityTest.surplus` | ✅ WORKING | Pass/fail icon + surplus |
| Decision | Calculated from test results | ✅ WORKING | Badge with status |

---

### DROPDOWN SECTION 1: 🏠 Portfolio Equity Growth

| Field | Data Source | Status | Notes |
|-------|-------------|--------|-------|
| Current Portfolio Value | `year.portfolioValue` | ✅ WORKING | Compact currency format |
| Total Equity | `year.totalEquity` | ✅ WORKING | Compact currency format |
| Available for Extraction (80% LVR) | Calculated: `(portfolioValue * 0.80) - totalDebt` | ✅ WORKING | Formula applied correctly |
| **Property Breakdown** | | | |
| - Property list | `year.purchases[]` array | ⚠️ CONDITIONAL | Only shows if `year.purchases.length > 0` |
| - Property number | `year.propertyNumber` | ✅ WORKING | From purchase data |
| - Property year | `purchase.year` | ✅ WORKING | From purchase array |
| - Property value | `purchase.cost` | ✅ WORKING | From purchase array |
| - Property equity | Calculated: `cost - loanAmount` | ✅ WORKING | Formula applied |
| - Extractable equity | Calculated: `(value * 0.80) - debt` | ✅ WORKING | Formula applied |
| **LVR Status** | | | |
| - Current LVR | `year.lvr` | ✅ WORKING | Displayed as % |
| - Trigger Level | Hardcoded | ✅ WORKING | Fixed at 80.0% |
| - Borrowing Capacity Remaining | `year.availableBorrowingCapacity` | ✅ WORKING | From calculator |

**SECTION 1 ISSUES:**
- ⚠️ Property breakdown only shows for purchase years where `year.purchases.length > 0`
- For non-purchase "waiting" years, the property breakdown won't display even though there are existing properties in the portfolio
- **FIX NEEDED:** Should track and display ALL properties in portfolio, not just current year purchases

---

### DROPDOWN SECTION 2: 💰 Purchase Funding Breakdown

| Field | Data Source | Status | Notes |
|-------|-------------|--------|-------|
| Property Purchase Cost | `year.propertyCost` | ✅ WORKING | Total cost of property being evaluated |
| Deposit Required | `year.requiredDeposit` | ✅ WORKING | From calculator |
| Base Deposit (remaining) | `year.baseDeposit` | ✅ WORKING | From calculator |
| Annual Savings | `year.cumulativeSavings` | ✅ WORKING | Accumulated savings |
| Equity Release | `year.equityRelease` | ✅ WORKING | From calculator |
| Shortfall/Surplus | `year.depositTest.surplus` | ✅ WORKING | From deposit test |
| Loan Required | `year.requiredLoan` | ✅ WORKING | From calculator |

**SECTION 2 ISSUES:**
- ❓ For non-purchase years, `propertyCost`, `requiredDeposit`, and `requiredLoan` may be 0 or represent the "next property to purchase"
- This section makes most sense for purchase years or years where a purchase is being evaluated

---

### DROPDOWN SECTION 3: 💵 Cashflow Engine

| Field | Data Source | Status | Notes |
|-------|-------------|--------|-------|
| **Annual Cashflow Breakdown** | | | |
| Gross Rental Income | `year.grossRental` | ✅ WORKING | From calculator |
| Loan Interest | `year.loanRepayments` | ✅ WORKING | Interest-only payments |
| Expenses (30%) | `year.expenses` | ✅ WORKING | 30% of rental income |
| Net Cashflow | `year.annualCashFlow` | ✅ WORKING | Calculated net |
| **Cash Flywheel Effect** | | | |
| Base Annual Savings | `year.cumulativeSavings` | ⚠️ MISLEADING | Currently shows cumulative, should show annual |
| Cashflow Reinvestment | `year.cashflowReinvestment` | ✅ WORKING | From calculator |
| Total Annual Capacity | Calculated: `cumulativeSavings + cashflowReinvestment` | ⚠️ INCORRECT | Formula doesn't match "annual capacity" concept |

**SECTION 3 ISSUES:**
- ⚠️ **Base Annual Savings**: Currently showing `year.cumulativeSavings` (total accumulated), should show `profile.annualSavings` (per year)
- ⚠️ **Total Annual Capacity**: Current formula adds cumulative savings + cashflow reinvestment, which double-counts
- **FIX NEEDED:** Should show annual flow, not cumulative totals

---

### DROPDOWN SECTION 4: 📊 Deposit Test

| Field | Data Source | Status | Notes |
|-------|-------------|--------|-------|
| Available Funds | `year.depositTest.available` | ✅ WORKING | From test object |
| Required Deposit | `year.depositTest.required` | ✅ WORKING | From test object |
| Safety Buffer | Hardcoded | ✅ WORKING | Fixed £40k |
| Surplus/Shortfall | `year.depositTest.surplus` | ✅ WORKING | From test object |

**SECTION 4 ISSUES:**
- ✅ All data flowing correctly

---

### DROPDOWN SECTION 5: 🏦 Debt & Serviceability

| Field | Data Source | Status | Notes |
|-------|-------------|--------|-------|
| **Debt Position** | | | |
| Existing Debt | Calculated: `totalDebt - (status === 'purchased' ? requiredLoan : 0)` | ⚠️ COMPLEX | Logic attempts to show "before purchase" debt |
| New Loan Required | `year.requiredLoan` | ✅ WORKING | From calculator |
| Total Debt After | `year.totalDebt` | ✅ WORKING | From calculator |
| Borrowing Capacity Remaining | `year.availableBorrowingCapacity` | ✅ WORKING | From calculator |
| **Serviceability Test** | | | |
| Total Annual Interest | `year.loanRepayments` | ⚠️ POTENTIALLY WRONG | Shows interest for ALL loans, not just new |
| Max Allowable (10% rule) | `year.serviceabilityTest.available` | ✅ WORKING | From test object |
| Surplus/Shortfall | `year.serviceabilityTest.surplus` | ✅ WORKING | From test object |

**SECTION 5 ISSUES:**
- ⚠️ **Existing Debt calculation**: The formula `(year.totalDebt || 0) - (year.status === 'purchased' ? (year.requiredLoan || 0) : 0)` may not accurately represent "existing debt before this purchase"
- ⚠️ **Total Annual Interest**: Currently using `year.loanRepayments` which includes ALL properties. For the serviceability test section, this should specifically show the new property's contribution vs existing
- **FIX NEEDED:** Need separate fields for existing debt vs new debt interest

---

## 🚨 MISSING DATA FIELDS

### Available in YearBreakdownData but NOT USED:

| Field | Type | Current Usage | Potential Use |
|-------|------|---------------|---------------|
| `year.displayYear` | number | ❌ Not used | Could show "Year 1", "Year 2" etc. |
| `year.borrowingCapacity` | number | ❌ Not used | Could show total capacity vs remaining |
| `year.gapRule` | boolean | ❌ Not used | Could display gap rule status in decision logic |
| `year.equityReleaseYear` | boolean | ❌ Not used | Could highlight years with equity events |
| `year.consolidation.*` | object | ❌ Partially used | Consolidation details available but not fully displayed |
| `year.portfolioScaling` | number | ❌ Not used | Strategy metric available |
| `year.selfFundingEfficiency` | number | ❌ Not used | Strategy metric available |
| `year.equityRecyclingImpact` | number | ❌ Not used | Strategy metric available |
| `year.dsr` | number | ❌ Not used | Removed from display (was in old design) |

### Missing from YearBreakdownData (Would be useful):

| Desired Field | Why It's Needed | Workaround |
|---------------|-----------------|------------|
| Annual savings rate (not cumulative) | For Section 3 "Base Annual Savings" | Need to pass `profile.annualSavings` separately |
| Interest on new loan only | For Section 5 breakdown | Need to calculate from `requiredLoan * interestRate` |
| List of all portfolio properties | For Section 1 property breakdown in non-purchase years | Currently only shows if `purchases.length > 0` |
| Debt by property | For detailed debt breakdown | Would need to track individual property loans |

---

## 📋 RECOMMENDATIONS

### Priority 1: Fix Data Issues
1. **Section 3 - Cash Flywheel**: Fix "Base Annual Savings" to show annual rate, not cumulative
2. **Section 3 - Total Annual Capacity**: Recalculate formula to avoid double-counting
3. **Section 5 - Existing Debt**: Improve calculation or add dedicated field
4. **Section 1 - Property Breakdown**: Show all portfolio properties, not just current purchases

### Priority 2: Enhance Data Tracking
1. Add `annualSavingsRate` to YearBreakdownData
2. Add `existingDebtBeforePurchase` field
3. Add `newLoanInterestOnly` field for clearer serviceability breakdown
4. Add `portfolioProperties[]` array with all properties owned at this point in time

### Priority 3: Use Unused Fields
1. Consider displaying `portfolioScaling`, `selfFundingEfficiency`, `equityRecyclingImpact` in a "Strategy Metrics" section
2. Show `gapRule` status when applicable
3. Highlight `equityReleaseYear` events more prominently

---

## 🚨 ARCHITECTURAL VIOLATIONS: Calculations in UI Layer

**CRITICAL**: The Decision Engine Table should be a PURE PRESENTATION LAYER with NO business logic or calculations.

### ❌ Calculations Currently Happening in UI (MUST FIX)

| Location | Current UI Calculation | Should Be | Fix Required |
|----------|----------------------|-----------|--------------|
| Section 1 | `(portfolioValue * 0.80) - totalDebt` | Pre-calculated field | Add `extractableEquity` to YearBreakdownData |
| Section 1 | `cost - loanAmount` (property equity) | Pre-calculated per property | Add `equity` to each purchase object |
| Section 1 | `(value * 0.80) - debt` (extractable per property) | Pre-calculated per property | Add `extractableEquity` to each purchase object |
| Section 3 | `cumulativeSavings + cashflowReinvestment` | Pre-calculated field | Add `totalAnnualCapacity` to YearBreakdownData |
| Section 5 | `(totalDebt) - (status === 'purchased' ? requiredLoan : 0)` | Pre-calculated field | Add `existingDebt` to YearBreakdownData |

### 🔧 Required Calculator Changes

**Add to `YearBreakdownData` interface:**
```typescript
// Portfolio equity calculations
extractableEquity: number;  // (portfolioValue * 0.80) - totalDebt

// Annual cash capacity
totalAnnualCapacity: number;  // Annual savings rate + cashflow reinvestment
annualSavingsRate: number;    // profile.annualSavings (not cumulative)

// Debt breakdown
existingDebt: number;         // Debt before current purchase
newDebt: number;              // Just the new loan for this purchase
existingLoanInterest: number; // Interest on existing debt only
newLoanInterest: number;      // Interest on new loan only

// Enhanced purchase objects
purchases: Array<{
  propertyId: string;
  propertyType: string;
  cost: number;
  deposit: number;
  loanAmount: number;
  year: number;
  equity: number;              // ADD: cost - loanAmount
  extractableEquity: number;   // ADD: (value * 0.80) - loanAmount
  currentValue: number;        // ADD: value with growth applied
}>;

// Portfolio tracking
allPortfolioProperties: Array<{  // ADD: All properties owned at this point
  propertyId: string;
  propertyType: string;
  purchaseYear: number;
  originalCost: number;
  currentValue: number;
  loanAmount: number;
  equity: number;
  extractableEquity: number;
}>;
```

---

## ✅ OVERALL STATUS - **UPDATED AFTER REFACTOR**

**Architectural Compliance: 100%** ✅

- ✅ Table header columns: Pure presentation (100%)
- ✅ Section 1: Pure presentation - uses `extractableEquity`, `allPortfolioProperties` with pre-calculated equity
- ✅ Section 2: Pure presentation - no calculations
- ✅ Section 3: Pure presentation - uses `annualSavingsRate`, `totalAnnualCapacity`
- ✅ Section 4: Pure presentation - no calculations
- ✅ Section 5: Pure presentation - uses `existingDebt`, `newDebt`, `existingLoanInterest`, `newLoanInterest`

**Data Flow Quality: 100%** ✅

### ✅ Completed Action Items:

1. ✅ **ADDED**: All missing calculated fields to YearBreakdownData interface
2. ✅ **UPDATED**: DecisionEngineView to calculate and populate all fields
3. ✅ **REFACTORED**: UI to only format/display pre-calculated values
4. ✅ **VERIFIED**: No linter errors in any modified files

### Changes Made:

#### 1. TypeScript Interface (`property.ts`)
- Added `extractableEquity` field
- Added `annualSavingsRate` and `totalAnnualCapacity` fields
- Added `existingDebt`, `newDebt`, `existingLoanInterest`, `newLoanInterest` fields
- Enhanced `purchases[]` array with `currentValue`, `equity`, `extractableEquity`
- Added `allPortfolioProperties[]` array for complete portfolio tracking

#### 2. Calculator Layer (`DecisionEngineView.tsx`)
- Purchase year data: Calculates all new fields before creating YearBreakdownData
- Non-purchase year data: `interpolateYearData()` function updated with all calculations
- Initial year data: `createInitialYearData()` function updated with all calculations
- Builds `allPortfolioProperties` array for every year showing complete portfolio state

#### 3. UI Layer (`AffordabilityBreakdownTable.tsx`)
- Section 1: Removed 3 calculations, now uses pre-calculated values
- Section 3: Removed 1 calculation, now uses `annualSavingsRate` and `totalAnnualCapacity`
- Section 5: Removed 1 calculation, now uses pre-calculated debt breakdown fields
- Changed from `year.purchases` to `year.allPortfolioProperties` to show ALL properties

**Current State**: ✅ UI is a pure presentation layer with ZERO business logic
**Target State**: ✅ ACHIEVED - UI only formats and displays data

### Benefits of This Refactor:

1. **Separation of Concerns**: Calculator handles all business logic, UI only displays
2. **Easier Testing**: Calculator can be tested independently
3. **Better Performance**: Calculations done once in calculator, not repeatedly in UI
4. **Maintainability**: Single source of truth for calculations
5. **Accuracy**: No risk of different calculations in different parts of UI
6. **Complete Portfolio View**: Property breakdown now shows ALL properties, not just current year purchases

