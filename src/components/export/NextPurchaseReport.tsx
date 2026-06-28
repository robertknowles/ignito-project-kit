import React from 'react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { usePortfolioProjection } from '../../hooks/usePortfolioProjection';
import { calculateDetailedCashflow } from '../../utils/detailedCashflowCalculator';
import { calcGrossYield } from '../../utils/sharedFinancialCalcs';
import {
  ReportPage,
  Section,
  KpiStat,
  KVTable,
  MatrixTable,
  Disclaimer,
  RC,
  fmtMoney,
  fmtPct,
  type ReportMeta,
  type KVRow,
  type MatrixColumn,
  type MatrixRow,
} from './ReportShell';

/**
 * NextPurchaseReport — single-property export for the Next Purchase Brief tab.
 *
 * Mirrors BriefTab's data flow exactly (same hooks, same derivations) so the
 * PDF is a faithful snapshot of the on-screen brief.
 */
export const NextPurchaseReport: React.FC<{ meta: ReportMeta }> = ({ meta }) => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { instances } = usePropertyInstance();
  const { propertyProjections } = usePortfolioProjection();

  const nextProp = timelineProperties.find(p => p.status === 'feasible');
  const instanceData = nextProp ? instances[nextProp.instanceId] : null;
  const projection = nextProp ? propertyProjections.get(nextProp.instanceId) ?? null : null;

  let cashflow = null;
  try {
    if (instanceData && nextProp) cashflow = calculateDetailedCashflow(instanceData, nextProp.loanAmount);
  } catch {
    cashflow = null;
  }

  if (!nextProp || !instanceData || !projection || !cashflow) {
    return (
      <ReportPage meta={meta} pageNumber={1} totalPages={1}>
        <Section title="Next purchase">
          <div style={{ fontSize: 12, color: RC.neutral400, padding: '12px 4px' }}>
            No properties in the plan yet — add one to generate the brief.
          </div>
        </Section>
        <Disclaimer />
      </ReportPage>
    );
  }

  const acqCosts = nextProp.acquisitionCosts;
  const totalHoldingCosts = cashflow.totalOperatingExpenses + cashflow.totalNonDeductibleExpenses;
  const grossYield = instanceData.purchasePrice > 0
    ? calcGrossYield(instanceData.rentPerWeek, instanceData.purchasePrice)
    : 0;

  // Derived purchase figures (mirrors BriefTab)
  const deposit = instanceData.depositOverride ?? nextProp.depositRequired;
  const stampDuty = acqCosts?.stampDuty ?? instanceData.stampDutyOverride ?? 0;
  const totalCash = instanceData.totalCashRequiredOverride ?? nextProp.totalCashRequired;
  const loanAmount = instanceData.loanAmountOverride ?? nextProp.loanAmount;
  const purchasePrice = instanceData.purchasePrice;

  // ── Property summary K/V ───────────────────────────────────────────────────
  const summaryRows: KVRow[] = [
    { label: 'Property', value: nextProp.title || 'Next purchase', bold: true },
    { label: 'State', value: instanceData.state || '–' },
    { label: 'Entity', value: instanceData.entity ?? 'Individual' },
    { label: 'Purchase year', value: String(Math.floor(nextProp.affordableYear)) },
    { label: 'Purchase price', value: fmtMoney(purchasePrice) },
    { label: 'Valuation', value: fmtMoney(instanceData.valuationAtPurchase) },
    { label: 'Loan amount', value: fmtMoney(loanAmount) },
    { label: 'LVR', value: fmtPct(instanceData.lvr, 0) },
    { label: 'Interest rate', value: fmtPct(instanceData.interestRate, 2) },
    { label: 'Loan product', value: instanceData.loanProduct === 'IO' ? 'Interest only' : 'Principal & interest' },
    { label: 'Loan term', value: `${instanceData.loanTerm} yrs` },
    { label: 'Growth assumption', value: instanceData.growthAssumption },
    { label: 'Rent / week', value: fmtMoney(instanceData.rentPerWeek) },
    { label: 'Gross yield', value: fmtPct(grossYield) },
  ];

  // ── Purchase costs K/V ─────────────────────────────────────────────────────
  const costRows: KVRow[] = [
    { label: 'Deposit', value: fmtMoney(deposit) },
    { label: 'Stamp duty', value: fmtMoney(stampDuty) },
    { label: 'LMI', value: fmtMoney(instanceData.lmiOverride ?? (acqCosts?.lmi ?? 0)) },
    { label: 'Engagement fee', value: fmtMoney(instanceData.engagementFee) },
    { label: 'Holding deposit', value: fmtMoney(instanceData.conditionalHoldingDeposit) },
    { label: 'Insurance upfront', value: fmtMoney(instanceData.buildingInsuranceUpfront) },
    { label: 'B&P inspection', value: fmtMoney(instanceData.buildingPestInspection) },
    { label: 'Plumbing / electrical', value: fmtMoney(instanceData.plumbingElectricalInspections) },
    { label: 'Independent valuation', value: fmtMoney(instanceData.independentValuation) },
    { label: 'Mortgage fees', value: fmtMoney(instanceData.mortgageFees) },
    { label: 'Conveyancing', value: fmtMoney(instanceData.conveyancing) },
    { label: 'Post-settlement maint.', value: fmtMoney(instanceData.maintenanceAllowancePostSettlement) },
    { label: 'Total cash required', value: fmtMoney(totalCash), bold: true },
  ];

  // ── Annual cashflow K/V ────────────────────────────────────────────────────
  const netCf = instanceData.netAnnualCashflowOverride ?? cashflow.netAnnualCashflow;
  const cashflowRows: KVRow[] = [
    { label: 'Cash in', value: '', heading: true },
    { label: 'Gross annual income', value: fmtMoney(instanceData.grossAnnualIncomeOverride ?? cashflow.grossAnnualIncome) },
    { label: 'Adjusted income (after vacancy)', value: fmtMoney(instanceData.adjustedIncomeOverride ?? cashflow.adjustedIncome) },
    { label: 'Cash out', value: '', heading: true },
    { label: 'Loan interest', value: fmtMoney(instanceData.loanInterestOverride ?? cashflow.loanInterest) },
    { label: 'Building insurance', value: fmtMoney(instanceData.buildingInsuranceAnnual) },
    { label: 'Council rates + water', value: fmtMoney(instanceData.councilRatesWater) },
    { label: 'Strata', value: fmtMoney(instanceData.strata) },
    { label: 'Maintenance', value: fmtMoney(instanceData.maintenanceAllowanceAnnual) },
    { label: 'Land tax', value: fmtMoney(cashflow.landTax) },
    { label: 'Total expenses', value: fmtMoney(instanceData.totalExpensesOverride ?? totalHoldingCosts) },
    { label: 'Net result', value: '', heading: true },
    { label: 'Net annual cashflow', value: fmtMoney(netCf), bold: true, valueColor: netCf < 0 ? RC.negative : RC.positive },
    { label: 'Net monthly', value: fmtMoney(instanceData.netMonthlyCashflowOverride ?? cashflow.netMonthlyCashflow) },
    { label: 'Net weekly', value: fmtMoney(instanceData.netWeeklyCashflowOverride ?? cashflow.netWeeklyCashflow) },
  ];

  // ── Performance projection matrix (year × metric) ──────────────────────────
  const perfYearRows = projection.yearRows;
  const perfMaxYear = perfYearRows.reduce((m, r) => Math.max(m, r.year), 0);
  const horizon = Math.min(20, perfMaxYear);
  const projYears = perfYearRows.filter(r => r.year >= 1 && r.year <= horizon);

  const projCols: MatrixColumn[] = [
    { key: 'year', label: 'Year', align: 'left' },
    { key: 'value', label: 'Property value' },
    { key: 'loan', label: 'Loan' },
    { key: 'equity', label: 'Equity' },
    { key: 'cf', label: 'Net CF' },
    { key: 'growth', label: 'Cap. growth' },
    { key: 'total', label: 'Total perf.' },
    { key: 'roic', label: 'ROIC' },
  ];
  const projRows: MatrixRow[] = projYears.map(r => ({
    cells: [
      { value: String(r.year), bold: true },
      { value: fmtMoney(r.propertyValue) },
      { value: fmtMoney(r.loanBalance) },
      { value: fmtMoney(r.equity) },
      { value: fmtMoney(r.netCashflow), color: r.netCashflow < 0 ? RC.negative : RC.positive },
      { value: fmtMoney(r.capitalGrowthCumulative) },
      { value: fmtMoney(r.totalPerformance) },
      { value: fmtPct(r.roic) },
    ],
  }));

  // Milestone snapshot (year 1 / mid / end)
  const milestones = Array.from(new Set([1, Math.round(horizon / 2), horizon]))
    .map(yr => perfYearRows.find(r => r.year === yr))
    .filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <>
      {/* ── Page 1: The purchase ── */}
      <ReportPage meta={meta} pageNumber={1} totalPages={2}>
        {/* KPI strip */}
        <Section title="At a glance" style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            <KpiStat label="Purchase price" value={fmtMoney(purchasePrice)} />
            <KpiStat label="Total cash required" value={fmtMoney(totalCash)} />
            <KpiStat label="LVR" value={fmtPct(instanceData.lvr, 0)} accent={meta.branding.primaryColor} />
            <KpiStat label="Gross yield" value={fmtPct(grossYield)} />
            <KpiStat label="Net cashflow /yr" value={fmtMoney(netCf)} accent={netCf < 0 ? RC.negative : RC.positive} />
          </div>
        </Section>

        {/* Property summary + purchase costs side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Section title="Property summary">
            <KVTable rows={summaryRows} />
          </Section>
          <Section title="Purchase costs">
            <KVTable rows={costRows} />
          </Section>
        </div>

        {/* Annual cashflow */}
        <Section title="Annual cashflow">
          <KVTable rows={cashflowRows} />
        </Section>
      </ReportPage>

      {/* ── Page 2: Performance ── */}
      <ReportPage meta={meta} pageNumber={2} totalPages={2} continuation>
        {/* Milestone snapshot */}
        <Section title="Performance milestones" style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${milestones.length}, 1fr)`, gap: 10 }}>
            {milestones.map(r => (
              <div key={r.year} style={{ background: RC.white, borderRadius: 10, boxShadow: `${RC.neutral200} 0px 0px 0px 1px inset`, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: RC.neutral500, fontWeight: 600 }}>Year {r.year}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: RC.neutral900, marginTop: 4 }}>{fmtMoney(r.totalPerformance)}</div>
                <div style={{ fontSize: 10, color: RC.neutral400, marginTop: 2 }}>total performance</div>
                <div style={{ marginTop: 8, fontSize: 11, color: RC.neutral600 }}>
                  ROIC {fmtPct(r.roic)} · COC {fmtPct(r.cocReturnCumulative)}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Year-by-year projection */}
        <Section title={`Year-by-year projection (${horizon} yrs)`}>
          <MatrixTable columns={projCols} rows={projRows} />
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${RC.neutral200}`, fontSize: 11, color: RC.neutral500 }}>
            Initial capital returned in <strong style={{ color: RC.neutral900 }}>{projection.capitalReturnedInYears} yrs</strong>
          </div>
        </Section>

        <Disclaimer />
      </ReportPage>
    </>
  );
};
