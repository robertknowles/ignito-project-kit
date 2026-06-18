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

  // Shared cell classes — matched to PropertyCardRow sizing
  const thClass = 'text-center text-xs font-semibold text-neutral-500 py-2 px-3 whitespace-nowrap';
  const tdClass = 'py-2 px-3 text-center align-middle';
  const labelClass = 'py-2 px-3 text-xs font-semibold text-neutral-500 whitespace-nowrap border-r border-neutral-100';
  const subLabelClass = 'py-2 pl-6 pr-3 text-xs font-semibold text-neutral-500 whitespace-nowrap border-r border-neutral-100';
  const valClass = 'text-xs text-neutral-600';
  const emptyClass = 'text-xs text-neutral-300';
  const rowClass = 'border-b border-neutral-200';

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: yearCount > 8 ? yearCount * 100 : 700 }}>
          <thead>
            <tr className="border-b border-neutral-200">
              <th className={`text-left ${thClass} border-r border-neutral-100`} />
              {years.map((yearData, i) => (
                <th
                  key={yearData.year}
                  className={`${thClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}
                >
                  {yearData.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* BUY — parent row */}
            <tr className={rowClass}>
              <td className={labelClass}>Buy</td>
              {years.map((yearData, i) => (
                <td
                  key={`buy-${yearData.year}`}
                  className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}
                >
                  {yearData.purchaseInYear && yearData.purchaseDetails && yearData.purchaseDetails.length > 0 ? (
                    <span className="text-xs font-medium text-neutral-900">
                      {yearData.purchaseDetails.map(p => formatNumber(p.totalCashRequired)).join(', ')}
                    </span>
                  ) : (
                    <span className={emptyClass}>–</span>
                  )}
                </td>
              ))}
            </tr>

            {/* BUY — Cash sub-row */}
            <tr className={rowClass}>
              <td className={subLabelClass}>Cash</td>
              {years.map((yearData, i) => (
                <td
                  key={`buy-cash-${yearData.year}`}
                  className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}
                >
                  {yearData.purchaseInYear && yearData.purchaseDetails && yearData.purchaseDetails.length > 0 ? (
                    <span className={valClass}>
                      {yearData.purchaseDetails.map(p => formatNumber(p.fundingBreakdown?.cash || 0)).join(', ')}
                    </span>
                  ) : (
                    <span className={emptyClass}>–</span>
                  )}
                </td>
              ))}
            </tr>

            {/* BUY — Savings sub-row */}
            <tr className={rowClass}>
              <td className={subLabelClass}>Savings</td>
              {years.map((yearData, i) => (
                <td
                  key={`buy-sav-${yearData.year}`}
                  className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}
                >
                  {yearData.purchaseInYear && yearData.purchaseDetails && yearData.purchaseDetails.length > 0 ? (
                    <span className={valClass}>
                      {yearData.purchaseDetails.map(p => formatNumber(p.fundingBreakdown?.savings || 0)).join(', ')}
                    </span>
                  ) : (
                    <span className={emptyClass}>–</span>
                  )}
                </td>
              ))}
            </tr>

            {/* BUY — Equity release sub-row */}
            <tr className={rowClass}>
              <td className={subLabelClass}>Equity release</td>
              {years.map((yearData, i) => (
                <td
                  key={`buy-eq-${yearData.year}`}
                  className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}
                >
                  {yearData.purchaseInYear && yearData.purchaseDetails && yearData.purchaseDetails.length > 0 ? (
                    <span className={valClass}>
                      {yearData.purchaseDetails.map(p => formatNumber(p.fundingBreakdown?.equity || 0)).join(', ')}
                    </span>
                  ) : (
                    <span className={emptyClass}>–</span>
                  )}
                </td>
              ))}
            </tr>

            {/* FUNDS ($) */}
            <tr className={rowClass}>
              <td className={labelClass}>Funds ($)</td>
              {years.map((yearData, i) => (
                <td key={`avail-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                  <span className={valClass}>{formatNumber(yearData.availableFundsRaw)}</span>
                </td>
              ))}
            </tr>

            {/* FUNDS — Cash sub-row */}
            <tr className={rowClass}>
              <td className={subLabelClass}>Cash</td>
              {years.map((yearData, i) => (
                <td key={`cash-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                  <span className={valClass}>
                    {yearData.yearBreakdownData ? formatNumber(yearData.yearBreakdownData.baseDeposit || 0) : '–'}
                  </span>
                </td>
              ))}
            </tr>

            {/* FUNDS — Savings sub-row */}
            <tr className={rowClass}>
              <td className={subLabelClass}>Savings</td>
              {years.map((yearData, i) => (
                <td key={`savings-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                  <span className={valClass}>
                    {yearData.yearBreakdownData ? formatNumber(yearData.yearBreakdownData.cumulativeSavings || 0) : '–'}
                  </span>
                </td>
              ))}
            </tr>

            {/* FUNDS — Equity release sub-row */}
            <tr className={rowClass}>
              <td className={subLabelClass}>Equity release</td>
              {years.map((yearData, i) => (
                <td key={`eqrelease-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                  <span className={valClass}>
                    {yearData.yearBreakdownData ? formatNumber(yearData.yearBreakdownData.equityRelease || 0) : '–'}
                  </span>
                </td>
              ))}
            </tr>

            {/* DEBT ($) */}
            <tr className={rowClass}>
              <td className={labelClass}>Debt ($)</td>
              {years.map((yearData, i) => (
                <td key={`debt-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                  <span className={valClass}>{formatNumber(yearData.totalDebt)}</span>
                </td>
              ))}
            </tr>

            {/* PROPERTY EQUITY ($) — portfolioValue - totalDebt */}
            <tr className={rowClass}>
              <td className={hasSales ? subLabelClass : labelClass}>
                {hasSales ? 'Property equity' : 'Equity ($)'}
              </td>
              {years.map((yearData, i) => (
                <td key={`prop-equity-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                  <span className={valClass}>{yearData.propertyEquityRaw > 0 ? formatNumber(yearData.propertyEquityRaw) : '–'}</span>
                </td>
              ))}
            </tr>

            {/* CAPITAL GAINS TAX ($) — tax paid on sales settling that year (2027 basis) */}
            {hasSales && (
              <tr className={rowClass}>
                <td className={subLabelClass}>Capital gains tax</td>
                {years.map((yearData, i) => {
                  const cgt = cgtByYear.get(yearData.year) ?? 0;
                  return (
                    <td key={`sale-cgt-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                      <span className={valClass}>{cgt > 0 ? formatNumber(cgt) : '–'}</span>
                    </td>
                  );
                })}
              </tr>
            )}

            {/* CASH FROM SALES ($) — net proceeds after CGT, the year a sale settles */}
            {hasSales && (
              <tr className={rowClass}>
                <td className={subLabelClass}>Net proceeds from sales</td>
                {years.map((yearData, i) => (
                  <td key={`sale-cash-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                    <span className={valClass}>{yearData.cashFromSales > 0 ? formatNumber(yearData.cashFromSales) : '–'}</span>
                  </td>
                ))}
              </tr>
            )}

            {/* TOTAL EQUITY ($) — Property Equity + Cash from Sales (only show when sales exist) */}
            {hasSales && (
              <tr className={`${rowClass} border-t-2 border-neutral-300`}>
                <td className={`${labelClass} font-bold text-neutral-700`}>Total Equity ($)</td>
                {years.map((yearData, i) => (
                  <td key={`total-equity-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                    <span className="text-xs font-semibold text-neutral-700">{yearData.totalEquityRaw > 0 ? formatNumber(yearData.totalEquityRaw) : '–'}</span>
                  </td>
                ))}
              </tr>
            )}

            {/* INCOME ($) */}
            <tr className={rowClass}>
              <td className={labelClass}>Income ($)</td>
              {years.map((yearData, i) => {
                const cf = cashflowByYear.get(yearData.year);
                return (
                  <td key={`income-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                    <span className={valClass}>{cf && cf.rentalIncome > 0 ? formatNumber(cf.rentalIncome) : '–'}</span>
                  </td>
                );
              })}
            </tr>

            {/* EXPENSES ($) */}
            <tr className={rowClass}>
              <td className={labelClass}>Expenses ($)</td>
              {years.map((yearData, i) => {
                const cf = cashflowByYear.get(yearData.year);
                return (
                  <td key={`expenses-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                    <span className={valClass}>{cf && cf.expenses > 0 ? formatNumber(cf.expenses) : '–'}</span>
                  </td>
                );
              })}
            </tr>

            {/* LOANS ($) */}
            <tr className={rowClass}>
              <td className={labelClass}>Loans ($)</td>
              {years.map((yearData, i) => {
                const cf = cashflowByYear.get(yearData.year);
                return (
                  <td key={`loans-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                    <span className={valClass}>{cf && cf.loanRepayments > 0 ? formatNumber(cf.loanRepayments) : '–'}</span>
                  </td>
                );
              })}
            </tr>

            {/* NET ($) */}
            <tr className={`${rowClass} last:border-b-0`}>
              <td className={labelClass}>Net ($)</td>
              {years.map((yearData, i) => {
                const cf = cashflowByYear.get(yearData.year);
                const cashflow = cf?.cashflow ?? 0;
                const hasValue = cf && (cf.rentalIncome > 0 || cf.loanRepayments > 0);
                return (
                  <td key={`net-${yearData.year}`} className={`${tdClass} ${i < yearCount - 1 ? 'border-r border-neutral-100' : ''}`}>
                    <span className={valClass}>{hasValue ? formatNumber(cashflow) : '–'}</span>
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
