# Growth Rate Toggles - Quick Reference

## 🎯 What This Does
Allows Buyer's Agents to switch between three growth assumption tiers (High, Medium, Low) for property appreciation forecasts.

## 📊 The Three Tiers

| Tier | Year 1 | Years 2-3 | Year 4 | Year 5+ | Use For |
|------|--------|-----------|--------|---------|---------|
| **High** | 12.5% | 10% | 7.5% | 6% | Hot markets, prime locations |
| **Medium** ⭐ | 8% | 6% | 5% | 4% | Balanced scenarios (DEFAULT) |
| **Low** | 5% | 4% | 3.5% | 3% | Conservative planning |

⭐ **Medium is the safe fallback** if no assumption is specified

## 🔧 Where to Change It

### Option 1: Edit Property Defaults (Global)
Edit `src/data/property-defaults.json`:

```json
{
  "units-apartments": {
    "growthAssumption": "Medium",  // Change this: "High", "Medium", or "Low"
    "purchasePrice": 350000,
    // ... other fields
  }
}
```

### Option 2: Via Data Assumptions Context (Runtime)
The system automatically reads the `growthAssumption` field from property templates and applies the correct rates.

## 📝 Example Scenarios

### Scenario 1: Hot Market (Use High)
- Inner-city Melbourne apartments
- Sydney CBD units
- High-demand regional areas
- **Growth:** 12.5% → 10% → 7.5% → 6%

### Scenario 2: Stable Market (Use Medium)
- Established suburbs
- Secondary cities
- Most regional areas
- **Growth:** 8% → 6% → 5% → 4%

### Scenario 3: Slow/Uncertain Market (Use Low)
- Oversupplied areas
- Slow-growth regions
- Risk-averse clients
- **Growth:** 5% → 4% → 3.5% → 3%

## 🛡️ Safety Features

1. **Safe Default:** Missing or invalid assumptions default to "Medium" (not "High")
2. **Type Safety:** TypeScript enforces only "High", "Medium", or "Low"
3. **Fallback Chain:** `growthAssumption → Medium → Medium rates`

## 🧪 Quick Test

1. Open your app
2. Check property growth projections (should currently show High rates: 12.5%, 10%, etc.)
3. Edit a property type to `"growthAssumption": "Medium"`
4. Reload and verify projections change (8%, 6%, 5%, 4%)
5. Try `"Low"` to see conservative projections (5%, 4%, 3.5%, 3%)

## 📍 Current State (as of implementation)

All 8 property types currently use **"High"**:
- ✅ Units / Apartments
- ✅ Villas / Townhouses
- ✅ Houses (Regional)
- ✅ Duplexes
- ✅ Small Blocks (3-4 Units)
- ✅ Metro Houses
- ✅ Larger Blocks (10-20 Units)
- ✅ Commercial Property

## 💡 Pro Tips

1. **Conservative Planning:** Use "Medium" as the default for most clients
2. **Client Risk Tolerance:** Match growth assumption to client's investment style
3. **Market Conditions:** Adjust based on current market forecasts
4. **Stress Testing:** Create scenarios with different growth assumptions to show range of outcomes

## 🔗 Related Files

- **Implementation:** `src/contexts/DataAssumptionsContext.tsx`
- **Property Defaults:** `src/data/property-defaults.json`
- **Type Definition:** `src/types/propertyInstance.ts`
- **Full Documentation:** `GROWTH_RATE_TOGGLES_IMPLEMENTATION.md`

