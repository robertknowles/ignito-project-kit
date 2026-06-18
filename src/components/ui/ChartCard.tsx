import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export interface LegendItem {
  color: string;
  label: string;
  /** 'ring' renders an open circle outline; 'line' renders a dotted line */
  variant?: 'dot' | 'ring' | 'line';
}

interface ChartCardProps {
  title: string;
  action?: React.ReactNode;
  legend?: LegendItem[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  flush?: boolean;
  /** When true, shows an expand icon that opens the chart in a large modal */
  expandable?: boolean;
  /** When true, renders the legend on its own row beneath the title (keeps the title row tidy in narrow cards) */
  legendBelow?: boolean;
  children: React.ReactNode;
}

// ── UUI Design Tokens (from live DOM inspection of Dashboard 03) ────────────
const UUI = {
  neutral900: '#171717',
  neutral700: '#404040',
  neutral500: '#737373',
  neutral200: '#E5E5E5',
  neutral50: '#FAFAFA',
  white: '#FFFFFF',
} as const;

/**
 * ChartCard — UUI Dashboard 03 card style
 *
 * Two-layer card: outer shell (#FAFAFA, shadow-xs, ring-1) wraps
 * an inner white section (12px radius, 20px padding, ring-1).
 * Title in the outer header, chart content in the inner card.
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title, action, legend, collapsible, defaultCollapsed, flush, expandable, legendBelow, children
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  const [expanded, setExpanded] = useState(false);

  const legendNode = legend && legend.length > 0 ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {legend.map((item, idx) => (
        <div key={`${item.label}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {item.variant === 'line' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: item.color }} />
              <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: item.color }} />
            </span>
          ) : item.variant === 'ring' ? (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'white',
                border: `1.5px solid ${item.color}`,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: item.color,
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontSize: 12,
              color: UUI.neutral500,
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  ) : null;

  return (
    /* Outer shell — #FAFAFA bg, 12px radius, inset ring, shadow-xs */
    <div
      style={{
        background: UUI.neutral50,
        borderRadius: 12,
        boxShadow: `${UUI.neutral200} 0px 0px 0px 1px inset, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px`,
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header band — sits in the outer shell */}
      <div
        style={{ padding: '12px 20px 0 20px' }}
        className={collapsible ? 'cursor-pointer select-none' : ''}
        onClick={collapsible ? () => setCollapsed(c => !c) : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {collapsible && (
              <div style={{ color: UUI.neutral500 }}>
                {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </div>
            )}
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: UUI.neutral900,
                lineHeight: '20px',
                margin: 0,
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              }}
            >
              {title}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Legend — inline in header (unless moved below) */}
            {!collapsed && !legendBelow && legendNode}
            {action && !collapsed && action}
            {expandable && !collapsed && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                title="Expand"
                aria-label="Expand chart"
                className="flex items-center justify-center w-7 h-7 -my-0.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <Maximize2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Legend — own row beneath the title (narrow cards) */}
        {!collapsed && legendBelow && legendNode && (
          <div style={{ marginTop: 8 }}>{legendNode}</div>
        )}
      </div>

      {/* Inner white card — 12px radius, 20px padding, inset ring */}
      {!collapsed && (
        <div
          style={{
            background: UUI.white,
            borderRadius: 12,
            margin: '12px 0 0 0',
            boxShadow: `${UUI.neutral200} 0px 0px 0px 1px inset`,
            padding: flush ? 0 : 20,
            flex: 1,
          }}
        >
          {children}
        </div>
      )}

      {/* Expanded modal — large centered view of the same chart */}
      {expandable && (
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent className="max-w-5xl w-[92vw] p-6">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginRight: 32 }}>
              <DialogTitle
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: UUI.neutral900,
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                }}
              >
                {title}
              </DialogTitle>
              {legendNode}
            </div>
            <div style={{ marginTop: 8 }}>
              {children}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
