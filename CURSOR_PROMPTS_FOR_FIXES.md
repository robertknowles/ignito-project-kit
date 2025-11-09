# Cursor Prompts to Fix Identified Gaps

These prompts address the gaps identified in the INPUT_USAGE_AUDIT_REPORT.md

---

## Prompt 1: Fix Loan Offset Account (Priority 1)

### Goal
Make the loan offset account field reduce the effective interest paid on the loan.

### Background
The `loanOffsetAccount` field is currently stored in the property instance but not used in the cashflow calculation. An offset account reduces the loan balance for interest calculation purposes (e.g., if you have a $300k loan with $50k in offset, you only pay interest on $250k).

### Implementation

**File:** `src/utils/detailedCashflowCalculator.ts`

**Change:**
```typescript
// Current (line ~50):
const loanInterest = loanAmount * (property.interestRate / 100);

// New:
const effectiveLoanAmount = Math.max(0, loanAmount - property.loanOffsetAccount);
const loanInterest = effectiveLoanAmount * (property.interestRate / 100);
```

**Why Math.max(0, ...)?**
Prevents negative interest if offset is larger than loan amount.

### Testing
After implementation:
1. Create a property with $300k loan @ 6.5% interest
2. Set offset account to $0 → Interest should be $19,500/year
3. Set offset account to $50k → Interest should be $16,250/year
4. Set offset account to $300k → Interest should be $0/year

---

## Prompt 2: Auto-Create Property Instances (Priority 2)

### Goal
Automatically create property instances when properties are added to the timeline, using property type defaults, so the affordability calculator never falls back to the 30% rule.

### Background
Currently, property instances are only created when the user opens the property detail modal. If an instance doesn't exist, the affordability calculator falls back to the old 30% rule, reducing accuracy.

### Implementation

**File:** `src/hooks/useAffordabilityCalculator.ts`

**Location:** In the main timeline generation loop, before calling `checkAffordability()`

**Change:**
```typescript
// Around line 833, before checkAffordability()

// Ensure property instance exists (create if missing)
let propertyInstance = getInstance(property.instanceId);
if (!propertyInstance) {
  // Create instance from property type defaults
  createInstance(property.instanceId, property.title, period);
  propertyInstance = getInstance(property.instanceId);
}

const availableFunds = calculateAvailableFunds(period, currentPurchases);
const affordabilityResult = checkAffordability(property, availableFunds.total, currentPurchases, period);
```

**Why This Helps:**
- Ensures every property has an instance with defaults
- Prevents fallback to 30% rule
- User can still customize later via the modal

### Testing
After implementation:
1. Create a new scenario with fresh properties
2. Generate timeline without opening any property detail modals
3. Verify that detailed cashflow calculations are used (not 30% rule)
4. Check that instances are created automatically in the PropertyInstanceContext

---

## Prompt 3: Add Minimum Yield Hard Block (Priority 3)

### Goal
Block purchases that don't meet the minimum yield threshold specified in the property instance.

### Background
The `minimumYield` field is currently only used for validation warnings. It should be a hard constraint that prevents purchases if the actual yield is below the threshold.

### Implementation

**File:** `src/hooks/useAffordabilityCalculator.ts`

**Location:** In the `checkAffordability()` function, add a new gate before the three existing gates

**Change:**
```typescript
// Around line 500, at the start of checkAffordability()

const checkAffordability = (
  property: TimelineProperty,
  availableFunds: number,
  previousPurchases: Purchase[],
  currentPeriod: number
): AffordabilityResult => {
  
  // Get property instance
  const propertyInstance = getInstance(property.instanceId);
  
  // NEW: Minimum Yield Gate
  if (propertyInstance) {
    const annualRent = propertyInstance.rentPerWeek * 52;
    const actualYield = (annualRent / propertyInstance.purchasePrice) * 100;
    
    if (actualYield < propertyInstance.minimumYield) {
      return {
        period: currentPeriod,
        canAfford: false,
        availableFunds: 0,
        usableEquity: 0,
        totalPortfolioValue: 0,
        totalDebt: 0,
        failureReason: `Yield ${actualYield.toFixed(2)}% below minimum ${propertyInstance.minimumYield}%`,
      };
    }
  }
  
  // ... rest of existing code (deposit test, serviceability test, etc.)
```

**Why This Helps:**
- Prevents bad investments with low yields
- Acts as a quality control gate
- User can adjust minimum yield threshold per property

### Testing
After implementation:
1. Create a property with rent $400/week, price $350k (yield = 5.94%)
2. Set minimum yield to 6.5%
3. Verify purchase is blocked with "Yield below minimum" message
4. Lower minimum yield to 5.5%
5. Verify purchase is now allowed

---

## Prompt 4: Verify and Fix LMI in Total Cash Required (Priority 4)

