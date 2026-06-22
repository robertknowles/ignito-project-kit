import React from 'react'
import { Building2, Sparkles, Clock } from 'lucide-react'
import type { RetirementPropertyProjection } from './useRetirementProjection'
import type { CgtMethod, SaleBreakdown } from './saleBreakdown'
import { InfoPopover } from './InfoPopover'
import {
  CGT_METHOD_EXPLAINER,
  COMPLIANCE_FOOTER,
  DETAIL_EXPLAINERS,
} from './retirementExplainers'

/**
 * Retirement sell-down — Sale breakdown panel (presentational).
 *
 * Reveals how each sold property's sale price becomes net cash: a waterfall
 * (sale price → selling costs → loan payout → cash before tax → CGT → net cash)
 * with the scenario assumptions (CGT method + tax rate) living once in the
 * header and applying to every sold property.
 *
 * Compliance (spec §2): both CGT methods are shown side by side, neutrally —
 * no method is labelled better. The not-tax-advice footer is always present.
 */

const BRAND = '#7F56D9'
const INDIGO = '#4F46E5'
const INTER = 'Inter, system-ui, sans-serif'

/** Full money with thousands separators (en-AU). */
const fmtFull = (value: number): string =>
  `$${Math.round(value).toLocaleString('en-AU')}`

// Current AU resident marginal rates (2024-25). Plain figures are ex-Medicare
// (30/37/45); the +2% variants (32/39/47) fold in the 2% Medicare levy.
const TAX_RATE_OPTIONS = [30, 32, 37, 39, 45, 47]

export interface SaleBreakdownEntry {
  prop: RetirementPropertyProjection
  data: SaleBreakdown
}

interface SaleBreakdownSectionProps {
  breakdowns: SaleBreakdownEntry[]
  /** Override the CGT method for one property (defaults follow its buy year). */
  onMethod: (instanceId: string, m: CgtMethod) => void
  taxRatePct: number
  onTaxRate: (pct: number) => void
  activeTab: string | null
  onTab: (instanceId: string) => void
}

