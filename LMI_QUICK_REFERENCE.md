# LMI Quick Reference Card

## What Changed?

The `lmiWaiver` flag from property instances is now properly respected when calculating LMI.

---

## LMI Calculation (Simple)

```
if (lmiWaiver = true) → LMI = $0 ✅
else if (LVR ≤ 80%) → LMI = $0
else if (LVR 80-85%) → LMI = 1% of loan
else if (LVR 85-90%) → LMI = 2% of loan
else if (LVR 90-95%) → LMI = 4% of loan
else (LVR 95%+) → LMI = 5% of loan
```

---

## Total Cash Required

```
Total Cash Required = Deposit + Acquisition Costs

where:
Acquisition Costs = Stamp Duty + LMI + Legal + Inspections + Other
```

---

## Example: $350k Property

### Without Waiver (90% LVR):
```
Deposit:     $35,000
Stamp Duty:  $14,000
LMI:          $6,300 ← 2% of $315k loan
Legal:        $2,000
Other:        $2,150
───────────────────
TOTAL:       $59,450
```

### With Waiver (90% LVR):
```
Deposit:     $35,000
Stamp Duty:  $14,000
LMI:             $0 ← Waived! ✅
Legal:        $2,000
Other:        $2,150
───────────────────
TOTAL:       $53,150
SAVES:        $6,300 💰
```

---

## When LMI is Waived

1. **Professional Packages** (doctors, lawyers, accountants)
2. **Commercial Properties** (set by default in system)
3. **Existing Customers** (high net worth clients)
4. **Special Arrangements** (negotiated with lender)

---

## Testing Commands

### Verify Calculations Work:
```bash
node verify-lmi.js
```

### Run the App:
```bash
npm run dev
# Navigate to http://localhost:8080
```

---

## Files Changed

1. ✅ `src/utils/costsCalculator.ts` - Added lmiWaiver parameter
2. ✅ `src/hooks/useAffordabilityCalculator.ts` - Pass lmiWaiver from instances

---

## Quick Test

1. Select a property
2. Set LVR to 90%
3. LMI Waiver OFF → See ~$6k LMI
4. LMI Waiver ON → See $0 LMI
5. Total cash required changes by LMI amount

---

## Key Points

- ✅ LMI is **always included** in total cash required (unless waived)
- ✅ Deposit test checks **total cash required** (not just deposit)
- ✅ Waiver flag **now works** correctly
- ✅ Backward compatible (defaults to false)
- ✅ No linter errors

---

## LVR Tiers at a Glance

| LVR Range | LMI Rate | Example ($350k) |
|-----------|----------|-----------------|
| ≤ 80%     | 0%       | $0              |
| 80-85%    | 1%       | ~$3,000         |
| 85-90%    | 2%       | ~$6,300         |
| 90-95%    | 4%       | ~$13,000        |
| 95%+      | 5%       | ~$16,600        |

---

## Status: ✅ COMPLETE

All tests pass. Ready for production.


