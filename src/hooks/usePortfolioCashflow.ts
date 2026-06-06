import { useMemo } from 'react';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { useAffordabilityCalculator } from './useAffordabilityCalculator';
import { useInvestmentProfile } from './useInvestmentProfile';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { applyPropertyOverrides } from '../utils/applyPropertyOverrides';
import { calculatePerPropertyProjection } from '../utils/perPropertyProjections';
import { GROWTH_RATE_TIERS, BASE_YEAR } from '../constants/financialParams';
import { PROPERTY_COLORS } from '../constants/chartColors';

export interface PropertyCashflowEntry {
  title: string;
  instanceId: string;
  color: string;
  purchaseYear: number;
  grossIncome: number;
  totalOutgoings: number;
  netCashflow: number;
}

export interface YearCashflowSnapshot {
  year: number;
  properties: PropertyCashflowEntry[];
  totalIn: number;
  totalOut: number;
  netAnnual: number;
  netMonthly: number;
}

export interface PortfolioCashflowData {
  snapshots: Map<number, YearCashflowSnapshot>;
  yearRange: [number, number];
  lastPurchaseYear: number;
  purchaseYears: number[];
}

export function usePortfolioCashflow(): PortfolioCashflowData | null {
  const { getInstance } = usePropertyInstance();
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getPropertyData, propertyAssumptions } = useDataAssumptions();

  return useMemo(() => {
    const feasible = timelineProperties.filter(
      p => p.status === 'feasible' && p.instanceId
    );
    if (feasible.length === 0) return null;

    const projectionYears = profile.timelineYears || 10;
    const endYear = BASE_YEAR + projectionYears - 1;

    const projections = feasible.map((prop, idx) => {
      const instance = getInstance(prop.instanceId);
      const propData = getPropertyData(prop.title, instance?.growthAssumption);
      if (!propData) return null;

      const details = instance
        ? applyPropertyOverrides(propData, instance)
        : propData;
      const instanceGrowth = instance?.growthAssumption;
      const growthCurve =
        (instanceGrowth && GROWTH_RATE_TIERS[instanceGrowth]) ||
        profile.growthCurve;

      const projection = calculatePerPropertyProjection(
        {
          title: prop.title,
          cost: prop.cost,
          loanAmount: prop.loanAmount,
          depositRequired: prop.depositRequired,
          period: prop.period,
          affordableYear: prop.affordableYear,
          displayPeriod: prop.displayPeriod,
          loanType: prop.loanType,
          acquisitionCosts: prop.acquisitionCosts,
        },
        details,
        {
          growthCurve,
          projectionYears,
          rentEscalationRate: profile.rentEscalationRate,
        }
      );

      return {
        projection,
        instanceId: prop.instanceId!,
        color: PROPERTY_COLORS[idx % PROPERTY_COLORS.length],
      };
    }).filter(Boolean) as Array<{
      projection: ReturnType<typeof calculatePerPropertyProjection>;
      instanceId: string;
      color: string;
    }>;

    const purchaseYears = [
      ...new Set(feasible.map(p => Math.floor(p.affordableYear))),
    ].sort((a, b) => a - b);
    const lastPurchaseYear = purchaseYears[purchaseYears.length - 1];
    const minYear = purchaseYears[0];

    const snapshots = new Map<number, YearCashflowSnapshot>();

    for (let year = minYear; year <= endYear; year++) {
      const properties: PropertyCashflowEntry[] = [];

      for (const { projection, instanceId, color } of projections) {
        const cfIndex = year - projection.purchaseYear;
        if (cfIndex < 0 || cfIndex >= projection.cashflowOverTime.length) continue;

        const cf = projection.cashflowOverTime[cfIndex];
        properties.push({
          title: projection.propertyTitle,
          instanceId,
          color,
          purchaseYear: projection.purchaseYear,
          grossIncome: cf.grossIncome,
          totalOutgoings: cf.totalExpenses + cf.loanInterest,
          netCashflow: cf.netCashflow,
        });
      }

      const totalIn = properties.reduce((s, p) => s + p.grossIncome, 0);
      const totalOut = properties.reduce((s, p) => s + p.totalOutgoings, 0);

      snapshots.set(year, {
        year,
        properties,
        totalIn,
        totalOut,
        netAnnual: totalIn - totalOut,
        netMonthly: Math.round((totalIn - totalOut) / 12),
      });
    }

    return {
      snapshots,
      yearRange: [minYear, endYear] as [number, number],
      lastPurchaseYear,
      purchaseYears,
    };
  }, [
    timelineProperties,
    getInstance,
    getPropertyData,
    propertyAssumptions,
    profile.growthCurve,
    profile.timelineYears,
    profile.rentEscalationRate,
  ]);
}