export const SaleBreakdownSection: React.FC<SaleBreakdownSectionProps> = ({
  breakdowns,
  onMethod,
  taxRatePct,
  onTaxRate,
  activeTab,
  onTab,
}) => {
  if (breakdowns.length === 0) return null

  // Map instanceId → index for stable "Prop N" labels matching the card grid.
  const indexById = new Map(breakdowns.map((b, i) => [b.prop.instanceId, i]))
  const selected =
    breakdowns.find(b => b.prop.instanceId === activeTab) ?? breakdowns[0]
  const d = selected.data
  const isSmsf = d.ledger === 'smsf'

  // The selected property's applied method (grandfathering / SMSF aware) drives
  // which treatment is described. 'auto' grandfathers each property by its
  // acquisition date; the BA can override to model a not-yet-law scenario.
  const appliedMethod = d.appliedMethod
  const treatment = describeTreatment(selected.prop.purchaseYear, d)

  return (
    <div className="rounded-xl border border-[#E9EAEB] bg-[#FCFCFD]">
      {/* ── Header: title + assumptions ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <span className="text-[15px] font-semibold text-[#181D27]">Sale breakdown</span>

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center text-[13px] text-[#535862]">
            CGT method
            <InfoPopover
              title={CGT_METHOD_EXPLAINER.title}
              body={CGT_METHOD_EXPLAINER.body}
              caveat={CGT_METHOD_EXPLAINER.caveat}
              align="end"
            />
          </span>

          {/* The selected property's method is set automatically by its buy year
              (grandfathering); the BA can still flip it to model a not-yet-law
              scenario. SMSF can't elect, so its toggle is read-only. */}
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-[#E9EAEB] bg-[#F5F5F5] p-0.5">
            {([
              ['discount', '50% discount'],
              ['indexation', 'Indexation'],
            ] as [CgtMethod, string][]).map(([m, label]) => (
              <button
                key={m}
                type="button"
                disabled={isSmsf}
                onClick={() => onMethod(selected.prop.instanceId, m)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                  appliedMethod === m && !isSmsf
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                } ${isSmsf ? 'cursor-not-allowed opacity-50 hover:text-neutral-500' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="flex items-center text-[13px] text-[#535862]">
            Tax rate
            <InfoPopover
              title={DETAIL_EXPLAINERS.marginalRate.title}
              body={DETAIL_EXPLAINERS.marginalRate.body}
              align="end"
            />
          </span>
          <select
            value={taxRatePct}
            onChange={e => onTaxRate(Number(e.target.value))}
            className="rounded-lg border border-[#D5D7DA] bg-white px-2 py-1 text-[12.5px] text-[#181D27] outline-none focus:border-[#98A2B3]"
          >
            {TAX_RATE_OPTIONS.map(pct => (
              <option key={pct} value={pct}>
                {pct}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Per-property tabs ───────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 px-5">
        {breakdowns.map(b => {
          const isActive = b.prop.instanceId === selected.prop.instanceId
          return (
            <button
              key={b.prop.instanceId}
              type="button"
              onClick={() => onTab(b.prop.instanceId)}
              className={`rounded-t-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                isActive ? 'bg-white' : 'text-[#717680] hover:text-[#535862]'
              }`}
              style={isActive ? { color: INDIGO, boxShadow: `inset 0 -2px 0 ${INDIGO}` } : undefined}
            >
              Prop {(indexById.get(b.prop.instanceId) ?? 0) + 1}
            </button>
          )
        })}
      </div>

      {/* ── Per-property CGT treatment (grandfathering) ─────────────────── */}
      <div className="mx-5 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-t-xl border-x border-t border-[#E9EAEB] bg-white px-5 pt-3 text-[12px]">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F5F5F5] px-2 py-0.5 font-medium text-[#414651]">
          {treatment.icon}
          {treatment.tag}
        </span>
        <span className="text-[#717680]">{treatment.detail}</span>
      </div>

      {/* ── Waterfall ───────────────────────────────────────────────────── */}
      <div className="mx-5 mb-4 rounded-b-xl border-x border-b border-[#E9EAEB] bg-white px-5 py-1">
        <Row label="Sale price" value={fmtFull(d.salePrice)} />
        <Row
          label="Selling costs"
          sub="Agent, marketing, legal"
          value={`\u2212${fmtFull(d.sellingCosts)}`}
          info={
            <InfoPopover
              title={DETAIL_EXPLAINERS.sellingCosts.title}
              body={DETAIL_EXPLAINERS.sellingCosts.body}
            />
          }
        />
        <Row
          label="Loan payout"
          sub="Debt cleared on this property"
          value={`\u2212${fmtFull(d.loanPayout)}`}
        />
        <Row label="Cash before tax" value={fmtFull(d.cashBeforeTax)} subtotal />

        <Row
          label="Estimated CGT"
          value={`\u2212${fmtFull(d.activeCgt)}`}
          info={
            <InfoPopover
              title="How this is worked out"
              rows={[
                { label: 'Cost base', value: fmtFull(d.costBase) },
                { label: 'Holding period', value: `${Math.round(d.holdingYears)} yrs` },
                { label: 'Gross gain', value: fmtFull(d.grossGain) },
                { label: 'Method', value: isSmsf ? 'SMSF (one-third)' : appliedMethod === 'discount' ? '50% discount' : 'Indexation', muted: true },
                { label: 'Taxable gain', value: fmtFull(d.activeTaxableGain), muted: true },
                { label: 'Rate', value: isSmsf ? '15%' : `${taxRatePct}%`, muted: true },
              ]}
            />
          }
        />

        {/* Net cash released — highlighted. */}
        <div
          className="-mx-5 mt-1 flex items-center justify-between gap-3 rounded-b-xl px-5 py-3.5"
          style={{ backgroundColor: 'rgba(127, 86, 217, 0.06)' }}
        >
          <span className="flex flex-col">
            <span className="text-[13px] font-semibold" style={{ color: BRAND }}>Net cash released</span>
            <span className="text-[11px] text-[#717680]">Lands in the client&rsquo;s account</span>
          </span>
          <span className="text-xl font-bold tabular-nums" style={{ color: BRAND, fontFamily: INTER }}>
            {fmtFull(d.netCashReleased)}
          </span>
        </div>
      </div>

      {/* ── Compliance footer (always present) ──────────────────────────── */}
      <div className="px-5 pb-4 text-[11px] leading-relaxed text-[#A4A7AE]">
        <span className="font-semibold text-[#717680]">Estimate only, not tax advice.</span>{' '}
        {COMPLIANCE_FOOTER.replace('Estimate only, not tax advice. ', '')}
      </div>
    </div>
  )
}

// ── Grandfathering treatment copy ───────────────────────────────────────────

/**
 * Factual, neutral description of why a property uses its CGT method. Describes
 * the policy mechanics only — never advises (compliance §2). Under 'auto' the
 * 2027 reform grandfathers assets acquired before 1 Jul 2027 onto the 50%
 * discount and later acquisitions onto indexation; a manual override forces a
 * method so the BA can model a scenario that may not become law.
 */
function describeTreatment(
  purchaseYear: number,
  d: SaleBreakdown,
): { tag: string; detail: string; icon: React.ReactNode } {
  const iconCls = 'h-3 w-3 text-[#A4A7AE]'
  if (d.ledger === 'smsf') {
    return {
      tag: 'SMSF',
      detail: 'Super is out of scope of the 2027 change — one-third discount at 15% kept.',
      icon: <Building2 className={iconCls} />,
    }
  }
  if (!d.isAutoMethod) {
    return {
      tag: `Bought ${Math.round(purchaseYear)}`,
      detail:
        d.appliedMethod === 'discount'
          ? 'Modelled on the 50% discount — overrides this property\u2019s default.'
          : 'Modelled on indexation (proposed) — overrides this property\u2019s default.',
      icon: <Sparkles className={iconCls} />,
    }
  }
  if (d.isGrandfathered) {
    return {
      tag: `Bought ${Math.round(purchaseYear)}`,
      detail: 'Acquired before 1 Jul 2027 — defaults to the 50% discount (grandfathered).',
      icon: <Clock className={iconCls} />,
    }
  }
  return {
    tag: `Bought ${Math.round(purchaseYear)}`,
    detail: 'Acquired on/after 1 Jul 2027 — defaults to indexation under the proposed rules.',
    icon: <Clock className={iconCls} />,
  }
}

// ── Row primitives ──────────────────────────────────────────────────────────

const Row: React.FC<{
  label: string
  value: string
  sub?: string
  subtotal?: boolean
  info?: React.ReactNode
}> = ({ label, value, sub, subtotal, info }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-[#F2F2F4] py-2.5 last:border-b-0">
    <span className="flex items-center">
      <span className="flex flex-col">
        <span
          className={
            subtotal
              ? 'text-[11px] font-medium uppercase tracking-wide text-[#717680]'
              : 'text-[13px] text-[#181D27]'
          }
        >
          {label}
        </span>
        {sub && <span className="mt-0.5 text-[11px] text-[#A4A7AE]">{sub}</span>}
      </span>
      {info}
    </span>
    <span
      className={`tabular-nums ${subtotal ? 'text-[13px] font-semibold text-[#717680]' : 'text-[13.5px] font-semibold text-[#181D27]'}`}
    >
      {value}
    </span>
  </div>
)
