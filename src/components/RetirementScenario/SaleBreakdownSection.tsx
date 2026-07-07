import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { RetirementPropertyProjection } from './useRetirementProjection'
import type { CgtMethod, SaleBreakdown } from './saleBreakdown'
import { InfoPopover } from './InfoPopover'
import {
  CGT_METHOD_EXPLAINER,
  COMPLIANCE_FOOTER,
  DETAIL_EXPLAINERS,
} from './retirementExplainers'

/**
 * Retirement sell-down — Tax and sale details (presentational).
 *
 * One column per sold property, rows walking sale price → selling costs → loan
 * payout → estimated CGT → net cash released. Each property carries a CGT
 * treatment badge (auto from its hold period / ownership; click to change).
 * The scenario-wide default method + marginal tax rate live once in the header.
 *
 * Compliance (spec §2): treatments are modelled neutrally — no method is
 * labelled better — and the not-tax-advice footer is always present.
 */

const BRAND = '#7F56D9'
const GREEN = '#067647'
const AMBER = '#B54708'
const INTER = 'Inter, system-ui, sans-serif'

/** Full money with thousands separators (en-AU). */
const fmtFull = (value: number): string => `$${Math.round(value).toLocaleString('en-AU')}`

/** Compact money — for the header total. */
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
  /** The year each property is sold in — shown under its column header. */
  saleYearById?: Map<string, number>
  /** Cycle one property's CGT method (discount ↔ indexation). SMSF ignores this. */
  onCycleMethod: (instanceId: string) => void
  /** Scenario-wide default CGT method. */
  defaultMethod: CgtMethod
  onDefaultMethod: (m: CgtMethod) => void
  taxRatePct: number
  onTaxRate: (pct: number) => void
  /** Sum of selling costs + CGT across all sold properties (header total). */
  totalTaxAndCosts: number
  open: boolean
  onToggle: () => void
}

/** CGT treatment badge — colour + label from the applied method / SMSF. */
const treatmentBadge = (d: SaleBreakdown): { label: string; color: string; bg: string } => {
  if (d.ledger === 'smsf') return { label: 'Super rate', color: BRAND, bg: 'rgba(127, 86, 217, 0.10)' }
  if (d.appliedMethod === 'discount') return { label: '50% discount', color: GREEN, bg: 'rgba(6, 118, 71, 0.10)' }
  return { label: 'No discount', color: AMBER, bg: 'rgba(181, 71, 8, 0.10)' }
}