### Goal
Investigate and confirm that LMI (Lenders Mortgage Insurance) is correctly included in the total cash required for the deposit test.

### Investigation Steps

**Step 1: Check how LMI is calculated**

File: `src/utils/lmiCalculator.ts`

Verify:
- LMI is calculated based on LVR and loan amount
- LMI can be waived if `lmiWaiver` is true

**Step 2: Check how total cash required is calculated**

File: `src/hooks/useAffordabilityCalculator.ts`

Look for where `totalCashRequired` is calculated in the deposit test.

**Step 3: Verify LMI is included**

Search for:
```typescript
const totalCashRequired = property.depositRequired + acquisitionCosts.total;
```

Check if `acquisitionCosts.total` includes LMI.

**Step 4: If LMI is NOT included, add it**

```typescript
// Calculate LMI
const lmi = property.lmiWaiver ? 0 : calculateLMI(loanAmount, purchasePrice);

// Add LMI to total cash required
const totalCashRequired = property.depositRequired + acquisitionCosts.total + lmi;
```

**Note:** In some cases, LMI can be capitalized into the loan (added to loan amount) rather than paid upfront. Need to determine which approach is being used.

### Testing
After fix:
1. Create property with 90% LVR (should trigger LMI)
2. Verify LMI is calculated (e.g., $8,000)
3. Verify total cash required includes LMI
4. Enable LMI waiver
5. Verify LMI is $0 and not included in total cash required

---

## Prompt 5: Add Tooltips for Hardcoded Values (UX Improvement)

### Goal
Add tooltips throughout the UI to explain hardcoded values and decision logic, helping users understand why certain purchase decisions are made.

### Locations to Add Tooltips

**1. Rental Recognition Rates**

When displaying rental income in the timeline, add a tooltip:

```
"Rental Recognition Rate: 75%

Banks recognize 75% of gross rental income for your first 2 properties. This decreases to 70% for properties 3-4, and 65% for properties 5+.

This conservative approach reflects banks' assessment of rental income reliability across larger portfolios."
```

**2. 88% LVR Cap for Equity Release**

When displaying usable equity, add a tooltip:

```
"88% LVR Cap

Banks typically lend up to 88% of property value when releasing equity. This is lower than the initial purchase LVR (often 90-95%) to maintain a safety buffer.

Usable Equity = (Property Value × 88%) - Loan Amount"
```

**3. 10% Base Capacity + 70% Rental Contribution**

When displaying serviceability test results, add a tooltip:

```
"Serviceability Calculation

Enhanced Capacity = (Borrowing Capacity × 10%) + (Rental Income × 70%)

- 10% of borrowing capacity: Minimum buffer for loan servicing
- 70% of rental income: Banks recognize 70% of rental income toward servicing ability

This formula determines if you can afford the loan payments across all properties."
```

**4. 3% Expense Inflation**

When displaying projected expenses, add a tooltip:

```
"3% Annual Expense Inflation

Operating expenses (insurance, rates, maintenance) increase by 3% annually to account for inflation.

This ensures projections remain realistic over time."
```

**5. Tiered Growth Rates**

When displaying property value projections, add a tooltip:

```
"Tiered Growth Rates

Properties grow at different rates over time:
- Year 1: 8% (High) / 6% (Medium) / 4% (Low)
- Years 2-3: 6% / 4% / 2%
- Year 4: 5% / 3% / 1%
- Year 5+: 4% / 2% / 0%

This reflects typical market behavior where properties grow faster initially, then slow down."
```

**6. Purchase Velocity Limit**

When a purchase is blocked due to velocity limit, add a tooltip:

```
"Purchase Velocity Limit: 3 per period

Maximum 3 properties can be purchased in a single 6-month period.

This reflects real-world constraints like settlement times, bank processing, and due diligence requirements."
```

### Implementation

Use your existing tooltip component (likely from shadcn/ui):

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <InfoIcon className="w-4 h-4 text-gray-400" />
    </TooltipTrigger>
    <TooltipContent>
      <p className="text-sm max-w-xs">
        Rental Recognition Rate: 75%
        <br /><br />
        Banks recognize 75% of gross rental income for your first 2 properties...
      </p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Testing
After implementation:
1. Hover over each info icon
2. Verify tooltip appears with correct content
3. Verify tooltip is readable and well-formatted
4. Test on mobile (tooltips should work on tap)

---

## Prompt 6: Reorganize Property Detail Modal Tabs (Future Enhancement)

### Goal
Reorganize the property detail modal tabs to match the logical grouping described in the system documentation:
- Tab 1: Property & Loan (affects value, equity, serviceability, borrowing capacity)
- Tab 2: Purchase Costs (affects deposit test only)
- Tab 3: Cashflow (affects serviceability, reinvestment)

