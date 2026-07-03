import React from 'react'
import { ArrowRight, Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Light info popover for the Retirement panel's two-altitude explainers.
 *
 * Matches the platform's existing BreakdownInfo style (lucide Info trigger,
 * light card) rather than the prototype's dark tooltip. Radix Popover handles
 * tap open/close, so it works on touch (spec §8). The trigger stops click
 * propagation so it never toggles the property card it may sit inside.
 */

export interface InfoRow {
  label: string
  value: string
  /** Renders the row in muted ink (used for sub-rows). */
  muted?: boolean
}

interface InfoPopoverProps {
  title: string
  /** Prose paragraphs. */
  body?: string[]
  /** Optional label/value rows (e.g. the CGT calc breakdown). */
  rows?: InfoRow[]
  /** Warning-colour line, e.g. "Proposed, not yet law." */
  caveat?: string
  /** Popover alignment relative to the trigger. */
  align?: 'start' | 'center' | 'end'
  /** Override the trigger icon size (px). */
  iconSize?: number
  /**
   * Violet-tinted trigger chip. Reserved for the table-level "calculated
   * view" icons, where the (i) must be findable before the user hovers.
   */
  accent?: boolean
  /** Jump link rendered at the bottom, e.g. "Go to Purchases". */
  action?: { label: string; onClick: () => void }
  className?: string
}

export const InfoPopover: React.FC<InfoPopoverProps> = ({
  title,
  body,
  rows,
  caveat,
  align = 'start',
  iconSize = 14,
  accent,
  action,
  className,
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label={title}
        className={`ml-1 inline-flex items-center justify-center rounded-full p-0.5 transition-colors ${
          accent ? 'bg-[#F5F3FF] hover:bg-[#EDE9FE]' : 'hover:bg-gray-100'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <Info
          style={{ width: iconSize, height: iconSize }}
          className={accent ? 'text-[#7C3AED]' : 'text-gray-400 hover:text-gray-600'}
        />
      </button>
    </PopoverTrigger>
    <PopoverContent
      align={align}
      className={`w-64 p-3 ${className ?? ''}`}
      onClick={e => e.stopPropagation()}
    >
      <div className="mb-2 border-b pb-2 text-sm font-semibold text-gray-800">{title}</div>

      {body && body.length > 0 && (
        <div className="space-y-2">
          {body.map((p, i) => (
            <p key={i} className="text-[12.5px] leading-relaxed text-gray-600">
              {p}
            </p>
          ))}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className={r.muted ? 'text-gray-400' : 'text-gray-600'}>{r.label}</span>
              <span className={`font-medium tabular-nums ${r.muted ? 'text-gray-500' : 'text-gray-800'}`}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {caveat && (
        <p className="mt-2.5 text-[11.5px] font-medium text-[#B42318]">{caveat}</p>
      )}

      {action && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); action.onClick() }}
          className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          {action.label}
          <ArrowRight style={{ width: 12, height: 12 }} />
        </button>
      )}
    </PopoverContent>
  </Popover>
)
