# Ignito Decision Engine Analysis

This document provides a detailed analysis of the Ignito Project's decision engine, focusing on the integration of the 39 new property inputs and the core calculation logic. The analysis is based on a review of the codebase, particularly the `useAffordabilityCalculator.ts` hook and related utility functions.

## 1. Integration of the 39 New Property Inputs

The 39 new per-property input fields, defined in the `PropertyInstanceDetails` interface, have been successfully integrated into the data architecture. They are being stored in the `PropertyInstanceContext` and persisted to the Supabase database via the `ScenarioSaveContext`. This confirms that the data is being saved correctly.

However, the analysis reveals a critical issue: **the new inputs are only partially used in the core decision-making calculations.**

### How the New Inputs are Used:

- **Data Retrieval:** The `useAffordabilityCalculator.ts` hook correctly fetches the custom property data using `getInstance(purchase.instanceId)`.
- **Data Merging:** The `applyPropertyOverrides` utility merges these custom inputs with the default property assumptions. This means that when a user edits a property, the system is aware of the new values.
- **Detailed Cashflow Calculation:** The `calculateDetailedCashflow` function properly uses the new, granular expense inputs (e.g., `propertyManagementPercent`, `buildingInsuranceAnnual`, `councilRatesWater`, `strata`, `maintenanceAllowanceAnnual`) to calculate a property's net cashflow. This function represents the *intended* new logic.

### The Core Problem: Lingering Legacy Logic

The primary issue is that the old, simplified **"30% expense rule" is still present and being used in some parts of the main affordability calculator.**

Specifically, in `useAffordabilityCalculator.ts`, there are sections of code that calculate property expenses as a flat 30% of rental income, completely ignoring the new detailed inputs. For example:

```typescript
// src/hooks/useAffordabilityCalculator.ts:216
const periodExpenses = periodRentalIncome * 0.30 * inflationFactor;
```

While the newer `calculateDetailedCashflow` function is called later in the code (around line 895), the presence of the old logic creates significant inconsistencies. This is the most likely reason for the "iffy results" you've observed. The system is using two different methods to calculate cashflow, and the older, less accurate method is still influencing the `availableFunds` calculation, which is a critical input for the decision engine.

**Conclusion:** The 39 new inputs are being stored but are not consistently affecting the cashflow calculations as intended. The `calculateAvailableFunds` function, which determines the cash available for future purchases, is still using the outdated 30% rule, making the detailed expense inputs largely ineffective in that part of the simulation.

## 2. The Decision Engine: A Three-Gate System

The decision to purchase a property in a given period is determined by the `checkAffordability` function. This function acts as a three-gate system, where a property must pass all three tests to be considered "affordable."

| Test | Description | How it Works |
| :--- | :--- | :--- |
| **1. Deposit Test** | Checks if you have enough cash on hand. | Compares `availableFunds` to the `totalCashRequired` (deposit + all one-off purchase costs). This test correctly uses the new `oneOffCostsCalculator` and is likely functioning as expected. |
| **2. Serviceability Test** | Checks if you can handle the loan repayments. | This is a complex test. It calculates a `maxAnnualPayment` capacity based on **10% of your borrowing capacity + 70% of the total portfolio rental income**. It then checks if the total annual loan payments for your *entire portfolio* (including the new property) are below this threshold. |
| **3. Borrowing Capacity Test** | Checks if the bank will lend you the money. | Compares your `totalDebtAfterPurchase` to your `effectiveBorrowingCapacity`. This capacity is dynamically calculated by adding an "equity boost" (based on usable equity from your existing properties) to your base borrowing capacity. |

If a property fails any of these three tests, the engine moves to the next period and tries again. This process repeats until the property is affordable or the timeline ends.

### Analysis of the Decision Logic:

- **Simplification Potential:** The three tests are distinct and logical, but their interaction is complex. The **Serviceability Test** is the most complex and opaque. It's not a standard Debt-to-Income (DTI) or Debt Service Ratio (DSR) calculation. Simplifying or clarifying this test could be a key area for improvement. For example, we could break down *why* the serviceability test is failing (e.g., "rental income is too low to support the new loan payment").

- **Impact of New Inputs:**
    - **Growth:** The `growthAssumption` field is being used to apply tiered growth rates, which is correct.
    - **Cashflow:** As noted, the detailed cashflow inputs are only partially used. Fixing this to consistently use `calculateDetailedCashflow` would make the serviceability and deposit tests much more accurate.
    - **Serviceability:** The serviceability test is heavily influenced by rental income and existing loan payments. The new inputs for `rentPerWeek`, `interestRate`, and `loanProduct` are critical here, but their impact is being diluted by the inaccurate expense calculations.

## 3. Recommendations & Next Steps

Based on this analysis, here is a proposed path forward:

1.  **Fix the Cashflow Calculation:** The highest priority is to **remove all instances of the old 30% expense rule** from `useAffordabilityCalculator.ts` and ensure that the `calculateDetailedCashflow` function is used exclusively for all cashflow and expense calculations. This will ensure the 39 new inputs are fully utilized and will likely resolve the inconsistent results.

2.  **Clarify the Serviceability Test:** We should analyze the `Serviceability Test` further. We can either:
    *   **A) Refactor it** to use a more standard and understandable metric like DSR.
    *   **B) Keep the logic but provide a detailed breakdown** in the UI that explains *why* it fails. This aligns with your idea for an "AI explanation" – we can generate a text summary based on the test's inputs and outputs.

3.  **Simplify the Summary:** Once the core logic is sound, we can work on summarizing the decision points. The three tests (Deposit, Serviceability, Borrowing Capacity) provide a natural framework for this. We can create a summary view that shows the status of each test for each year, with the ability to drill down into the details.

We can now proceed with a more detailed, collaborative analysis of the code, starting with the cashflow calculation inconsistencies.
