import React from 'react'
import { ChevronDown } from 'lucide-react'
import type { RetirementPropertyProjection } from './useRetirementProjection'
import type { CgtMethod, SaleBreakdown } from './saleBreakdown'
import { InfoPopover } from './InfoPopover'
import {
  COMPLIANCE_FOOTER,
  DETAIL_EXPLAINERS,
} from './retirementExplainers'

/**
 * Retirement sell-down - Tax and sale details (presentational).
 *
 * One column per sold property, rows walking sale price → selling costs → loan
 * payout → estimated CGT → net cash released. Each property carries a CGT
 * treatment badge (auto from its hold period / ownership; click to change).
 * The scenario-wide default method + marginal tax rate live once in the header.
 *
 * Compliance (spec §2): treatments are modelled neutrally - no method is
 * labelled better - and the not-tax-advice footer is always present.
 */

const BRAND = '#7F56D9'
const GREEN = '#067647'
const AMBER = '#B54708'
const INTER = 'Inter, system-ui, sans-serif'

/** Full money with thousands separators (en-AU). */
const fmtFull = (value: number): string => `$${Math.round(value).toLocaleString('en-AU')}`

/** Compact money - for the header total. */
const fmtCompact = (value: number): string => {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${Math.round((abs / 1_000_000) * 100) / 100}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
  return `${sign}$${Math.round(abs)}`
}

// Current AU resident marginal rates (2024-25). Plain figures are ex-Medicare
// (30/37/45); the +2% variants (32/39/47) fold in the 2% Medicare levy.
const TAX_RATE_OPTIONS = [30, 32, 37, 39, 45, 47]

export interface SaleBreakdownEntry {
  prop: RetirementPropertyProjection
  data: SaleBreakdown
}

interface SaleBreakdownSectionProps {
  breakdowns: SaleBreakdownEntry[]
  /** Stable "Prop N" numbers shared with the property cards. */
  numberById: Map<string, number>
  /** The year each property is sold in - shown under its column header. */
  saleYearById?: Map<string, number>
  /** Cycle one property's CGT method (discount ↔ indexation). SMSF ignores this. */
  onCycleMethod: (instanceId: string, current: CgtMethod) => void
  taxRatePct: number
  onTaxRate: (pct: number) => void
  /** Sum of selling costs + CGT across all sold properties (header total). */
  totalTaxAndCosts: number
  open: boolean
  onToggle: () => void
}

/** CGT treatment badge - colour + label from the applied method / SMSF. */
const treatmentBadge = (d: SaleBreakdown): { label: string; color: string; bg: string } => {
  if (d.ledger === 'smsf') return { label: 'Super rate', color: BRAND, bg: 'rgba(127, 86, 217, 0.10)' }
  if (d.appliedMethod === 'discount') return { label: '50% discount', color: GREEN, bg: 'rgba(6, 118, 71, 0.10)' }
  return { label: 'Indexation', color: AMBER, bg: 'rgba(181, 71, 8, 0.10)' }
}

