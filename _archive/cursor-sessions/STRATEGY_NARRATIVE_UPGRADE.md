# Strategic Narrative Logic - Implementation Summary

## Overview
Upgraded `src/client-view/utils/strategyAnalyzer.ts` to generate specific, phase-based strategic narratives instead of generic summaries. The system now tells the "Accumulation vs. Retirement" story using the client's actual data.

## Key Features Implemented

### 1. Enhanced Residential Description

#### Current vs Future Portfolio Split
```typescript
// Separates existing properties from future acquisitions
currentPortfolioCost > 0 
  ? "$500k current portfolio + $1.2M future acquisitions"
  : "$1.7M total acquisition target (4 properties)"
```

#### Strategic Target Text
```typescript
"Target: $1.7M portfolio growing at 6.5% → $2.3M projected in 5 years (2030)"
```
- Calculates 5-year forward projection
- Shows specific growth rate and target value
- Includes projected year for clarity

#### Equity Creation Text
```typescript
"$850k equity created ($1.9M if sold down)"
```
- Net equity after debt
- Sale value after 5% transaction costs
- Shows liquidation potential

#### Phase Context
```typescript
"Accumulation phase: Building equity base for next-stage transition"
```
- Identifies current investment phase
- Sets context for strategy pathway

### 2. Enhanced Commercial Description

#### Commercial Injection Detection
Automatically detects if commercial properties come 3+ years after residential:

```typescript
detectCommercialInjection(commercialProperties, residentialProperties)
// Returns true if firstCommercial - firstResidential >= 3 years
```

#### Injection Scenario Narrative
```typescript
items: [
  "$1.2M commercial asset + $300k injection from residential gains",
  "Strategic commercial injection funded by released equity from accumulation phase",
  "7.2% yield generating $86k/year income stream"
]

targets: [
  "7.2% yield = $86k positive cashflow to replace income",
  "Transition phase: Converting equity growth into passive income generation",
  "Target: Financial independence via $7.2k/month commercial income"
]
```

**Features:**
- Calculates exact equity injection amount (20% deposit + 5% costs)
- Shows annual AND monthly cashflow
- Identifies "Transition phase" narrative
- Focus on income replacement

#### Early-Stage Commercial Narrative
If commercial properties start early (no injection scenario):
```typescript
items: [
  "2 commercial properties totaling $2.5M",
  "7.5% average yield (higher income focus)",
  "Diversified portfolio with commercial exposure from early stage"
]
```

### 3. Enhanced Long-Term Description

#### Strategy Pathway Auto-Detection
```typescript
determineStrategyPathway(analysis)
```

**Returns:**
1. **Hybrid Strategy** (Residential + Commercial):
   - "Hybrid Strategy: Accumulation (Residential) → Transition (Commercial) → Retirement (Debt-free)"

2. **Residential Only**:
   - "Residential Growth & Sell-down Strategy: Build equity → Liquidate → Debt-free income"

3. **Commercial Only**:
   - "Commercial-focused Strategy: High-yield income generation from establishment"

#### LVR Exposure Context
```typescript
"$5.2M total asset base @ 65.4% LVR"
```
- Total portfolio value
- Loan-to-Value ratio for risk assessment
- Shows leverage exposure

#### Gap-to-Goal Analysis
```typescript
// Goal Achieved
"Target: $2M equity goal by 2045 ✓ Achieved ($2.3M projected)"

// Gap Identified
"Target: $2M equity goal by 2045 → Gap: $300k shortfall"
```
- Shows whether goals are met
- Calculates specific shortfall amounts
- Provides actionable insights

#### Income with Yield Detail
```typescript
"5.8% yield → $180k total income redirected into debt reduction"

// With gap
"4.2% yield → $120k total income (Gap: $30k to goal of $150k/year)"
```
- Shows portfolio yield percentage
- Total income available
- Gap analysis if cashflow goal exists

#### Debt Reduction Potential
```typescript
"Income reinvestment: $1.26M debt reduction potential over 10 years"
```
- Assumes 70% of income goes to debt reduction (30% for expenses/tax)
- 10-year projection
- Shows path to debt-free ownership

## Implementation Details

### Residential Portfolio Logic

```typescript
// 1. Calculate average growth
const averageGrowth = calculateAverageGrowth(group.properties);

// 2. Split current vs future
const currentProperties = properties.filter(p => 
  purchaseYear <= currentYear
);
const futureProperties = properties.filter(p => 
  purchaseYear > currentYear
);

// 3. Project 5 years forward
const futureValue = totalCost * Math.pow(1 + (averageGrowth/100), 5);

// 4. Calculate sale value
const saleValue = projectedValue * (1 - 0.05); // 5% sale costs
```

### Commercial Portfolio Logic

```typescript
// 1. Detect injection scenario
const isInjectionScenario = 
  firstCommercialYear - firstResidentialYear >= 3;

// 2. Calculate equity injection
const deposit = commercialCost * 0.2;          // 20%
const acquisitionCosts = commercialCost * 0.05; // 5%
const totalRequired = deposit + acquisitionCosts;
const equityInjection = Math.min(totalRequired, residentialEquity);

// 3. Calculate monthly cashflow
const monthlyCashflow = annualCashflow / 12;
```

