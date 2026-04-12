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
    <div className="bg-white rounded-xl border border-[#E9EAEB] p-6">
      {/* Header */}
      <div
        className={`flex items-center justify-between ${collapsible ? 'cursor-pointer select-none' : ''} ${collapsed ? '' : 'mb-5'}`}
        onClick={collapsible ? () => setCollapsed(c => !c) : undefined}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <div className="text-[#717680]">
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </div>
          )}
          <h3 className="text-base font-semibold text-[#181D27]">{title}</h3>
        </div>
        {action && !collapsed && action}
      </div>

      {/* Content */}
      {!collapsed && (
        <>
          <div>
            {children}
          </div>

          {/* Legend */}
          {legend && legend.length > 0 && (
            <div className="flex items-center gap-4 mt-5">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  {item.variant === 'ring' ? (
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: 'white', border: `2px solid ${item.color}` }}
                    />
                  ) : (
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <span className="text-xs text-[#535862]">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
