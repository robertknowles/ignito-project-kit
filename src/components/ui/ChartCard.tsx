import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface LegendItem {
  color: string;
  label: string;
  /** 'ring' renders an open circle outline instead of a filled dot */
  variant?: 'dot' | 'ring';
}

interface ChartCardProps {
  title: string;
  action?: React.ReactNode;
  legend?: LegendItem[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

/**
 * ChartCard — Universal card wrapper for dashboard components
 *
 * Single consistent anatomy for ALL cards: charts, tables, summaries.
 * Header: px-6 pt-6 pb-3. Content: px-6 pb-5. Legend: px-6 pb-5.
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title, action, legend, collapsible, defaultCollapsed, children
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div
        className={`px-6 pt-6 pb-3 flex items-center justify-between ${collapsible ? 'cursor-pointer select-none' : ''} ${collapsed ? 'pb-6' : ''}`}
        onClick={collapsible ? () => setCollapsed(c => !c) : undefined}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <div className="text-gray-400">
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </div>
          )}
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
        {action && !collapsed && action}
      </div>

      {/* Content */}
      {!collapsed && (
        <>
          <div className="px-6 pb-5">
            {children}
          </div>

          {/* Legend */}
          {legend && legend.length > 0 && (
            <div className="px-6 pb-5 flex items-center gap-5 -mt-2">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  {item.variant === 'ring' ? (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: 'white', border: `2px solid ${item.color}` }}
                    />
                  ) : (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <span className="text-[11px] text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
