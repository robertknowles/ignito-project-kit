import React from 'react';

export interface LegendItem {
  color: string;
  label: string;
}

interface ChartCardProps {
  title: string;
  action?: React.ReactNode;
  legend?: LegendItem[];
  contentClassName?: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, action, legend, contentClassName, children }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Title */}
      <div className="px-6 pt-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {action}
      </div>

      {/* Content */}
      <div className={contentClassName ?? "pl-2 pr-2 pt-5 pb-4"}>
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
    </div>
  );
};
