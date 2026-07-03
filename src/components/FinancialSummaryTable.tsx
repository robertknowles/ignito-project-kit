import React, { useMemo } from 'react';
import { usePortfolioProjection } from '../hooks/usePortfolioProjection';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

// Format number with commas, no dollar sign ($ lives in the row label)
const formatNumber = (value: number): string => {
  const sign = value < 0 ? '-' : '';
  return `${sign}${Math.round(Math.abs(value)).toLocaleString('en-AU')}`;
};

interface FinancialSummaryTableProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
  onPropertyClick?: (instanceId: string) => void;
}

export const FinancialSummaryTable: React.FC<FinancialSummaryTableProps> = ({
  scenarioData,
  onPropertyClick,
}) => {
  const { profile: contextProfile } = useInvestmentProfile();
  const { timelineProperties: contextTimelineProperties } = useAffordabilityCalculator();

  const profile = scenarioData?.profile ?? contextProfile;
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProperties;

  const { roadmapData: { years }, cashflowData, salesCgtBreakdown } = usePortfolioProjection(scenarioData);

  const cashflowByYear = useMemo(() => {
    const map = new Map<number, { rentalIncome: number; expenses: number; loanRepayments: number; cashflow: number }>();
    cashflowData.forEach(d => {
      map.set(parseInt(d.year), {
        rentalIncome: d.rentalIncome,
        expenses: d.expenses,
        loanRepayments: d.loanRepayments,
        cashflow: d.cashflow,
      });
    });
    return map;
  }, [cashflowData]);

  const handlePropertyClick = (instanceId: string) => {
    onPropertyClick?.(instanceId);
  };

  // CGT per year (2027 basis), summed across all sales settling that year.
  const cgtByYear = useMemo(() => {
    const map = new Map<number, number>();
    salesCgtBreakdown.forEach(r => { map.set(r.saleYear, (map.get(r.saleYear) ?? 0) + r.cgt); });
    return map;
  }, [salesCgtBreakdown]);

  const yearCount = years.length;
  const hasSales = years.some(y => y.cashFromSales > 0);

  // PropPath §2.2 matrix table — 12px cells / 9px padding, sticky label column,
  // numbers right-aligned. 3-step weight ladder: section lines 500 #181D27
  // (numbers #252B37) · breakdowns indented one step, label #717680, numbers
  // #535862 · Net the one 600 emphasis. Negatives semantic red.
  const thLabelClass = 'sticky left-0 z-[1] bg-white text-left text-[11px] font-medium text-[#717680] py-2.5 px-4 whitespace-nowrap w-[200px] min-w-[200px]';
  const thClass = 'text-right text-[11px] font-medium text-[#717680] py-2.5 px-3.5 whitespace-nowrap min-w-[74px]';
  const labelClass = 'sticky left-0 z-[1] bg-white py-[9px] px-4 text-left text-[13px] font-medium text-[#181D27] whitespace-nowrap w-[200px] min-w-[200px]';
  const subLabelClass = 'sticky left-0 z-[1] bg-white py-[9px] pl-[34px] pr-4 text-left text-[13px] font-normal text-[#717680] whitespace-nowrap w-[200px] min-w-[200px]';
  const tdClass = 'py-[9px] px-3.5 text-right align-middle whitespace-nowrap';
  const totalVal = 'text-xs font-medium text-[#252B37]';
  const subVal = 'text-xs font-normal text-[#535862]';
  // Row rules: hairline above each section start, none on breakdown rows,
  // a stronger rule above the bottom line. No vertical rules, no spacer bands.
  // Read-only table: no hover response — hover means editable elsewhere in the app.
  const rowHover = '';
  const sectionRowClass = 'border-t border-[#E9EAEB]';
  const netRowClass = 'border-t border-[#D5D7DA]';

  const totalNum = (v: number) => (
    <span className={`text-xs font-medium ${v < 0 ? 'text-[#F04438]' : 'text-[#252B37]'}`}>{formatNumber(v)}</span>
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 200 + yearCount * 80 }}>
          <thead>
            <tr>
              <th className={thLabelClass}>Year</th>
              {years.map((yearData) => (
                <th key={yearData.year} className={thClass}>
                  {yearData.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* BUY — parent row */}
            <tr className={sectionRowClass}>
              <td className={labelClass}>Buy</td>
              {years.map((yearData) => (
                <td key={`buy-${yearData.year}`} className={tdClass}>
                  {yearData.purchaseInYear && yearData.purchaseDetails && yearData.purchaseDetails.length > 0 ? (
                    <span className={totalVal}>
                      {yearData.purchaseDetails.map(p => formatNumber(p.totalCashRequired)).join(', ')}
                    </span>
                  ) : (
                    <span className={totalVal}>–</span>
                  )}
                </td>
              ))}
            </tr>

            {/* BUY — Cash sub-row */}
            <tr className={rowHover}>
              <td className={subLabelClass}>Cash</td>
              {years.map((yearData) => (
                <td key={`buy-cash-${yearData.year}`} className={tdClass}>
                  {yearData.purchaseInYear && yearData.purchaseDetails && yearData.purchaseDetails.length > 0 ? (
                    <span className={subVal}>
                      {yearData.purchaseDetails.map(p => formatNumber(p.fundingBreakdown?.cash || 0)).join(', ')}
                    </span>
                  ) : (
                    <span className={subVal}>–</span>
                  )}
                </td>
              ))}
            </tr>

            {/* BUY — Savings sub-row */}
            <tr className={rowHover}>
              <td className={subLabelClass}>Savings</td>
              {years.map((yearData) => (
                <td key={`buy-sav-${yearData.year}`} className={tdClass}>
                  {yearData.purchaseInYear && yearData.purchaseDetails && yearData.purchaseDetails.length > 0 ? (
                    <span className={subVal}>
                      {yearData.purchaseDetails.map(p => formatNumber(p.fundingBreakdown?.savings || 0)).join(', ')}
                    </span>
                  ) : (
                    <span className={subVal}>–</span>
                  )}
                </td>
              ))}
            </tr>

            {/* BUY — Equity release sub-row */}
            <tr className={rowHover}>
              <td className={subLabelClass}>Equity release</td>
              {years.map((yearData) => (
                <td key={`buy-eq-${yearData.year}`} className={tdClass}>
                  {yearData.purchaseInYear && yearData.purchaseDetails && yearData.purchaseDetails.length > 0 ? (
                    <span className={subVal}>
                      {yearData.purchaseDetails.map(p => formatNumber(p.fundingBreakdown?.equity || 0)).join(', ')}
                    </span>
                  ) : (
                    <span className={subVal}>–</span>
                  )}
                </td>
              ))}
            </tr>

            {/* FUNDS ($) */}
            <tr className={sectionRowClass}>
              <td className={labelClass}>Funds ($)</td>
              {years.map((yearData) => (
                <td key={`avail-${yearData.year}`} className={tdClass}>
                  {totalNum(yearData.availableFundsRaw)}
                </td>
              ))}
            </tr>

            {/* FUNDS — Cash sub-row */}
            <tr className={rowHover}>
              <td className={subLabelClass}>Cash</td>
              {years.map((yearData) => (
                <td key={`cash-${yearData.year}`} className={tdClass}>
                  <span className={subVal}>
                    {yearData.yearBreakdownData ? formatNumber(yearData.yearBreakdownData.baseDeposit || 0) : '–'}
                  </span>
                </td>
              ))}
            </tr>

            {/* FUNDS — Savings sub-row */}
            <tr className={rowHover}>
              <td className={subLabelClass}>Savings</td>
              {years.map((yearData) => (
                <td key={`savings-${yearData.year}`} className={tdClass}>
                  <span className={subVal}>
                    {yearData.yearBreakdownData ? formatNumber(yearData.yearBreakdownData.cumulativeSavings || 0) : '–'}
                  </span>
                </td>
              ))}
            </tr>

            {/* FUNDS — Equity release sub-row */}
            <tr className={rowHover}>
              <td className={subLabelClass}>Equity release</td>
              {years.map((yearData) => (
                <td key={`eqrelease-${yearData.year}`} className={tdClass}>
                  <span className={subVal}>
                    {yearData.yearBreakdownData ? formatNumber(yearData.yearBreakdownData.equityRelease || 0) : '–'}
                  </span>
                </td>
              ))}
            </tr>

            {/* DEBT ($) */}
            <tr className={sectionRowClass}>
              <td className={labelClass}>Debt ($)</td>
              {years.map((yearData) => (
                <td key={`debt-${yearData.year}`} className={tdClass}>
                  {totalNum(yearData.totalDebt)}
                </td>
              ))}
            </tr>

            {/* PROPERTY EQUITY ($) — portfolioValue - totalDebt */}
            <tr className={rowHover}>
              <td className={hasSales ? subLabelClass : labelClass}>
                {hasSales ? 'Property equity' : 'Equity ($)'}
              </td>
              {years.map((yearData) => (
                <td key={`prop-equity-${yearData.year}`} className={tdClass}>
                  <span className={hasSales ? subVal : totalVal}>
                    {yearData.propertyEquityRaw > 0 ? formatNumber(yearData.propertyEquityRaw) : '–'}
                  </span>
                </td>
              ))}
            </tr>

            {/* CAPITAL GAINS TAX ($) — tax paid on sales settling that year (2027 basis) */}
            {hasSales && (
              <tr className={rowHover}>
                <td className={subLabelClass}>Capital gains tax</td>
                {years.map((yearData) => {
                  const cgt = cgtByYear.get(yearData.year) ?? 0;
                  return (
                    <td key={`sale-cgt-${yearData.year}`} className={tdClass}>
                      <span className={subVal}>{cgt > 0 ? formatNumber(cgt) : '–'}</span>
                    </td>
                  );
                })}
              </tr>
            )}

            {/* CASH FROM SALES ($) — net proceeds after CGT, the year a sale settles */}
            {hasSales && (
              <tr className={rowHover}>
                <td className={subLabelClass}>Net proceeds from sales</td>
                {years.map((yearData) => (
                  <td key={`sale-cash-${yearData.year}`} className={tdClass}>
                    <span className={subVal}>{yearData.cashFromSales > 0 ? formatNumber(yearData.cashFromSales) : '–'}</span>
                  </td>
                ))}
              </tr>
            )}

            {/* TOTAL EQUITY ($) — Property Equity + Cash from Sales (only show when sales exist) */}
            {hasSales && (
              <tr className={netRowClass}>
                <td className={labelClass}>Total Equity ($)</td>
                {years.map((yearData) => (
                  <td key={`total-equity-${yearData.year}`} className={tdClass}>
                    <span className={totalVal}>{yearData.totalEquityRaw > 0 ? formatNumber(yearData.totalEquityRaw) : '–'}</span>
                  </td>
                ))}
              </tr>
            )}

            {/* INCOME ($) */}
            <tr className={sectionRowClass}>
              <td className={labelClass}>Income ($)</td>
              {years.map((yearData) => {
                const cf = cashflowByYear.get(yearData.year);
                return (
                  <td key={`income-${yearData.year}`} className={tdClass}>
                    <span className={totalVal}>{cf && cf.rentalIncome > 0 ? formatNumber(cf.rentalIncome) : '–'}</span>
                  </td>
                );
              })}
            </tr>

            {/* EXPENSES ($) — breakdown row under Income */}
            <tr className={rowHover}>
              <td className={subLabelClass}>Expenses ($)</td>
              {years.map((yearData) => {
                const cf = cashflowByYear.get(yearData.year);
                return (
                  <td key={`expenses-${yearData.year}`} className={tdClass}>
                    <span className={subVal}>{cf && cf.expenses > 0 ? formatNumber(cf.expenses) : '–'}</span>
                  </td>
                );
              })}
            </tr>

            {/* LOANS ($) — breakdown row under Income */}
            <tr className={rowHover}>
              <td className={subLabelClass}>Loans ($)</td>
              {years.map((yearData) => {
                const cf = cashflowByYear.get(yearData.year);
                return (
                  <td key={`loans-${yearData.year}`} className={tdClass}>
                    <span className={subVal}>{cf && cf.loanRepayments > 0 ? formatNumber(cf.loanRepayments) : '–'}</span>
                  </td>
                );
              })}
            </tr>

            {/* NET ($) — the one intentional emphasis: weight 600 + a stronger rule (§2.2) */}
            <tr className={netRowClass}>
              <td className="sticky left-0 z-[1] bg-white py-[9px] px-4 text-left text-[13px] font-semibold text-[#181D27] whitespace-nowrap w-[200px] min-w-[200px]">Net ($)</td>
              {years.map((yearData) => {
                const cf = cashflowByYear.get(yearData.year);
                const cashflow = cf?.cashflow ?? 0;
                const hasValue = cf && (cf.rentalIncome > 0 || cf.loanRepayments > 0);
                return (
                  <td key={`net-${yearData.year}`} className={tdClass}>
                    <span className={`text-xs font-semibold ${hasValue && cashflow < 0 ? 'text-[#F04438]' : 'text-[#181D27]'}`}>
                      {hasValue ? formatNumber(cashflow) : '–'}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
