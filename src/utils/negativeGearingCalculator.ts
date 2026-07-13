/**
 * Negative Gearing & After-Tax Cashflow - SINGLE SOURCE OF TRUTH
 *
 * Models the holding-period tax position of an investment property so the
 * tool can show the new-build vs established difference the 2027 reform creates.
 *
 * Why this exists
 * ----------------
 * The rest of the engine models PRE-TAX cashflow. This module is the one place
 * that computes the negative-gearing tax benefit, so we can:
 *   1. show an AFTER-TAX cashflow figure (pre-tax + tax benefit), and
 *   2. lift a NEW BUILD's displayed borrowing capacity above the established
 *      baseline (lenders add the retained NG benefit back to serviceable income).
 *
 * The reform logic (the load-bearing bit)
 * ---------------------------------------
 * Under the proposed 2026-27 Budget changes (effective 1 Jul 2027 if passed):
 *   - NEW BUILDS keep negative gearing against wages - full benefit.
 *   - ESTABLISHED properties bought AFTER 12 May 2026 can only offset rental
 *     losses against other property income, not wages → "ring-fenced". For a
 *     growth-phase portfolio (net negative), that means ~no wage benefit.
 *   - Established bought BEFORE 12 May 2026 are GRANDFATHERED - they keep full
 *     negative gearing. We treat already-owned ("existing") properties as
 *     grandfathered regardless of type.
 *
 * Everything here is illustrative and covered by the app's tax disclaimer -
 * depreciation and marginal rate are modelled with sensible defaults, not a
 * formal quantity-surveyor schedule or personal tax return.
 */

type EntityType = 'individual' | 'trust' | 'company' | 'smsf';

/**
 * Legislated contract cutoff for the established negative-gearing quarantine:
 * the reform bites property whose contract of sale is exchanged AFTER 7:30pm
 * AEST on 12 May 2026. A property contracted on/before this date is
 * grandfathered and keeps full negative gearing against wages.
 */
export const NG_REFORM_CONTRACT_CUTOFF = '2026-05-12';

/**
 * The quarantine only takes effect from 1 July 2027 (FY2027-28) — even a
 * post-cutoff established purchase keeps the wage offset through 30 Jun 2027.
 * We reuse the CGT reform's fractional-year convention (1 Jul 2027 = 2027.5).
 * The projection loop iterates integer calendar years, so the ring-fence bites
 * when `projectionYear >= 2027.5` (i.e. from calendar 2028), which keeps the
 * wage offset through FY2026-27 and into H1 of FY2027-28 — the closest faithful
 * mapping in an annual model.
 */
export const NG_RINGFENCE_START_YEAR = 2027.5;

/**
 * Illustrative annual depreciation as a fraction of property cost.
 * New builds: full Div 43 capital works (2.5%) + Div 40 plant & equipment in the
 * early years → ~2.0% blended. Established (2nd-hand, post-2017 with no plant &
 * equipment): capital works on the original structure only → ~0.5%.
 *
 * These are DEFAULTS only — the resolved rate is a per-property override, then a
 * global profile default, then these constants (see `resolveDepreciationRate`).
 */
export const NEW_BUILD_DEPRECIATION_RATE = 0.02;
export const ESTABLISHED_DEPRECIATION_RATE = 0.005;

/**
 * Whether a property's contract of sale post-dates the 12 May 2026 cutoff, i.e.
 * whether it is potentially in scope of the established ring-fence.
 *
 * - With an explicit `contractDate`, compares against the cutoff (strictly after).
 * - Without a date, falls back to the `boughtYear` proxy: existing holdings are
 *   almost always exchanged pre-cutoff, so we grandfather by default. Only a
 *   `boughtYear >= 2027` (unambiguously after the mid-2026 cutoff) is treated as
 *   post-cutoff; `2026` is ambiguous and grandfathered to avoid the year bug.
 */
export function isContractPostNgCutoff(
  contractDate?: string | null,
  boughtYear?: number,
): boolean {
  if (contractDate) {
    const contracted = new Date(contractDate).getTime();
    const cutoff = new Date(NG_REFORM_CONTRACT_CUTOFF).getTime();
    if (!Number.isNaN(contracted)) return contracted > cutoff;
  }
  if (boughtYear && boughtYear >= 2027) return true;
  return false;
}