### Background
The current tab structure already has these three tabs, but we want to ensure the fields are grouped logically and the tab names/descriptions match the system logic.

### Implementation

**File:** `src/components/PropertyDetailModal.tsx`

**Changes:**

**1. Update Tab Names and Descriptions**

```tsx
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="property-loan">
    Property & Loan
    <span className="text-xs text-gray-500 block">Value, Equity, Borrowing</span>
  </TabsTrigger>
  <TabsTrigger value="purchase-costs">
    Purchase Costs
    <span className="text-xs text-gray-500 block">Deposit Test</span>
  </TabsTrigger>
  <TabsTrigger value="cashflow">
    Cashflow
    <span className="text-xs text-gray-500 block">Serviceability, Reinvestment</span>
  </TabsTrigger>
  <TabsTrigger value="projections">
    Projections
  </TabsTrigger>
</TabsList>
```

**2. Add Section Headers Within Each Tab**

**Property & Loan Tab:**
```tsx
<TabsContent value="property-loan" className="space-y-6">
  {/* Section A: Property Overview */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Property Overview
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* State, Purchase Price, Valuation, Rent, Growth, Minimum Yield */}
    </div>
  </div>
  
  {/* Section B: Contract Timeline */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Contract Timeline
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* Days to Unconditional, Days for Settlement */}
    </div>
  </div>
  
  {/* Section C: Loan Structure */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Loan Structure
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* LVR, LMI Waiver, Loan Product, Interest Rate, Loan Term, Offset */}
    </div>
  </div>
</TabsContent>
```

**Purchase Costs Tab:**
```tsx
<TabsContent value="purchase-costs" className="space-y-6">
  {/* Section A: Engagement */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Engagement
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* Engagement Fee */}
    </div>
  </div>
  
  {/* Section B: Exchange */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Exchange (Conditional)
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* Conditional Deposit, Building Insurance Upfront, Inspections, Valuation */}
    </div>
  </div>
  
  {/* Section C: Unconditional */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Unconditional
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* Unconditional Deposit */}
    </div>
  </div>
  
  {/* Section D: Settlement */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Settlement
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* Stamp Duty, Mortgage Fees, Conveyancing, Rates Adjustment */}
    </div>
  </div>
  
  {/* Section E: Post-Settlement */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Post-Settlement
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* Maintenance Allowance Post Settlement */}
    </div>
  </div>
</TabsContent>
```

**Cashflow Tab:**
```tsx
<TabsContent value="cashflow" className="space-y-6">
  {/* Section A: Income Adjustments */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Income Adjustments
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* Vacancy Rate, Property Management % */}
    </div>
  </div>
  
  {/* Section B: Operating Expenses */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Operating Expenses (Tax Deductible)
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* Building Insurance, Council Rates, Strata, Maintenance */}
    </div>
  </div>
  
  {/* Section C: Non-Deductible Expenses */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Non-Deductible Expenses
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* Land Tax Override */}
    </div>
  </div>
  
  {/* Section D: Deductions */}
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
      Deductions & Rebates
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {/* Potential Deductions / Rebates */}
    </div>
  </div>
</TabsContent>
```

### Testing
After implementation:
1. Open property detail modal
2. Verify tabs have descriptive subtitles
3. Verify fields are grouped into logical sections
4. Verify section headers are clear and helpful
5. Verify the grouping matches the system documentation

---

## Summary of Prompts

| Priority | Prompt | Effort | Impact | Status |
|----------|--------|--------|--------|--------|
| 1 | Fix Loan Offset Account | 5 min | Low | Ready to implement |
| 2 | Auto-Create Property Instances | 30 min | Medium | Ready to implement |
| 3 | Add Minimum Yield Hard Block | 10 min | Medium | Ready to implement |
| 4 | Verify LMI in Total Cash Required | 15 min | High | Needs investigation |
| 5 | Add Tooltips for Hardcoded Values | 1-2 hours | High | Ready to implement |
| 6 | Reorganize Property Detail Modal Tabs | 1 hour | Medium | Optional enhancement |

**Total Estimated Effort:** 2.5-3.5 hours to complete all fixes and improvements.

---

## Recommended Implementation Order

1. **Prompt 4** (Verify LMI) - Do this first to ensure critical functionality is correct
2. **Prompt 1** (Loan Offset) - Quick win, easy to test
3. **Prompt 3** (Minimum Yield) - Quick win, improves quality control
4. **Prompt 2** (Auto-Create Instances) - Improves accuracy, prevents fallback to 30% rule
5. **Prompt 5** (Tooltips) - Improves user understanding, can be done incrementally
6. **Prompt 6** (Reorganize Tabs) - Optional, nice-to-have for better UX

---

**End of Document**
