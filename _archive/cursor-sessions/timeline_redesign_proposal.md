# Proposal: Redesigning the Decision Engine as an Expandable Timeline View

This document outlines the feasibility and a proposed implementation plan for redesigning the current `DecisionEngineView` into an expandable component within the main investment timeline. The proposal directly addresses your two key requests: reorganizing the information into three clean "funnels" and ensuring a year-on-year data view is available.

## Feasibility Assessment: Highly Feasible

Your proposed changes are not only **entirely feasible** but also represent a significant improvement to the user experience. The underlying data structure and calculation engine are already well-suited to support this new design. Here’s a breakdown of why:

1.  **Three Funnels (Information Architecture):** This is a brilliant simplification. The core decision logic already revolves around the three tests (Deposit, Serviceability, Borrowing Capacity). The data object that feeds the UI, `YearBreakdownData`, already contains discrete objects for each test (`depositTest`, `serviceabilityTest`, `borrowingCapacityTest`), making it straightforward to channel the right data into the right funnel.

2.  **Year-on-Year View:** This is also highly feasible because the system **already calculates this data**. The `DecisionEngineView` component currently generates a complete breakdown for every single year of the simulation, regardless of whether a purchase occurs. The main task is to make this data accessible to the timeline and render it.

In short, this is less of a core logic overhaul and more of a UI/UX refactoring and enhancement project. We are rearranging and better presenting data that the system is already producing.

## Proposed Implementation Plan

Here is a step-by-step plan to achieve the new design:

### Step 1: Centralize the Year-by-Year Data Generation

The logic that creates the comprehensive `yearBreakdownData` array needs to be moved from the `DecisionEngineView` component into the `useAffordabilityCalculator` hook. This will create a single source of truth for all timeline-related data, ensuring consistency.

-   **Action:** I will create a new function within `useAffordabilityCalculator` that returns the `yearBreakdownData` array.

### Step 2: Re-architect the `InvestmentTimeline` Component

The main timeline component will be updated to render a row for *every year* in the newly centralized `yearBreakdownData` array, not just for purchase events.

-   **Action:** I will modify the `InvestmentTimeline` to loop through the `yearBreakdownData`. Each row will display a summary for that year (e.g., Year, Portfolio Value, Net Cashflow) and an "Expand" button.

### Step 3: Create the New Three-Funnel View

This is the core of the new UI. I will build a new component, let's call it `YearlyBreakdownView`, which will contain the three funnels.

-   **Action:** I will map out all the data points from your screenshot and assign them to one of the three funnels. The table below shows the proposed organization.

| Funnel | Data Sections from Screenshot | Key Data Points |
| :--- | :--- | :--- |
| **1. Deposit / Funds Test** | • This Purchase Funding<br>• Annual Funding Capacity<br>• Remaining After Purchase | • Available Funds (from savings, equity, cashflow)<br>• Total Cash Required (deposit + costs)<br>• **PASS/FAIL** with Surplus/Shortfall |
| **2. Serviceability Test** | • Annual Cashflow Performance<br>• Serviceability Test | • Total Portfolio Rental Income<br>• Total Portfolio Loan Payments<br>• Max Allowable Debt Service<br>• **PASS/FAIL** with Surplus/Shortfall |
| **3. Borrowing Capacity Test** | • Portfolio Equity Growth<br>• LVR Status<br>• Debt Position<br>• Borrowing Capacity Test | • Total Debt After Purchase<br>• Effective Borrowing Capacity<br>• LVR & Remaining Capacity<br>• **PASS/FAIL** with Surplus/Shortfall |

### Step 4: Integrate the Expandable View

Finally, I will connect the "Expand" button in the timeline to toggle the visibility of the new `YearlyBreakdownView` for that specific year.

-   **Action:** I will add state management to the `InvestmentTimeline` to track which year's breakdown is currently expanded. Clicking the button will pass the relevant year's data from `yearBreakdownData` to the `YearlyBreakdownView` component, which will then render the three funnels.

This approach will deliver the exact functionality you've described: a clean, expandable, year-by-year view of the decision engine's logic, neatly organized into the three core decision-making pillars. We can start with Step 1 whenever you're ready.
