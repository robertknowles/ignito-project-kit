'''
# Cursor Prompt: Migrate Decision Engine into Expandable Investment Timeline

## Goal

Refactor the UI to merge the `DecisionEngineView` into the `InvestmentTimeline` component. The final result should be a single, unified timeline view that shows purchase events and allows users to expand both purchase years and the "gap" years between them to see the detailed decision-making logic.

**This is a UI migration, not a logic change.** All underlying calculations from `useAffordabilityCalculator` and the data generation logic should be preserved and moved, not rewritten.

## Reference Architecture

-   **`InvestmentTimeline.tsx`**: Becomes the primary container. It will manage the display of purchase events and the new `GapView` components between them.
-   **`DecisionEngineView.tsx`**: This component will be **deprecated**. Its data generation logic will be moved into `InvestmentTimeline.tsx`.
-   **`TimelineItem.tsx`**: This will be refactored into `PurchaseEventCard.tsx` to represent a single purchase. It will be expandable.
-   **`GapView.tsx` (New Component)**: Represents the expandable section for years between purchases.
-   **`GapYearRow.tsx` (New Component)**: A single, expandable row within an expanded `GapView`, showing the compact header for a non-purchase year.
-   **`AISummaryForGap.tsx` (New Component)**: Generates a text summary for why a gap period occurred.
-   **Funnel Components**: `DepositTestFunnel.tsx`, `ServiceabilityTestFunnel.tsx`, and `BorrowingCapacityTestFunnel.tsx` will be reused inside the expandable sections.

---

## Step-by-Step Implementation Plan

### Step 1: Move Data Generation Logic to `InvestmentTimeline.tsx`

1.  **Copy the `useMemo` hook** (lines 64-327) from `DecisionEngineView.tsx` directly into `InvestmentTimeline.tsx`. This hook is responsible for generating the `yearBreakdownData` for all years. It should be placed before the `generateTimelineItems` function.
2.  **Rename the output variable** from `yearlyData` to `fullYearlyBreakdown` to avoid confusion.
3.  **Ensure all necessary hooks** (`useAffordabilityCalculator`, `useInvestmentProfile`, etc.) and helper functions (`calculatePropertyGrowth`, etc.) are imported and available in `InvestmentTimeline.tsx`.

### Step 2: Refactor `InvestmentTimeline.tsx` to Render Gaps

1.  **Modify the main render loop.** Instead of just mapping over `timelineItems`, the new logic should be:
    -   Group `timelineProperties` by their purchase year.
    -   Loop through the sorted purchase years.
    -   For each purchase year, render a `PurchaseEventCard`.
    -   **Between** each `PurchaseEventCard`, calculate the gap period (e.g., 2026-2029).
    -   If a gap exists, render a `GapView` component, passing the `startYear`, `endYear`, and the `fullYearlyBreakdown` data as props.

    **Example Logic:**

    ```typescript
    const purchaseYears = [...new Set(timelineProperties.map(p => Math.round(p.affordableYear)))].sort();
    let lastPurchaseYear = purchaseYears[0];

    // In the return statement:
    purchaseYears.forEach((year, index) => {
      // Render PurchaseEventCard for 'year'

      const nextPurchaseYear = purchaseYears[index + 1];
      if (nextPurchaseYear && nextPurchaseYear > year + 1) {
        // Render GapView for years between 'year + 1' and 'nextPurchaseYear - 1'
      }
    });
    ```

### Step 3: Create `PurchaseEventCard.tsx`

1.  **Rename and refactor `TimelineItem.tsx`** to `PurchaseEventCard.tsx`.
2.  **Add state for expansion:** `const [isExpanded, setIsExpanded] = useState(false);`
3.  **Collapsed View:** Show the property details (Type, Price, Deposit, Loan).
4.  **Expanded View:** When `isExpanded` is true, render the three funnel components (`DepositTestFunnel`, etc.) side-by-side, passing the correct `yearData` for that purchase from `fullYearlyBreakdown`.

### Step 4: Create `GapView.tsx` (New File)

1.  **Props:** `startYear: number`, `endYear: number`, `allYearData: YearBreakdownData[]`.
2.  **State:** `const [isExpanded, setIsExpanded] = useState(false);`
3.  **Collapsed View:** Render a button showing: `[▶ Show {startYear}-{endYear} progression ({endYear - startYear + 1} years)]`.
4.  **Expanded View:**
    -   Render the `AISummaryForGap` component first.
    -   Filter `allYearData` to get the data for the years within the gap.
    -   Map over the filtered data and render a `GapYearRow` for each year.

### Step 5: Create `GapYearRow.tsx` (New File)

1.  **Props:** `yearData: YearBreakdownData`.
2.  **State:** `const [isExpanded, setIsExpanded] = useState(false);`
3.  **Collapsed View:** Render the **compact header** we designed previously. It must be a single, non-wrapping line.
    -   `Year {year} | Portfolio: {value} | Equity: {value} | LVR: {value} | Available: {value} | Deposit: {PASS/FAIL} | Serviceability: {PASS/FAIL} | Borrowing: {PASS/FAIL}`
4.  **Expanded View:** When `isExpanded` is true, render the three funnel components for that year's data.

### Step 6: Create `AISummaryForGap.tsx` (New File)

1.  **Props:** `gapData: YearBreakdownData[]`.
2.  **Logic:**
    -   Analyze the `gapData` to find the primary bottleneck.
    -   Iterate through the years and find which test (`depositTest`, `serviceabilityTest`, `borrowingCapacityTest`) was failing most consistently.
    -   Identify the year the bottleneck was resolved.
3.  **Render a natural language summary.**

    **Example Summary Logic:**

    ```typescript
    const failingTests = { deposit: 0, serviceability: 0, borrowing: 0 };
    let bottleneckResolvedYear = 0;

    gapData.forEach(year => {
      if (!year.depositTest.pass) failingTests.deposit++;
      if (!year.serviceabilityTest.pass) failingTests.serviceability++;
      if (!year.borrowingCapacityTest.pass) failingTests.borrowing++;
    });

    const primaryBottleneck = Object.keys(failingTests).reduce((a, b) => failingTests[a] > failingTests[b] ? a : b);

    // Find the year the bottleneck was resolved
    // ... more logic ...

    return (
      <p>The {gapData.length}-year wait was primarily due to the <strong>{primaryBottleneck} test</strong>. This was resolved in {bottleneckResolvedYear}, allowing for the next purchase.</p>
    );
    ```

### Step 7: Final Cleanup

1.  **Delete `DecisionEngineView.tsx`** as it is now fully integrated into `InvestmentTimeline.tsx`.
2.  Remove any routing or links that pointed to the old Decision Engine page.
3.  Ensure all styling is consistent and the user experience is smooth.

---

This prompt provides a complete architectural and step-by-step guide. Execute this carefully, starting with the data logic migration and then building the new components layer by layer.
'''
