/**
 * useProjectionComparison — TEMPORARY debug hook.
 *
 * Runs the OLD hooks (useChartDataGenerator, useRoadmapData, usePortfolioCashflow)
 * and the NEW unified hook (usePortfolioProjection) side-by-side, then logs
 * any differences to the console.
 *
 * Wire this into Dashboard.tsx temporarily to verify before migrating.
 * DELETE THIS FILE once migration is complete.
 */

import { useEffect } from 'react';
import { useChartDataGenerator } from './useChartDataGenerator';
import { useRoadmapData } from './useRoadmapData';
import { usePortfolioCashflow } from './usePortfolioCashflow';
import { usePortfolioProjection } from './usePortfolioProjection';

const TOLERANCE = 1; // $1 rounding tolerance

interface Diff {
  field: string;
  year: string | number;
  old: number;
  new: number;
  delta: number;
  pctDiff: string;
}

const pct = (oldVal: number, newVal: number): string => {
  if (oldVal === 0 && newVal === 0) return '0%';
  if (oldVal === 0) return 'N/A';
  return ((Math.abs(newVal - oldVal) / Math.abs(oldVal)) * 100).toFixed(2) + '%';
};

export function useProjectionComparison() {
  // Old hooks
  const oldChart = useChartDataGenerator();
  const oldRoadmap = useRoadmapData();
  const oldCashflow = usePortfolioCashflow();

  // New unified hook
  const unified = usePortfolioProjection();

  useEffect(() => {
    const diffs: Diff[] = [];

    // ── Compare portfolioGrowthData ──
    const maxLen = Math.max(
      oldChart.portfolioGrowthData.length,
      unified.portfolioGrowthData.length,
    );

    for (let i = 0; i < maxLen; i++) {
      const oldPt = oldChart.portfolioGrowthData[i];
      const newPt = unified.portfolioGrowthData[i];
      if (!oldPt || !newPt) {
        diffs.push({
          field: 'portfolioGrowthData.length',
          year: i,
          old: oldChart.portfolioGrowthData.length,
          new: unified.portfolioGrowthData.length,
          delta: unified.portfolioGrowthData.length - oldChart.portfolioGrowthData.length,
          pctDiff: 'MISSING',
        });
        break;
      }

      const fields: Array<[string, number | undefined, number | undefined]> = [
        ['portfolioValue', oldPt.portfolioValue, newPt.portfolioValue],
        ['propertyEquity', oldPt.propertyEquity, newPt.propertyEquity],
        ['equity', oldPt.equity, newPt.equity],
        ['totalDebt', oldPt.totalDebt, newPt.totalDebt],
        ['availableFunds', oldPt.availableFunds, newPt.availableFunds],
        ['borrowingCapacity', oldPt.borrowingCapacity, newPt.borrowingCapacity],
        ['doNothingBalance', oldPt.doNothingBalance, newPt.doNothingBalance],
        ['cashFromSales', oldPt.cashFromSales, newPt.cashFromSales],
        ['cashOffset', oldPt.cashOffset, newPt.cashOffset],
        ['entityDiscountedDebt', oldPt.entityDiscountedDebt, newPt.entityDiscountedDebt],
        ['monthlyHoldingCost', oldPt.monthlyHoldingCost, newPt.monthlyHoldingCost],
      ];

      fields.forEach(([field, oldVal, newVal]) => {
        const o = oldVal ?? 0;
        const n = newVal ?? 0;
        if (Math.abs(o - n) > TOLERANCE) {
          diffs.push({
            field: `portfolioGrowth.${field}`,
            year: oldPt.year,
            old: o,
            new: n,
            delta: n - o,
            pctDiff: pct(o, n),
          });
        }
      });
    }

    // ── Compare cashflowData ──
    const cfMaxLen = Math.max(
      oldChart.cashflowData.length,
      unified.cashflowData.length,
    );

    for (let i = 0; i < cfMaxLen; i++) {
      const oldCf = oldChart.cashflowData[i];
      const newCf = unified.cashflowData[i];
      if (!oldCf || !newCf) {
        diffs.push({
          field: 'cashflowData.length',
          year: i,
          old: oldChart.cashflowData.length,
          new: unified.cashflowData.length,
          delta: unified.cashflowData.length - oldChart.cashflowData.length,
          pctDiff: 'MISSING',
        });
        break;
      }

      const fields: Array<[string, number, number]> = [
        ['cashflow', oldCf.cashflow, newCf.cashflow],
        ['rentalIncome', oldCf.rentalIncome, newCf.rentalIncome],
        ['expenses', oldCf.expenses, newCf.expenses],
        ['loanRepayments', oldCf.loanRepayments, newCf.loanRepayments],
      ];

      fields.forEach(([field, oldVal, newVal]) => {
        if (Math.abs(oldVal - newVal) > TOLERANCE) {
          diffs.push({
            field: `cashflow.${field}`,
            year: oldCf.year,
            old: oldVal,
            new: newVal,
            delta: newVal - oldVal,
            pctDiff: pct(oldVal, newVal),
          });
        }
      });
    }

    // ── Compare roadmapData ──
    const oldYears = oldRoadmap.years;
    const newYears = unified.roadmapData.years;
    const rmMaxLen = Math.max(oldYears.length, newYears.length);

    for (let i = 0; i < rmMaxLen; i++) {
      const oldY = oldYears[i];
      const newY = newYears[i];
      if (!oldY || !newY) {
        diffs.push({
          field: 'roadmapYears.length',
          year: i,
          old: oldYears.length,
          new: newYears.length,
          delta: newYears.length - oldYears.length,
          pctDiff: 'MISSING',
        });
        break;
      }

      const fields: Array<[string, number, number]> = [
        ['portfolioValueRaw', oldY.portfolioValueRaw, newY.portfolioValueRaw],
        ['totalEquityRaw', oldY.totalEquityRaw, newY.totalEquityRaw],
        ['propertyEquityRaw', oldY.propertyEquityRaw, newY.propertyEquityRaw],
        ['availableFundsRaw', oldY.availableFundsRaw, newY.availableFundsRaw],
        ['totalDebt', oldY.totalDebt, newY.totalDebt],
        ['annualCashflow', oldY.annualCashflow, newY.annualCashflow],
        ['grossRentalIncome', oldY.grossRentalIncome, newY.grossRentalIncome],
        ['totalExpenses', oldY.totalExpenses, newY.totalExpenses],
        ['totalLoanInterest', oldY.totalLoanInterest, newY.totalLoanInterest],
        ['cashFromSales', oldY.cashFromSales, newY.cashFromSales],
      ];

      fields.forEach(([field, oldVal, newVal]) => {
        if (Math.abs(oldVal - newVal) > TOLERANCE) {
          diffs.push({
            field: `roadmap.${field}`,
            year: oldY.year,
            old: oldVal,
            new: newVal,
            delta: newVal - oldVal,
            pctDiff: pct(oldVal, newVal),
          });
        }
      });

      // Status fields (exact match)
      if (oldY.depositStatus !== newY.depositStatus) {
        diffs.push({
          field: 'roadmap.depositStatus',
          year: oldY.year,
          old: 0,
          new: 0,
          delta: 0,
          pctDiff: `${oldY.depositStatus} → ${newY.depositStatus}`,
        });
      }
      if (oldY.borrowingStatus !== newY.borrowingStatus) {
        diffs.push({
          field: 'roadmap.borrowingStatus',
          year: oldY.year,
          old: 0,
          new: 0,
          delta: 0,
          pctDiff: `${oldY.borrowingStatus} → ${newY.borrowingStatus}`,
        });
      }
      if (oldY.serviceabilityStatus !== newY.serviceabilityStatus) {
        diffs.push({
          field: 'roadmap.serviceabilityStatus',
          year: oldY.year,
          old: 0,
          new: 0,
          delta: 0,
          pctDiff: `${oldY.serviceabilityStatus} → ${newY.serviceabilityStatus}`,
        });
      }
    }

    // ── Compare per-property cashflow snapshots ──
    if (oldCashflow && unified.portfolioCashflow) {
      const oldSnaps = oldCashflow.snapshots;
      const newSnaps = unified.portfolioCashflow.snapshots;

      oldSnaps.forEach((oldSnap, snapYear) => {
        const newSnap = newSnaps.get(snapYear);
        if (!newSnap) {
          diffs.push({
            field: 'cashflowSnapshot.missing',
            year: snapYear,
            old: 1,
            new: 0,
            delta: -1,
            pctDiff: 'MISSING in unified',
          });
          return;
        }

        if (Math.abs(oldSnap.netAnnual - newSnap.netAnnual) > TOLERANCE) {
          diffs.push({
            field: 'cashflowSnapshot.netAnnual',
            year: snapYear,
            old: oldSnap.netAnnual,
            new: newSnap.netAnnual,
            delta: newSnap.netAnnual - oldSnap.netAnnual,
            pctDiff: pct(oldSnap.netAnnual, newSnap.netAnnual),
          });
        }
      });
    }

    // ── Log results ──
    if (diffs.length === 0) {
      console.log(
        '%c✅ PROJECTION COMPARISON: All values match (tolerance: $' + TOLERANCE + ')',
        'color: green; font-weight: bold; font-size: 14px;',
      );
    } else {
      console.group(
        '%c⚠️ PROJECTION COMPARISON: ' + diffs.length + ' differences found',
        'color: orange; font-weight: bold; font-size: 14px;',
      );

      // Group by field for readability
      const byField = new Map<string, Diff[]>();
      diffs.forEach(d => {
        const key = d.field;
        if (!byField.has(key)) byField.set(key, []);
        byField.get(key)!.push(d);
      });

      byField.forEach((fieldDiffs, field) => {
        console.group(`📊 ${field} (${fieldDiffs.length} years differ)`);
        console.table(
          fieldDiffs.map(d => ({
            Year: d.year,
            Old: typeof d.old === 'number' ? d.old.toLocaleString() : d.old,
            New: typeof d.new === 'number' ? d.new.toLocaleString() : d.new,
            Delta: typeof d.delta === 'number' ? d.delta.toLocaleString() : d.delta,
            '%Diff': d.pctDiff,
          })),
        );
        console.groupEnd();
      });

      // Summary
      const numericDiffs = diffs.filter(d => d.delta !== 0);
      if (numericDiffs.length > 0) {
        const maxDelta = numericDiffs.reduce(
          (max, d) => (Math.abs(d.delta) > Math.abs(max.delta) ? d : max),
          numericDiffs[0],
        );
        console.log(
          `Largest absolute difference: ${maxDelta.field} in year ${maxDelta.year}: $${Math.abs(maxDelta.delta).toLocaleString()} (${maxDelta.pctDiff})`,
        );
      }

      console.groupEnd();
    }

  }, [oldChart, oldRoadmap, oldCashflow, unified]);

  return {
    old: {
      chart: oldChart,
      roadmap: oldRoadmap,
      cashflow: oldCashflow,
    },
    unified,
  };
}