### Long-Term Outcome Logic

```typescript
// 1. Calculate LVR
const totalDebt = totalCost * 0.8; // 80% LVR
const lvr = (totalDebt / totalPortfolioValue) * 100;

// 2. Debt reduction potential
const effectiveIncome = totalIncome * 0.7; // 70% to debt
const debtReduction10yr = effectiveIncome * 10;

// 3. Gap analysis
const equityGap = equityGoal - totalEquity;
const incomeGap = cashflowGoal - totalProjectedIncome;

// 4. Strategy pathway
if (hasResidential && hasCommercial) {
  return "Hybrid Strategy: Accumulation → Transition → Retirement";
}
```

## Example Narratives

### Example 1: Hybrid Strategy (Residential → Commercial)

**Residential Portfolio:**
```
• $1.5M borrowing capacity utilized
• $650k current portfolio + $1.2M future acquisitions
• Average 6.5% growth rate across residential assets

→ Target: $1.85M portfolio growing at 6.5% → $2.5M projected in 5 years (2030)
→ $920k equity created ($2.1M if sold down)
→ Accumulation phase: Building equity base for next-stage transition
```

**Commercial Portfolio:**
```
• $1.5M commercial asset + $375k injection from residential gains
• Strategic commercial injection funded by released equity from accumulation phase
• 7.5% yield generating $112k/year income stream

→ 7.5% yield = $112k positive cashflow to replace income
→ Transition phase: Converting equity growth into passive income generation
→ Target: Financial independence via $9.3k/month commercial income
```

**Long-Term Outcome:**
```
• Strategy: Hybrid Strategy: Accumulation (Residential) → Transition (Commercial) → Retirement (Debt-free)
• $6.8M total asset base @ 62.3% LVR
• Target: $3M equity goal by 2045 ✓ Achieved ($3.4M projected)
• 6.2% yield → $210k total income redirected into debt reduction ✓ Goal achieved
• Income reinvestment: $1.47M debt reduction potential over 10 years
```

### Example 2: Residential Growth & Sell-down

**Residential Portfolio:**
```
• $1.2M borrowing capacity utilized
• $2.4M total acquisition target (5 properties)
• Average 7.2% growth rate across residential assets

→ Target: $2.4M portfolio growing at 7.2% → $3.4M projected in 5 years (2030)
→ $1.8M equity created ($3.2M if sold down)
→ Accumulation phase: Building equity base for next-stage transition
```

**Long-Term Outcome:**
```
• Strategy: Residential Growth & Sell-down Strategy: Build equity → Liquidate → Debt-free income
• $5.6M total asset base @ 68.6% LVR
• Target: $2.5M equity goal by 2040 ✓ Achieved ($2.8M projected)
• 4.8% yield → $115k total income redirected into debt reduction
• Income reinvestment: $805k debt reduction potential over 10 years
```

### Example 3: Pure Commercial Strategy

**Commercial Portfolio:**
```
• 3 commercial properties totaling $3.2M
• 7.8% average yield (higher income focus)
• Diversified portfolio with commercial exposure from early stage

→ Commercial properties provide stable, higher-yield income stream
→ Projected $250k/year passive income
→ Strong equity growth potential: $1.9M projected equity
```

**Long-Term Outcome:**
```
• Strategy: Commercial-focused Strategy: High-yield income generation from establishment
• $5.8M total asset base @ 55.2% LVR
• Target: $2M equity goal by 2040 → Gap: $100k shortfall
• 7.8% yield → $250k total income redirected into debt reduction
• Income reinvestment: $1.75M debt reduction potential over 10 years
```

## Key Calculations Reference

### Equity Calculations
```typescript
// Net Equity
currentValue = purchasePrice * (1 + growthRate) ^ yearsHeld
loanAmount = purchasePrice * 0.8
equity = currentValue - loanAmount

// Sale Value
saleValue = projectedValue * 0.95 // 5% costs
```

### Commercial Injection
```typescript
deposit = cost * 0.20
stampDuty = cost * 0.05
totalRequired = deposit + stampDuty
injection = min(totalRequired, residentialEquity)
```

### LVR Calculation
```typescript
totalDebt = totalCost * 0.8
lvr = (totalDebt / totalValue) * 100
```

### Debt Reduction
```typescript
effectiveIncome = totalIncome * 0.7 // 70% to debt
debtReduction = effectiveIncome * years
```

## Benefits

1. **Phase-Based Storytelling**: Clear narrative arc from Accumulation → Transition → Retirement
2. **Data-Driven**: All numbers calculated from actual property selections and investment profile
3. **Gap Analysis**: Shows specific shortfalls to help advisors recommend adjustments
4. **Context-Aware**: Adapts narrative based on portfolio mix (residential-only, hybrid, commercial-only)
5. **Financial Specifics**: Exact dollar amounts for equity, injections, cashflow, and debt reduction
6. **Strategic Guidance**: Clear pathway descriptions that explain the "why" behind the numbers

## Future Enhancements

Potential additions:
- Tax implications in debt reduction calculations
- Refinancing milestone triggers
- Diversification score/metrics
- Risk-adjusted return projections
- Market cycle considerations
- Age-based retirement timeline adjustments

