import React from 'react';
import { usePortfolioProjection } from '../../hooks/usePortfolioProjection';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { BASE_YEAR } from '../../constants/financialParams';
import {
  ReportPage,
  Section,
  KpiStat,
  MatrixTable,
  Disclaimer,
  RC,
  fmtMoney,
  fmtCompact,
  type ReportMeta,
  type MatrixColumn,
  type MatrixRow,
} from './ReportShell';

/**
 * PortfolioSummaryReport - whole-portfolio export for the Portfolio Plan tab.
 *
 * Pulls live scenario data from the same hooks the dashboard uses (no
 * scenarioData arg = active scenario), so the PDF always matches the screen.
 */
export const PortfolioSummaryReport: React.FC<{ meta: ReportMeta }> = ({ meta }) => {
  const { portfolioGrowthData, cashflowData, roadmapData } = usePortfolioProjection();
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();

  const years = roadmapData.years;
  const horizonYears = profile?.timelineYears ?? 20;
  const planEndYear = BASE_YEAR + horizonYears - 1;

  // End-of-horizon snapshot (mirrors Dashboard `kpis`).
  const lastGrowth = portfolioGrowthData[portfolioGrowthData.length - 1];
  const lastCf = cashflowData[cashflowData.length - 1];
  const portfolioValue = lastGrowth?.portfolioValue ?? 0;
  const totalEquity = lastGrowth?.equity ?? 0;
  const totalDebt = lastGrowth?.totalDebt ?? 0;
  const netCashflowAnnual = lastCf ? Math.round(lastCf.rentalIncome - lastCf.expenses - lastCf.loanRepayments) : 0;
  const rentalIncomeAnnual = lastCf ? Math.round(lastCf.rentalIncome) : 0;

  // Goals (mirrors Dashboard `planHeader`).
  const equityGoal = profile?.equityGoal ?? 0;
  const cashflowGoal = profile?.cashflowGoal ?? 0;
  let equityTargetYear: number | null = null;
  for (const g of portfolioGrowthData) {
    if (equityGoal > 0 && (g.equity ?? 0) >= equityGoal) {
      equityTargetYear = Number(g.year);
      break;
    }
  }

  const bought = timelineProperties.filter(p => p.status === 'feasible' || p.status === 'challenging');
  const propertyCount = bought.length;
  const depositsTotal = bought.reduce((s, p) => s + (p.totalCashRequired ?? 0), 0);

  // ── Purchases table ──────────────────────────────────────────────────────
  const purchaseCols: MatrixColumn[] = [
    { key: 'when', label: 'When', align: 'left' },
    { key: 'title', label: 'Property', align: 'left' },
    { key: 'price', label: 'Price' },
    { key: 'deposit', label: 'Deposit' },
    { key: 'loan', label: 'Loan' },
    { key: 'costs', label: 'Acq. costs' },
    { key: 'cash', label: 'Cash req.' },
    { key: 'cf', label: 'Net CF/yr' },
  ];
  const purchaseRows: MatrixRow[] = timelineProperties.map(p => ({
    cells: [
      { value: p.displayPeriod ?? String(Math.floor(p.affordableYear)) },
      { value: p.title || 'Property' },
      { value: fmtMoney(p.cost) },
      { value: fmtMoney(p.depositRequired) },
      { value: fmtMoney(p.loanAmount) },
      { value: fmtMoney(p.acquisitionCosts?.total ?? 0) },
      { value: fmtMoney(p.totalCashRequired ?? 0) },
      {
        value: fmtMoney(p.netCashflow ?? 0),
        color: (p.netCashflow ?? 0) < 0 ? RC.negative : RC.positive,
      },
    ],
  }));

  // ── Year-by-year projection matrix ───────────────────────────────────────
  const projCols: MatrixColumn[] = [
    { key: 'year', label: 'Year', align: 'left' },
    { key: 'value', label: 'Portfolio value' },
    { key: 'debt', label: 'Debt' },
    { key: 'equity', label: 'Equity' },
    { key: 'income', label: 'Gross income' },
    { key: 'net', label: 'Net cashflow' },
  ];
  const projRows: MatrixRow[] = years.map(y => {
    const net = y.annualCashflow ?? 0;
    return {
      highlight: equityTargetYear !== null && y.year === equityTargetYear,
      cells: [
        { value: String(y.year), bold: true },
        { value: fmtMoney(y.portfolioValueRaw) },
        { value: fmtMoney(y.totalDebt) },
        { value: fmtMoney(y.totalEquityRaw) },
        { value: y.grossRentalIncome > 0 ? fmtMoney(y.grossRentalIncome) : '–' },
        { value: fmtMoney(net), color: net < 0 ? RC.negative : RC.positive },
      ],
    };
  });

  return (
    <>
      {/* ── Page 1: Overview, KPIs, Purchases ── */}
      <ReportPage meta={meta} pageNumber={1} totalPages={2}>
        {/* Goal vs outcome */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Section title="The goal">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KpiStat label="Equity target" value={fmtCompact(equityGoal)} accent={meta.branding.primaryColor} />
              <KpiStat label="Passive income target" value={`${fmtCompact(cashflowGoal)}/yr`} accent={meta.branding.primaryColor} />
              <KpiStat
                label="Equity target reached"
                value={equityTargetYear ? String(equityTargetYear) : `By ${planEndYear}`}
              />
              <KpiStat label="Planning horizon" value={`${horizonYears} yrs`} />
            </div>
          </Section>
          <Section title="The outcome">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KpiStat label={`Projected equity (${planEndYear})`} value={fmtCompact(totalEquity)} />
              <KpiStat label={`Portfolio value (${planEndYear})`} value={fmtCompact(portfolioValue)} />
              <KpiStat label="Net cashflow /yr" value={fmtCompact(netCashflowAnnual)} accent={netCashflowAnnual < 0 ? RC.negative : RC.positive} />
              <KpiStat label="Properties acquired" value={String(propertyCount)} />
            </div>
          </Section>
        </div>

        {/* End-of-horizon KPI strip */}
        <Section title={`Portfolio at ${planEndYear}`} style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <KpiStat label="Portfolio value" value={fmtMoney(portfolioValue)} />
            <KpiStat label="Total debt" value={fmtMoney(totalDebt)} />
            <KpiStat label="Total equity" value={fmtMoney(totalEquity)} />
            <KpiStat label="Gross rental income /yr" value={fmtMoney(rentalIncomeAnnual)} />
          </div>
        </Section>

        {/* Purchases */}
        <Section title="Purchase plan">
          {purchaseRows.length > 0 ? (
            <>
              <MatrixTable columns={purchaseCols} rows={purchaseRows} />
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${RC.neutral200}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: RC.neutral500 }}>
                <span>{propertyCount} {propertyCount === 1 ? 'property' : 'properties'}</span>
                <span>Total cash deployed: <strong style={{ color: RC.neutral900 }}>{fmtMoney(depositsTotal)}</strong></span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: RC.neutral400, padding: '12px 4px' }}>
              No properties in the plan yet.
            </div>
          )}
        </Section>
      </ReportPage>

      {/* ── Page 2: Year-by-year projections ── */}
      <ReportPage meta={meta} pageNumber={2} totalPages={2} continuation>
        <Section title="Year-by-year projections">
          <MatrixTable columns={projCols} rows={projRows} />
        </Section>
        <Disclaimer />
      </ReportPage>
    </>
  );
};
