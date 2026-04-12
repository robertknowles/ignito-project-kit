import React, { useState, useMemo, createContext, useContext } from 'react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { useHoldingCostTimeline } from './useHoldingCostTimeline';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PROPERTY_COLORS } from '../../constants/chartColors';

// Shared state context so the year dropdown (in ChartCard action slot) and panel body stay in sync
const HoldingCostYearContext = createContext<{
  snapshotYear: number;
  setSnapshotYear: (y: number) => void;
  yearOptions: number[];
} | null>(null);

const fmtMo = (v: number) => `$${Math.abs(Math.round(v)).toLocaleString()}`;

/**
 * Monthly Holding Costs — Expandable table with year dropdown
 *
 * Summary hero number at top, then expandable rows per property showing
 * costs, rent, coverage mini-bar, and net cashflow. Expanded state shows
 * full cost breakdown with subtotals.
 */
export const HoldingCostPanel: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();
  const { properties, startYear, endYear } = useHoldingCostTimeline(timelineProperties, profile, getInstance);

  const latestBuyYear = properties.length > 0
    ? Math.max(...properties.map(p => p.buyYear))
    : endYear;

  // Use shared context if available (when wrapped by HoldingCostSection), else own state
  const ctx = useContext(HoldingCostYearContext);
  const [localYear, setLocalYear] = useState(() => Math.min(latestBuyYear, endYear));
  const snapshotYear = ctx?.snapshotYear ?? localYear;

  // Default expanded: first property (Property 1)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  // Portfolio totals
  const totals = useMemo(() => {
    let totalNet = 0;
    let totalRent = 0;
    let totalCosts = 0;

    properties.forEach(prop => {
      const snap = prop.snapshots.find(s => s.year === snapshotYear);
      if (!snap) return;
      totalNet += snap.monthlyNetCost;
      totalRent += snap.monthlyRent;
      const costs = snap.monthlyMortgage + snap.monthlyManagement + snap.monthlyCouncil +
        snap.monthlyInsurance + snap.monthlyMaintenance + snap.monthlyVacancy + snap.monthlyStrata;
      totalCosts += costs;
    });

    const coverage = totalCosts > 0 ? Math.round((totalRent / totalCosts) * 100) : 0;
    return { totalNet, totalRent, totalCosts, coverage };
  }, [properties, snapshotYear]);

  if (properties.length === 0) {
    return (
      <p className="text-sm text-[#717680] py-8 text-center">
        Add properties to see holding costs
      </p>
    );
  }

  return (
    <div>
      {/* Summary section */}
      <div
        className="pb-5 mb-6"
        style={{ borderBottom: '1px solid #E9EAEB' }}
      >
        <div className="flex items-baseline gap-6">
          <div>
            <span className="text-xl font-semibold text-[#181D27]">
              {totals.totalNet >= 0 ? '+' : '-'}{fmtMo(totals.totalNet)}
            </span>
            <span className="text-sm text-[#535862] ml-1.5">/mo net cashflow</span>
          </div>
          <span className="text-sm text-[#535862]">{totals.coverage}% coverage</span>
        </div>
      </div>

      {/* Property rows */}
      {properties.map((prop, idx) => {
        const snapshot = prop.snapshots.find(s => s.year === snapshotYear);
        if (!snapshot) return null;

        const totalCosts = snapshot.monthlyMortgage + snapshot.monthlyManagement +
          snapshot.monthlyCouncil + snapshot.monthlyInsurance +
          snapshot.monthlyMaintenance + snapshot.monthlyVacancy + snapshot.monthlyStrata;
        const coveragePct = totalCosts > 0 ? Math.min(100, (snapshot.monthlyRent / totalCosts) * 100) : 0;
        const isOpen = expandedIdx === idx;
        const isLast = idx === properties.length - 1;

        const operatingCosts = snapshot.monthlyManagement + snapshot.monthlyMaintenance + snapshot.monthlyVacancy;
        const ownershipCosts = snapshot.monthlyCouncil + snapshot.monthlyInsurance + (snapshot.monthlyStrata || 0);

        const breakdownItems = [
          { label: 'Mortgage', value: snapshot.monthlyMortgage },
          { label: 'Operating costs', value: operatingCosts },
          { label: 'Ownership costs', value: ownershipCosts },
        ];

        return (
          <div key={prop.instanceId}>
            {/* Collapsed row */}
            <button
              className="w-full flex items-center gap-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
              style={{
                padding: '14px 0',
                borderBottom: !isLast || isOpen ? '1px solid #E9EAEB' : undefined,
              }}
              onClick={() => setExpandedIdx(isOpen ? null : idx)}
            >
              {/* Chevron */}
              <div className="flex-shrink-0 w-4 text-[#717680]">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>

              {/* Colour dot */}
              <div
                className="flex-shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: PROPERTY_COLORS[idx % PROPERTY_COLORS.length] }}
              />

              {/* Property name + bought year */}
              <div className="flex-1 text-left min-w-0">
                <span className="text-sm font-medium text-[#181D27]">{prop.title}</span>
                <div className="text-xs text-[#717680]">Bought {prop.buyYear}</div>
              </div>

              {/* Costs */}
              <div className="flex-shrink-0 text-right" style={{ minWidth: 80 }}>
                <span className="text-[13px] text-[#535862]">{fmtMo(totalCosts)}</span>
                <div className="text-[11px] text-[#717680]">costs</div>
              </div>

              {/* Rent */}
              <div className="flex-shrink-0 text-right" style={{ minWidth: 80 }}>
                <span className="text-[13px] text-[#535862]">{fmtMo(snapshot.monthlyRent)}</span>
                <div className="text-[11px] text-[#717680]">rent</div>
              </div>

              {/* Coverage mini-bar */}
              <div className="flex-shrink-0 text-right" style={{ minWidth: 50 }}>
                <span className="text-xs text-[#717680]">{Math.round(coveragePct)}%</span>
                <div className="h-[3px] rounded-full overflow-hidden mt-0.5" style={{ width: 50, backgroundColor: '#F3F4F6' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${coveragePct}%`, backgroundColor: 'rgba(37, 99, 235, 0.6)' }}
                  />
                </div>
              </div>

              {/* Net cashflow */}
              <div className="flex-shrink-0 text-right" style={{ minWidth: 80 }}>
                <span className="text-sm font-semibold text-[#535862]">
                  {snapshot.monthlyNetCost >= 0 ? '+' : '-'}{fmtMo(snapshot.monthlyNetCost)}
                </span>
                <div className="text-[11px] text-[#717680]">/mo</div>
              </div>
            </button>

            {/* Expanded breakdown */}
            {isOpen && (
              <div style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 16 }}>
                {breakdownItems.map((item, bi) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                    style={{
                      padding: '7px 0',
                      fontSize: 13,
                      borderBottom: bi < breakdownItems.length - 1 ? '1px solid #F9FAFB' : undefined,
                    }}
                  >
                    <span className="text-[#535862]">{item.label}</span>
                    <span className="font-medium text-[#414651]">{fmtMo(item.value)}</span>
                  </div>
                ))}

                {/* Subtotals */}
                <div
                  className="mt-2 pt-2"
                  style={{ borderTop: '1px solid #E5E7EB' }}
                >
                  <div className="flex justify-between py-1" style={{ fontSize: 13 }}>
                    <span className="text-[#535862] font-medium">Total costs</span>
                    <span className="font-semibold text-[#181D27]">{fmtMo(totalCosts)}</span>
                  </div>
                  <div className="flex justify-between py-1" style={{ fontSize: 13 }}>
                    <span className="text-[#535862]">Rental income</span>
                    <span className="font-medium text-[#414651]">{fmtMo(snapshot.monthlyRent)}</span>
                  </div>
                  <div className="flex justify-between py-1" style={{ fontSize: 13 }}>
                    <span className="text-[#535862]">Net cashflow</span>
                    <span className="font-bold text-[#181D27]">
                      {snapshot.monthlyNetCost >= 0 ? '+' : '-'}{fmtMo(snapshot.monthlyNetCost)}/mo
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** Year dropdown for ChartCard action slot */
export const HoldingCostYearDropdown: React.FC = () => {
  const ctx = useContext(HoldingCostYearContext);
  if (!ctx) return null;
  const { snapshotYear, setSnapshotYear, yearOptions } = ctx;

  return (
    <select
      value={snapshotYear}
      onChange={e => setSnapshotYear(Number(e.target.value))}
      className="appearance-none cursor-pointer bg-white text-[#414651] font-medium"
      style={{
        padding: '4px 10px',
        fontSize: 13,
        border: '1px solid #E5E7EB',
        borderRadius: 6,
        outline: 'none',
      }}
    >
      {yearOptions.map(y => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );
};

/** Wrapper that provides shared year state to both dropdown and panel */
export const HoldingCostSection: React.FC<{ children: (dropdown: React.ReactNode, panel: React.ReactNode) => React.ReactNode }> = ({ children }) => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();
  const { properties, startYear, endYear } = useHoldingCostTimeline(timelineProperties, profile, getInstance);

  const latestBuyYear = properties.length > 0
    ? Math.max(...properties.map(p => p.buyYear))
    : endYear;
  const [snapshotYear, setSnapshotYear] = useState(() =>
    Math.min(latestBuyYear, endYear)
  );

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = startYear; y <= endYear; y++) years.push(y);
    return years;
  }, [startYear, endYear]);

  return (
    <HoldingCostYearContext.Provider value={{ snapshotYear, setSnapshotYear, yearOptions }}>
      {children(
        <HoldingCostYearDropdown />,
        <HoldingCostPanel />
      )}
    </HoldingCostYearContext.Provider>
  );
};