export const SaleBreakdownSection: React.FC<SaleBreakdownSectionProps> = ({
  breakdowns,
  numberById,
  saleYearById,
  onCycleMethod,
  defaultMethod,
  onDefaultMethod,
  taxRatePct,
  onTaxRate,
  totalTaxAndCosts,
  open,
  onToggle,
}) => {
  if (breakdowns.length === 0) return null

  return (
    <div className="rounded-2xl border border-[#E9EAEB] bg-white" style={{ fontFamily: INTER }}>
      {/* ── Header: title + total + collapse toggle ─────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <span className="text-[15px] font-semibold text-[#181D27]">Tax and sale details</span>
        <span className="flex items-center gap-2">
          <span className="text-[13px] text-[#717680]">
            <span className="font-semibold text-[#181D27]">{fmtCompact(totalTaxAndCosts)}</span> total tax and costs
          </span>
          {open ? <ChevronUp size={16} className="text-[#717680]" /> : <ChevronDown size={16} className="text-[#717680]" />}
        </span>
      </button>

      {open && (
        <>
          {/* ── Controls: default CGT method + marginal tax rate ─────────── */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#F2F2F4] px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center text-[13px] text-[#535862]">
                Default CGT method
                <InfoPopover
                  title={CGT_METHOD_EXPLAINER.title}
                  body={CGT_METHOD_EXPLAINER.body}
                  caveat={CGT_METHOD_EXPLAINER.caveat}
                />
              </span>
              <div className="inline-flex items-center gap-0.5 rounded-lg border border-[#E9EAEB] bg-[#F5F5F5] p-0.5">
                {([
                  ['discount', '50% discount'],
                  ['indexation', 'Indexation'],
                ] as [CgtMethod, string][]).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onDefaultMethod(m)}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                      defaultMethod === m
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center text-[13px] text-[#535862]">
                Marginal tax rate
                <InfoPopover title={DETAIL_EXPLAINERS.marginalRate.title} body={DETAIL_EXPLAINERS.marginalRate.body} />
              </span>
              <select
                value={taxRatePct}
                onChange={e => onTaxRate(Number(e.target.value))}
                className="rounded-lg border border-[#D5D7DA] bg-white px-2 py-1 text-[12.5px] text-[#181D27] outline-none focus:border-[#98A2B3]"
              >
                {TAX_RATE_OPTIONS.map(pct => (
                  <option key={pct} value={pct}>{pct}%</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Per-property table ──────────────────────────────────────── */}
          <div className="overflow-x-auto px-6 pb-2">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white py-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#A4A7AE]" />
                  {breakdowns.map(b => {
                    const saleYear = saleYearById?.get(b.prop.instanceId)
                    return (
                      <th
                        key={b.prop.instanceId}
                        className="min-w-[128px] py-2 pl-4 text-right align-bottom text-[13px] font-semibold text-[#181D27]"
                      >
                        Prop {numberById.get(b.prop.instanceId)}
                        {saleYear != null && (
                          <span className="mt-0.5 block text-[11px] font-medium text-[#717680]">Sold {saleYear}</span>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {/* CGT treatment badges */}
                <tr className="border-t border-[#F2F2F4]">
                  <td className="sticky left-0 bg-white py-3 pr-4 text-[13px] text-[#535862]">CGT treatment</td>
                  {breakdowns.map(b => {
                    const badge = treatmentBadge(b.data)
                    const isSmsf = b.data.ledger === 'smsf'
                    return (
                      <td key={b.prop.instanceId} className="py-3 pl-4 text-right align-top">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isSmsf}
                            onClick={() => onCycleMethod(b.prop.instanceId)}
                            title={isSmsf ? 'SMSF keeps its own treatment' : 'Click to change the CGT method'}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-opacity ${
                              isSmsf ? 'cursor-default' : 'cursor-pointer hover:opacity-80'
                            }`}
                            style={{ backgroundColor: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                            {!isSmsf && <ChevronDown size={12} style={{ color: badge.color }} />}
                          </button>
                        </div>
                      </td>
                    )
                  })}
                </tr>

                <ValueRow label="Sale price" breakdowns={breakdowns} pick={d => fmtFull(d.salePrice)} />
                <ValueRow label="Selling costs" breakdowns={breakdowns} pick={d => `\u2212${fmtFull(d.sellingCosts)}`} muted />
                <ValueRow label="Loan payout" breakdowns={breakdowns} pick={d => `\u2212${fmtFull(d.loanPayout)}`} muted />
                <ValueRow label="Estimated CGT" breakdowns={breakdowns} pick={d => `\u2212${fmtFull(d.activeCgt)}`} muted />

                {/* Net cash released — highlighted */}
                <tr className="border-t border-[#E9EAEB]">
                  <td className="sticky left-0 bg-white py-3 pr-4 text-[13px] font-semibold" style={{ color: BRAND }}>
                    Net cash released
                  </td>
                  {breakdowns.map(b => (
                    <td
                      key={b.prop.instanceId}
                      className="py-3 pl-4 text-right text-[15px] font-bold tabular-nums"
                      style={{ color: BRAND }}
                    >
                      {fmtFull(b.data.netCashReleased)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Notes + compliance footer ───────────────────────────────── */}
          <div className="space-y-1.5 px-6 pb-5 pt-1">
            <p className="text-[12px] text-[#717680]">
              Treatments are applied automatically from each property&rsquo;s hold period and ownership structure. Click a badge to change it.
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

// ── Value row (one label + a cell per property) ─────────────────────────────

const ValueRow: React.FC<{
  label: string
  breakdowns: SaleBreakdownEntry[]
  pick: (d: SaleBreakdown) => string
  muted?: boolean
}> = ({ label, breakdowns, pick, muted }) => (
  <tr className="border-t border-[#F2F2F4]">
    <td className="sticky left-0 bg-white py-3 pr-4 text-[13px] text-[#535862]">{label}</td>
    {breakdowns.map(b => (
      <td
        key={b.prop.instanceId}
        className={`py-3 pl-4 text-right text-[13.5px] tabular-nums ${muted ? 'text-[#717680]' : 'font-semibold text-[#181D27]'}`}
      >
        {pick(b.data)}
      </td>
    ))}
  </tr>
)
