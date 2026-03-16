import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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

export const ChartCard: React.FC<ChartCardProps> = ({
  title, action, legend, contentClassName, collapsible, defaultCollapsed, children
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Title */}
      <div
        className={`px-6 pt-6 flex items-center justify-between ${collapsible ? 'cursor-pointer select-none' : ''} ${collapsed ? 'pb-6' : ''}`}
        onClick={collapsible ? () => setCollapsed(c => !c) : undefined}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
          {collapsible && (
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
            />
          )}
        </div>
        {action}
      </div>

      {/* Content */}
      {!collapsed && (
        <>
          <div className={contentClassName ?? "pl-4 pr-4 pt-6 pb-6"}>
            {children}
          </div>

          {/* Legend */}
          {legend && legend.length > 0 && (
            <div className="pl-12 pr-6 pb-6 pt-2 flex items-center gap-5">
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
