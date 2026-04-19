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
 * Matches the skeleton loading layout exactly:
 * p-6 padding, title text, mb-4 gap, then content. No inner bordered boxes.
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title, action, legend, collapsible, defaultCollapsed, children
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);

  return (
    <div className="rounded-lg border border-[#E9EAEB] overflow-hidden">
      {/* Gray header band */}
      <div
        className={`bg-[#FCFCFD] px-6 py-3.5 flex items-center justify-between ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setCollapsed(c => !c) : undefined}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <div className="text-[#717680]">
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </div>
          )}
          <h3 className="text-sm font-semibold text-[#181D27]">{title}</h3>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend — inline in header */}
          {legend && legend.length > 0 && !collapsed && (
            <div className="flex items-center gap-3">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  {item.variant === 'ring' ? (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: 'white', border: `1.5px solid ${item.color}` }}
                    />
                  ) : (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <span className="text-xs text-[#717680]">{item.label}</span>
                </div>
              ))}
            </div>
          )}
          {action && !collapsed && action}
        </div>
      </div>

      {/* White content area */}
      {!collapsed && (
        <div className="bg-[#FCFCFD]">
          <div className="bg-white p-6 rounded-t-xl border-t border-[#E9EAEB]">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
