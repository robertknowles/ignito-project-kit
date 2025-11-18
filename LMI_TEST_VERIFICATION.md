# LMI Test Verification Guide

## Quick Reference

**Test URL**: `http://localhost:8080`

**What to Test**:
1. LMI calculated correctly for 90% LVR
2. LMI is $0 when waiver enabled
3. LMI is $0 for LVR ≤ 80%
4. Total cash required includes/excludes LMI correctly

---

## Test Setup

### Prerequisites
1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:8080`
3. Go to the "Decision Engine" or property selection page
4. Select a property type to test

---

## Test Case 1: 90% LVR Property (LMI Should Apply)

### Step-by-Step Instructions

1. **Select a property** (e.g., "Units/Apartments")
   - Default price: ~$350,000
   - Default LVR: 85%

2. **Open Property Detail Modal**
   - Click on property card
   - Look for "Customize Property Details" or similar button

3. **Set LVR to 90%**
   - Find "LVR" field under "Section B: Contract & Loan Details"
   - Change from 85% to 90%

4. **Ensure LMI Waiver is OFF**
   - Find "LMI Waiver" field
   - Set to "No" or "false"

5. **Save and Check Timeline**

### Expected Calculation

```
Purchase Price: $350,000
LVR: 90%
Loan Amount: $315,000 (90% of $350,000)
Deposit Required: $35,000 (10% of $350,000)

LMI Calculation:
- LVR is 90% (between 85-90% tier)
- LMI Rate: 2.0%
- LMI = $315,000 × 2.0% = $6,300

Acquisition Costs:
- Stamp Duty: $14,000 (4% of $350,000)
- LMI: $6,300 ✅
- Legal Fees: $2,000
- Inspection Fees: $650
- Other Fees: $1,500
- Total Acquisition Costs: $24,450

Total Cash Required:
= Deposit + Acquisition Costs
= $35,000 + $24,450
= $59,450
```

### ✅ Pass Criteria

- [ ] LMI is calculated as $6,300
- [ ] LMI appears in acquisition costs breakdown
- [ ] Total cash required is $59,450
- [ ] Deposit test checks against $59,450 (not just $35,000)

---

## Test Case 2: 90% LVR + LMI Waiver (LMI Should Be $0)

### Step-by-Step Instructions

1. **Use same property from Test Case 1**
2. **Open Property Detail Modal**
3. **Keep LVR at 90%**
4. **Enable LMI Waiver**
   - Find "LMI Waiver" field
   - Set to "Yes" or "true"
5. **Save and Check Timeline**

### Expected Calculation

```
Purchase Price: $350,000
LVR: 90%
Loan Amount: $315,000
Deposit Required: $35,000

LMI Calculation:
- LVR is 90% (would normally trigger LMI)
- But LMI Waiver = true
- LMI = $0 ✅ (waived)

Acquisition Costs:
- Stamp Duty: $14,000
- LMI: $0 ✅ (waived)
- Legal Fees: $2,000
- Inspection Fees: $650
- Other Fees: $1,500
- Total Acquisition Costs: $18,150

Total Cash Required:
= Deposit + Acquisition Costs
= $35,000 + $18,150
= $53,150

Savings vs Test Case 1:
= $59,450 - $53,150
= $6,300 saved! ✅
```

### ✅ Pass Criteria

- [ ] LMI is $0 (despite 90% LVR)
- [ ] LMI is either not shown or shows $0 in breakdown
- [ ] Total cash required is $53,150
- [ ] Total cash required is $6,300 LESS than Test Case 1

---

## Test Case 3: 80% LVR (Standard Threshold)

### Step-by-Step Instructions

1. **Select any property**
2. **Set LVR to 80%**
3. **LMI Waiver can be Yes or No** (shouldn't matter)
4. **Save and Check**

### Expected Result

```
LVR: 80%
LMI: $0 (below threshold)
LMI Waiver setting: Irrelevant
```

### ✅ Pass Criteria

- [ ] LMI is $0 regardless of waiver setting
- [ ] 80% LVR is the standard threshold

---

## Test Case 4: 85% LVR (Lower Tier)

### Step-by-Step Instructions

1. **Select property with 85% LVR** (default for many types)
2. **Ensure LMI Waiver is OFF**
3. **Check calculation**

### Expected Calculation

```
Purchase Price: $350,000
LVR: 85%
Loan Amount: $297,500

LMI Calculation:
- LVR is 85% (80-85% tier)
- LMI Rate: 1.0% (lower than 90% tier)
- LMI = $297,500 × 1.0% = $2,975

Compare to 90% LVR:
- 90% LVR LMI: $6,300
- 85% LVR LMI: $2,975
- Difference: $3,325 (makes sense! ✅)
```

### ✅ Pass Criteria

- [ ] LMI for 85% LVR is approximately half of 90% LVR
- [ ] Tiered rates are working correctly

---

## Test Case 5: Commercial Property (Default Waiver)

### Step-by-Step Instructions

1. **Select "Commercial Property"**
2. **Check default LMI Waiver setting**
3. **Verify LMI is $0 even at high LVR**

### Expected Behavior

```
Property Type: Commercial Property
Default LMI Waiver: true (set in property-defaults.json)
LVR: 85-90% (typical for commercial)
LMI: $0 (automatically waived)
```

### ✅ Pass Criteria

- [ ] Commercial properties have LMI waiver enabled by default
- [ ] LMI is $0 even at 85-90% LVR
- [ ] Reflects real-world commercial lending practices

---

## Manual Verification Steps

### 1. Check Property Instance Data

Open browser console and run:

```javascript
// Get property instance context
const instances = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

