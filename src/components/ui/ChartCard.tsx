import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useChartHoverTracking } from '@/hooks/useInteractionTracking';

export interface LegendItem {
  color: string;
  label: string;
  /** 'ring' = open circle outline; 'line' = dotted line; 'swatch' = filled band chip; 'square' = 8×8 bar-chart chip */
  variant?: 'dot' | 'ring' | 'line' | 'swatch' | 'square';
  /** Optional one-line explainer shown in a small popover when the legend item is hovered. */
  info?: string;
}

interface ChartCardProps {
  title: string;
  /** Rendered immediately after the title - the calculated-view (i) popover. */
  titleInfo?: React.ReactNode;
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

// ── PropPath card tokens (prototype-exact - PropPath Design System §1) ───────
const UUI = {
  neutral900: '#181D27',  // primary text / values
  neutral700: '#414651',  // card titles
  neutral500: '#717680',  // meta / legend
  neutral200: '#E9EAEB',  // card border
  neutral50: '#FAFAFA',
  white: '#FFFFFF',
} as const;

/**
 * ChartCard - PropPath single flat white card
 *
 * One white card (14px radius, 1px #E9EAEB border). Title (13px/600 #414651)
 * plus optional legend/action/expand in the header, chart content below.
 * `flush` removes content padding for edge-to-edge tables.
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title, titleInfo, action, legend, collapsible, defaultCollapsed, flush, expandable, legendBelow, children
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  const [expanded, setExpanded] = useState(false);
  const hoverTracking = useChartHoverTracking(title);

  const legendNode = legend && legend.length > 0 ? (
    <TooltipProvider delayDuration={100}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {legend.map((item, idx) => {
          const marker = item.variant === 'line' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: item.color }} />
              <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: item.color }} />
            </span>
          ) : item.variant === 'swatch' ? (
            <div style={{ width: 12, height: 9, borderRadius: 2, backgroundColor: item.color, flexShrink: 0 }} />
          ) : item.variant === 'square' ? (
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: item.color, flexShrink: 0 }} />
          ) : item.variant === 'ring' ? (
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'white', border: `1.5px solid ${item.color}`, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
          );

          const row = (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: item.info ? 'help' : 'default' }}>
              {marker}
              <span
                style={{
                  fontSize: 11,
                  color: UUI.neutral500,
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  borderBottom: item.info ? `1px dotted ${UUI.neutral500}` : undefined,
                }}
              >
                {item.label}
              </span>
            </div>
          );

          return item.info ? (
            <Tooltip key={`${item.label}-${idx}`}>
              <TooltipTrigger asChild>{row}</TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[240px] text-xs leading-snug font-normal"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                {item.info}
              </TooltipContent>
            </Tooltip>
          ) : (
            <React.Fragment key={`${item.label}-${idx}`}>{row}</React.Fragment>
          );
        })}
      </div>
    </TooltipProvider>
  ) : null;

  return (
    /* Single flat white card - 14px radius, 1px #E9EAEB border (prototype §1) */
    <div
      onMouseEnter={hoverTracking.onMouseEnter}
      onMouseLeave={hoverTracking.onMouseLeave}
      style={{
        background: UUI.white,
        borderRadius: 14,
        border: `1px solid ${UUI.neutral200}`,
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header - title + legend/action/expand, on the white card */}
      <div
        style={{ padding: collapsed ? '18px 20px' : '20px 20px 0 20px' }}
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
                fontSize: 13,
                fontWeight: 600,
                color: UUI.neutral700,
                lineHeight: '20px',
                margin: 0,
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              }}
            >
              {title}
            </h3>
            {titleInfo}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Legend - inline in header (unless moved below) */}
            {!collapsed && !legendBelow && legendNode}
            {action && !collapsed && action}
            {expandable && !collapsed && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                title="Expand"
                aria-label="Expand chart"
                /* pointer-events-auto: stays clickable for client-portal viewers
                   even though the surrounding plan tab is locked read-only. */
                className="flex items-center justify-center w-7 h-7 -my-0.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors pointer-events-auto"
              >
                <Maximize2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Legend - own row beneath the title (narrow cards) */}
        {!collapsed && legendBelow && legendNode && (
          <div style={{ marginTop: 8 }}>{legendNode}</div>
        )}
      </div>

      {/* Content - chart/table body. `flush` = edge-to-edge (tables).
          Flex column so a chart child with flex:1 fills the card height when
          the card is stretched by a taller grid sibling. */}
      {!collapsed && (
        <div
          style={{
            padding: flush ? '10px 0 0 0' : '8px 20px 18px 20px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {children}
        </div>
      )}

      {/* Expanded modal - large centered view of the same chart */}
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