/**
 * Resolve the depreciation rate for a property: per-property override wins, then
 * the scenario/global profile default, then the module constants as a floor.
 */
export function resolveDepreciationRate(
  p: { isNewBuild?: boolean; depreciationRateOverride?: number | null },
  profile?: {
    depreciationRateNewBuild?: number;
    depreciationRateEstablished?: number;
  },
): number {
  if (p.depreciationRateOverride != null) return p.depreciationRateOverride;
  return p.isNewBuild
    ? (profile?.depreciationRateNewBuild ?? NEW_BUILD_DEPRECIATION_RATE)
    : (profile?.depreciationRateEstablished ?? ESTABLISHED_DEPRECIATION_RATE);
}

export interface NgBenefitInput {
  /** Depreciation base - property purchase/construction cost. */
  propertyCost: number;
  /** Net rental income for the year (after vacancy). */
  annualRentNet: number;
  /** Deductible holding costs for the year - loan interest, management,
   *  insurance, rates, strata, maintenance, land tax. NOT principal. */
  deductibleExpenses: number;
  isNewBuild: boolean;
  /** Ownership entity - SMSFs are exempt from the reform (never ring-fenced). */
  entity?: EntityType;
  /** Calendar year currently being projected (drives the FY2027-28 phase-in). */
  projectionYear: number;
  /** Whether the contract of sale post-dates the 12 May 2026 cutoff, i.e. the
   *  property is potentially in scope of the ring-fence. Derive with
   *  `isContractPostNgCutoff`; planned purchases are always true. */
  contractedAfterCutoff: boolean;
  /** Resolved annual depreciation rate (decimal). Use `resolveDepreciationRate`. */
  depreciationRate: number;
  /** Investor marginal tax rate (decimal, e.g. 0.45). */
  marginalRate: number;
}

export interface NgBenefitResult {
  depreciation: number;
  /** Rent − deductible expenses − depreciation. Negative = a tax loss. */
  taxableIncome: number;
  /** The deductible tax loss (0 when the property is tax-positive). */
  deductibleLoss: number;
  /** Annual cash value of the tax saving actually applied (after ring-fence). */
  ngBenefit: number;
  /** True when established + post-reform → loss stranded against wages. */
  ringFenced: boolean;
}

/**
 * Compute the annual negative-gearing benefit for one property.
 */
export function calculateNegativeGearingBenefit(input: NgBenefitInput): NgBenefitResult {
  const {
    propertyCost,
    annualRentNet,
    deductibleExpenses,
    isNewBuild,
    entity,
    projectionYear,
    contractedAfterCutoff,
    depreciationRate,
    marginalRate,
  } = input;

  const depreciation = Math.max(0, propertyCost) * depreciationRate;

  const taxableIncome = annualRentNet - deductibleExpenses - depreciation;
  const deductibleLoss = Math.max(0, -taxableIncome);

  // Reform ring-fence: an established property whose contract post-dates the
  // 12 May 2026 cutoff can no longer offset its loss against wages — but only
  // from FY2027-28 (projectionYear >= 2027.5). SMSFs are exempt, new builds keep
  // the benefit, and grandfathered (pre-cutoff) properties keep it too. We model
  // the conservative common case (growth-phase portfolio, no surplus property
  // income to absorb the loss) → $0.
  const inScope = !isNewBuild && entity !== 'smsf' && contractedAfterCutoff;
  const ringFenced = inScope && projectionYear >= NG_RINGFENCE_START_YEAR;
  const ngBenefit = ringFenced ? 0 : deductibleLoss * (marginalRate ?? 0);

  return { depreciation, taxableIncome, deductibleLoss, ngBenefit, ringFenced };
}

/**
 * Borrowing-capacity uplift a NEW BUILD provides over the established baseline.
 *
 * The broker's stated capacity reflects what the client asked about - an
 * established purchase (99% of the market), which post-reform no longer carries
 * the NG wage add-back. A new build restores it: the lender adds the retained
 * benefit back to serviceable income, capitalised by the serviceability
 * multiplier. This is DISPLAY-ONLY - purchase gating stays pre-tax.
 */
export function calculateNewBuildBcUplift(ngBenefit: number, salaryMultiplier: number): number {
  if (ngBenefit <= 0) return 0;
  return Math.round(ngBenefit * (salaryMultiplier ?? 0));
}
