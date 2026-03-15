import React, { useState } from 'react';
import type { PropertyYearSnapshot } from '../../utils/metricsCalculator';
import { HoldingCostSparkline } from './HoldingCostSparkline';
import { CHART_COLORS } from '../../constants/chartColors';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface HoldingCostCardProps {
  title: string;
  buyYear: number;
  color: string;
  snapshots: PropertyYearSnapshot[];
  snapshotYear: number;
}

const fmtMo = (v: number) => `$${Math.abs(Math.round(v)).toLocaleString()}`;

export const HoldingCostCard: React.FC<HoldingCostCardProps> = ({
  title,
  buyYear,
  color,
  snapshots,
  snapshotYear,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const snapshot = snapshots.find(s => s.year === snapshotYear);
  if (!snapshot) return null;

  const isPositive = snapshot.monthlyNetCost >= 0;
  const totalCosts = snapshot.monthlyMortgage + snapshot.monthlyManagement +
    snapshot.monthlyCouncil + snapshot.monthlyInsurance +
    snapshot.monthlyMaintenance + snapshot.monthlyVacancy + snapshot.monthlyStrata;
  const coveragePct = totalCosts > 0 ? Math.min(100, (snapshot.monthlyRent / totalCosts) * 100) : 0;

  const breakdownItems = [
    { label: 'Mortgage', value: snapshot.monthlyMortgage },
    { label: 'Management', value: snapshot.monthlyManagement },
    { label: 'Council Rates', value: snapshot.monthlyCouncil },
    { label: 'Insurance', value: snapshot.monthlyInsurance },
    { label: 'Maintenance', value: snapshot.monthlyMaintenance },
    { label: 'Vacancy', value: snapshot.monthlyVacancy },
    ...(snapshot.monthlyStrata > 0 ? [{ label: 'Strata', value: snapshot.monthlyStrata }] : []),
  ];

  return (
    <div className="overflow-hidden">
      {/* Main card — no inner border */}
      <button
        className="w-full text-left px-1 py-2 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Top row: color chip + name + sparkline + net cost */}
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-1 h-9 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[12px] font-semibold text-gray-900">{title}</div>
                <div className="text-[10px] text-gray-400">Bought {buyYear}</div>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">
                  {isPositive ? '+' : '-'}{fmtMo(snapshot.monthlyNetCost)}
                </span>
                <span className="text-[10px] font-normal text-gray-400">/mo</span>
              </div>
            </div>
            {/* Sparkline */}
            <div className="mt-1">
              <HoldingCostSparkline
                data={snapshots}
                color={color}
                currentYear={snapshotYear}
              />
            </div>
          </div>
        </div>

        {/* Rent vs Costs bar */}
        <div className="ml-4">
          <div className="relative h-5 bg-gray-100 rounded overflow-hidden">
            {/* Rent overlay */}
            <div
              className="absolute left-0 top-0 h-full rounded"
              style={{
                width: `${coveragePct}%`,
                backgroundColor: CHART_COLORS.primary,
                opacity: 0.25,
              }}
            />
            {/* Labels */}
            <div className="relative flex justify-between items-center h-full px-2">
              <span className="text-[10px] font-medium text-gray-600">
                Rent: {fmtMo(snapshot.monthlyRent)}
              </span>
              <span className="text-[10px] font-medium text-gray-400">
                Costs: {fmtMo(totalCosts)} · {Math.round(coveragePct)}% covered
              </span>
            </div>
          </div>
        </div>

        {/* Expand hint */}
        <div className="ml-4 mt-1 flex items-center gap-1 text-[10px] text-gray-400">
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {isExpanded ? 'Hide breakdown' : 'Show cost breakdown'}
        </div>
      </button>

      {/* Expanded breakdown */}
      {isExpanded && (
        <div className="px-1 pb-3 pt-0">
          <div className="pt-2.5 pl-5">
            {breakdownItems.map((item, idx) => {
              const pct = totalCosts > 0 ? (item.value / totalCosts) * 100 : 0;
              const itemColor = CHART_COLORS.series[idx % CHART_COLORS.series.length];
              return (
                <div key={item.label} className="flex items-center gap-2.5 py-0.5">
                  <div
                    className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: itemColor, opacity: 0.7 }}
                  />
                  <div className="flex-1 text-[11px] text-gray-500">{item.label}</div>
                  <div className="w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: itemColor, opacity: 0.5 }}
                    />
                  </div>
                  <div className="w-12 text-right text-[11px] font-medium text-gray-900">
                    {fmtMo(item.value)}
                  </div>
                </div>
              );
            })}

            {/* Subtotals */}
            <div className="flex justify-between mt-2 pt-1.5">
              <span className="text-[11px] font-medium text-gray-500">Total Costs</span>
              <span className="text-[11px] font-medium text-gray-500">
                {fmtMo(totalCosts)}/mo
              </span>
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[11px] font-medium text-gray-500">Rental Income</span>
              <span className="text-[11px] font-medium text-gray-500">
                {fmtMo(snapshot.monthlyRent)}/mo
              </span>
            </div>
            <div className="flex justify-between mt-1.5 pt-1.5">
              <span className="text-[11px] font-semibold text-gray-900">Net Cost</span>
              <span className="text-[11px] font-semibold text-gray-900">
                {isPositive ? '+' : '-'}{fmtMo(snapshot.monthlyNetCost)}/mo
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