export const SaleBreakdownSection: React.FC<SaleBreakdownSectionProps> = ({
  breakdowns,
  numberById,
  saleYearById,
  onCycleMethod,
  taxRatePct,
  onTaxRate,
  totalTaxAndCosts,
  open,
  onToggle,
}) => {
  if (breakdowns.length === 0) return null

  const totals = breakdowns.reduce(
    (t, b) => {
      t.salePrice += b.data.salePrice
      t.sellingCosts += b.data.sellingCosts
      t.loanPayout += b.data.loanPayout
      t.activeCgt += b.data.activeCgt
      t.netCashReleased += b.data.netCashReleased
      return t
    },
    { salePrice: 0, sellingCosts: 0, loanPayout: 0, activeCgt: 0, netCashReleased: 0 },
  )

  return (
    <div className="rounded-2xl border border-[#E9EAEB] bg-white" style={{ fontFamily: INTER }}>
      {/* ── Header: title + total + collapse toggle ─────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left"
      >
        <span className="text-[17px] font-semibold tracking-[-0.01em] text-[#181D27]">Tax and sale details</span>
        <span className="text-[13px] text-[#717680]">
          <span className="font-semibold text-[#181D27]">{fmtCompact(totalTaxAndCosts)}</span> total tax and costs
        </span>
      </button>

      {open && (
        <>
          {/* Marginal tax rate control */}
          <div className="flex items-center gap-2 px-6 pb-2">
            <span className="flex items-center text-[13px] text-[#535862]">
              Marginal tax rate
              <InfoPopover title={DETAIL_EXPLAINERS.marginalRate.title} body={DETAIL_EXPLAINERS.marginalRate.body} />
            </span>
            <select
              value={taxRatePct}
              onChange={e => onTaxRate(Number(e.target.value))}
              className="rounded-lg border border-[#D5D7DA] bg-white px-2.5 py-1 text-[13px] text-[#181D27] outline-none focus:border-[#98A2B3]"
            >
              {TAX_RATE_OPTIONS.map(pct => (
                <option key={pct} value={pct}>{pct}%</option>
              ))}
            </select>
          </div>

          {/* ── Per-property table (one row per property) ────────────────── */}
          <div className="overflow-x-auto px-6 pb-2 pt-3">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E9EAEB]">
                  <th className="py-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#A4A7AE]">Property</th>
                  <th className="w-[136px] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#A4A7AE]">CGT treatment</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[#A4A7AE]">Sale price</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[#A4A7AE]">Selling costs</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[#A4A7AE]">Loan payout</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[#A4A7AE]">Est. CGT</th>
                  <th className="py-2 pl-4 text-right text-[11px] font-semibold uppercase tracking-wide text-[#A4A7AE]">Net cash</th>
                </tr>
              </thead>
              <tbody>
                {breakdowns.map(b => {
                  const badge = treatmentBadge(b.data)
                  const isSmsf = b.data.ledger === 'smsf'
                  const saleYear = saleYearById?.get(b.prop.instanceId)
                  return (
                    <tr key={b.prop.instanceId} className="border-b border-[#F2F2F4]">
                      <td className="py-3.5 pr-4 text-left whitespace-nowrap">
                        <span className="text-[14px] font-semibold text-[#181D27]">Prop {numberById.get(b.prop.instanceId)}</span>
                        {saleYear != null && <span className="ml-2 text-[13px] text-[#A4A7AE]">{saleYear}</span>}
                      </td>
                      <td className="px-4 py-3.5 text-left">
                        <button
                          type="button"
                          disabled={isSmsf}
                          onClick={() => onCycleMethod(b.prop.instanceId, b.data.appliedMethod)}
                          title={isSmsf ? 'SMSF keeps its own treatment' : 'Click to change the CGT method'}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-opacity ${
                            isSmsf ? 'cursor-default' : 'cursor-pointer hover:opacity-80'
                          }`}
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                          {!isSmsf && <ChevronDown size={12} style={{ color: badge.color }} />}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right text-[14px] font-semibold tabular-nums text-[#181D27]">{fmtFull(b.data.salePrice)}</td>
                      <td className="px-4 py-3.5 text-right text-[14px] tabular-nums text-[#717680]">{`\u2212${fmtFull(b.data.sellingCosts)}`}</td>
                      <td className="px-4 py-3.5 text-right text-[14px] tabular-nums text-[#717680]">{`\u2212${fmtFull(b.data.loanPayout)}`}</td>
                      <td className="px-4 py-3.5 text-right text-[14px] tabular-nums text-[#717680]">{`\u2212${fmtFull(b.data.activeCgt)}`}</td>
                      <td className="py-3.5 pl-4 text-right text-[14px] font-bold tabular-nums" style={{ color: GREEN }}>{fmtFull(b.data.netCashReleased)}</td>
                    </tr>
                  )
                })}

                {/* Total row */}
                <tr className="border-t-2 border-[#181D27]">
                  <td className="py-3.5 pr-4 text-left text-[14px] font-bold text-[#181D27]">Total</td>
                  <td className="px-4 py-3.5" />
                  <td className="px-4 py-3.5 text-right text-[14px] font-bold tabular-nums text-[#181D27]">{fmtFull(totals.salePrice)}</td>
                  <td className="px-4 py-3.5 text-right text-[14px] font-bold tabular-nums text-[#181D27]">{`\u2212${fmtFull(totals.sellingCosts)}`}</td>
                  <td className="px-4 py-3.5 text-right text-[14px] font-bold tabular-nums text-[#181D27]">{`\u2212${fmtFull(totals.loanPayout)}`}</td>
                  <td className="px-4 py-3.5 text-right text-[14px] font-bold tabular-nums text-[#181D27]">{`\u2212${fmtFull(totals.activeCgt)}`}</td>
                  <td className="py-3.5 pl-4 text-right text-[14px] font-bold tabular-nums" style={{ color: GREEN }}>{fmtFull(totals.netCashReleased)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Notes + compliance footer ───────────────────────────────── */}
          <div className="space-y-1.5 px-6 pb-5 pt-3">
            <p className="text-[12px] text-[#717680]">
              Treatments applied automatically from hold period and ownership. Click a badge to change it.
            </p>
            <p className="text-[11px] leading-relaxed text-[#A4A7AE]">
              <span className="font-semibold text-[#717680]">Estimate only, not tax advice.</span>{' '}
              {COMPLIANCE_FOOTER.replace('Estimate only, not tax advice. ', '')}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