// Check if lmiWaiver is being stored
console.log('Checking property instances for lmiWaiver field...');
```

### 2. Check Acquisition Costs Calculation

In the timeline, find a property card and check:

```
Acquisition Costs Breakdown:
├─ Stamp Duty: $X,XXX
├─ LMI: $X,XXX (or $0 if waived)
├─ Legal Fees: $X,XXX
├─ Inspection Fees: $XXX
└─ Other Fees: $X,XXX
─────────────────────
Total: $XX,XXX
```

### 3. Check Total Cash Required

```
Property Card:
├─ Deposit Required: $XX,XXX
├─ Acquisition Costs: $XX,XXX
└─ Total Cash Required: $XX,XXX ✅ (should equal sum of above)
```

### 4. Check Deposit Test Logic

```
Deposit Test:
Available Funds: $XXX,XXX
Total Cash Required: $XX,XXX (includes LMI if applicable)
Surplus: $XX,XXX
Result: PASS or FAIL
```

---

## Debugging Tips

### If LMI is always $0:

1. Check `lmiWaiver` is actually `false`
2. Verify LVR is > 80%
3. Check console for calculation logs
4. Verify `getInstance()` is returning the property instance

### If LMI waiver doesn't work:

1. Check property instance has `lmiWaiver: true`
2. Verify changes are saved to property instance
3. Check `calculateAcquisitionCosts` is receiving the parameter
4. Add console.log to track data flow

### If total cash required is wrong:

1. Verify formula: `depositRequired + acquisitionCosts.total`
2. Check `acquisitionCosts.total` includes all 5 cost components
3. Verify LMI is or isn't included based on waiver setting

---

## Expected Console Output

When the calculation runs, you should see debug output like:

```
[Timeline] Calculating property: Units/Apartments
  Purchase Price: $350,000
  LVR: 90%
  Loan Amount: $315,000
  LMI Waiver: false
  LMI Calculated: $6,300
  Acquisition Costs: $24,450
  Total Cash Required: $59,450
  Deposit Test: PASS (Available: $75,000)
```

With waiver:

```
[Timeline] Calculating property: Units/Apartments
  Purchase Price: $350,000
  LVR: 90%
  Loan Amount: $315,000
  LMI Waiver: true ✅
  LMI Calculated: $0 ✅
  Acquisition Costs: $18,150
  Total Cash Required: $53,150
  Deposit Test: PASS (Available: $75,000)
```

---

## Success Checklist

Overall implementation is successful if:

- [ ] LMI is calculated based on LVR tiers (1%, 2%, 4%, 5%)
- [ ] LMI is included in `acquisitionCosts.total`
- [ ] Total cash required = deposit + acquisition costs (including LMI)
- [ ] `lmiWaiver = true` results in LMI = $0
- [ ] `lmiWaiver = false` with LVR > 80% calculates LMI correctly
- [ ] LVR ≤ 80% always has LMI = $0
- [ ] Commercial properties have default LMI waiver
- [ ] Deposit test uses total cash required (not just deposit)

---

## Visual Verification

### Property Card Display

```
┌─────────────────────────────────────┐
│ Units/Apartments                     │
│ $350,000                             │
├─────────────────────────────────────┤
│ Deposit Required:        $35,000    │
│ Acquisition Costs:       $24,450    │
│   ├─ Stamp Duty:       $14,000     │
│   ├─ LMI:               $6,300 ✅   │
│   ├─ Legal Fees:        $2,000     │
│   ├─ Inspection:          $650     │
│   └─ Other:             $1,500     │
├─────────────────────────────────────┤
│ Total Cash Required:     $59,450 ✅ │
│                                      │
│ Available Funds:         $75,000    │
│ Deposit Test:            PASS ✅    │
└─────────────────────────────────────┘
```

With waiver:

```
┌─────────────────────────────────────┐
│ Units/Apartments                     │
│ $350,000                             │
├─────────────────────────────────────┤
│ Deposit Required:        $35,000    │
│ Acquisition Costs:       $18,150    │
│   ├─ Stamp Duty:       $14,000     │
│   ├─ LMI:                   $0 ✅   │
│   ├─ Legal Fees:        $2,000     │
│   ├─ Inspection:          $650     │
│   └─ Other:             $1,500     │
├─────────────────────────────────────┤
│ Total Cash Required:     $53,150 ✅ │
│                                      │
│ Available Funds:         $75,000    │
│ Deposit Test:            PASS ✅    │
└─────────────────────────────────────┘
```

---

## Regression Tests

Make sure existing functionality still works:

- [ ] Properties with 80% LVR still show no LMI
- [ ] Deposit test passes when funds are sufficient
- [ ] Deposit test fails when funds are insufficient
- [ ] Changing LVR updates LMI in real-time
- [ ] Timeline recalculates when property instances change
- [ ] Multiple properties calculate LMI independently

---

## Performance Check

- [ ] No noticeable lag when toggling LMI waiver
- [ ] Timeline recalculates quickly (< 500ms)
- [ ] No excessive re-renders
- [ ] Console shows no errors or warnings

---

## Final Validation

Run through all 5 test cases in sequence:

1. ✅ 90% LVR → LMI = $6,300
2. ✅ 90% LVR + Waiver → LMI = $0
3. ✅ 80% LVR → LMI = $0
4. ✅ 85% LVR → LMI = $2,975
5. ✅ Commercial Property → LMI = $0 (default)

If all pass → **Implementation Complete!** 🎉



