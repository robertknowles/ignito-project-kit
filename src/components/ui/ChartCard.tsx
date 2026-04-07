import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface LegendItem {
  color: string;
  label: string;
}

interface ChartCardProps {
  title: string;
  action?: React.ReactNode;
  legend?: LegendItem[];
  contentClassName?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

/**
 * ChartCard — Universal card wrapper for dashboard components
 *
 * Consistent anatomy: white bg, 1px #E5E7EB border, 8px radius, 24px padding.
 * Title only in header (no subtitles). Optional action slot top-right.
 * Optional collapsible mode with one-line preview.
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title, action, legend, contentClassName, collapsible, defaultCollapsed, children
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div
        className={`px-6 pt-6 pb-2 flex items-center justify-between ${collapsible ? 'cursor-pointer select-none' : ''} ${collapsed ? 'pb-6' : ''}`}
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
          <div className={contentClassName ?? "px-6 pt-4 pb-6"}>
            {children}
          </div>

          {/* Legend */}
          {legend && legend.length > 0 && (
            <div className="px-6 pb-5 pt-1 flex items-center gap-5">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
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
