/**
 * Negative Gearing & After-Tax Cashflow — SINGLE SOURCE OF TRUTH
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
 *   - NEW BUILDS keep negative gearing against wages — full benefit.
 *   - ESTABLISHED properties bought AFTER 12 May 2026 can only offset rental
 *     losses against other property income, not wages → "ring-fenced". For a
 *     growth-phase portfolio (net negative), that means ~no wage benefit.
 *   - Established bought BEFORE 12 May 2026 are GRANDFATHERED — they keep full
 *     negative gearing. We treat already-owned ("existing") properties as
 *     grandfathered regardless of type.
 *
 * Everything here is illustrative and covered by the app's tax disclaimer —
 * depreciation and marginal rate are modelled with sensible defaults, not a
 * formal quantity-surveyor schedule or personal tax return.
 */

/**
 * Purchases dated in this calendar year or later are caught by the established
 * ring-fence (the reform bites property bought after 12 May 2026, and today is
 * mid-2026, so any *planned* purchase is post-cutoff). Existing holdings bought
 * before this are grandfathered.
 */
export const NG_REFORM_YEAR = 2026;

/**
 * Illustrative annual depreciation as a fraction of property cost.
 * New builds: full Div 43 capital works (2.5%) + Div 40 plant & equipment in the
 * early years → ~2.0% blended. Established (2nd-hand, post-2017 with no plant &
 * equipment): capital works on the original structure only → ~0.5%.
 */
export const NEW_BUILD_DEPRECIATION_RATE = 0.02;
export const ESTABLISHED_DEPRECIATION_RATE = 0.005;

export interface NgBenefitInput {
  /** Depreciation base — property purchase/construction cost. */
  propertyCost: number;
  /** Net rental income for the year (after vacancy). */
  annualRentNet: number;
  /** Deductible holding costs for the year — loan interest, management,
   *  insurance, rates, strata, maintenance, land tax. NOT principal. */
  deductibleExpenses: number;
  isNewBuild: boolean;
  /** Calendar year the property was purchased (drives grandfathering). */
  buyYear: number;
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
    buyYear,
    marginalRate,
  } = input;

  const depRate = isNewBuild ? NEW_BUILD_DEPRECIATION_RATE : ESTABLISHED_DEPRECIATION_RATE;
  const depreciation = Math.max(0, propertyCost) * depRate;

  const taxableIncome = annualRentNet - deductibleExpenses - depreciation;
  const deductibleLoss = Math.max(0, -taxableIncome);

  // Reform ring-fence: an established property bought after 12 May 2026 can no
  // longer offset its loss against wages. We model the conservative common case
  // (growth-phase portfolio, no surplus property income to absorb it) → $0.
  const ringFenced = !isNewBuild && buyYear >= NG_REFORM_YEAR;
  const ngBenefit = ringFenced ? 0 : deductibleLoss * (marginalRate ?? 0);

  return { depreciation, taxableIncome, deductibleLoss, ngBenefit, ringFenced };
}

/**
 * Borrowing-capacity uplift a NEW BUILD provides over the established baseline.
 *
 * The broker's stated capacity reflects what the client asked about — an
 * established purchase (99% of the market), which post-reform no longer carries
 * the NG wage add-back. A new build restores it: the lender adds the retained
 * benefit back to serviceable income, capitalised by the serviceability
 * multiplier. This is DISPLAY-ONLY — purchase gating stays pre-tax.
 */
export function calculateNewBuildBcUplift(ngBenefit: number, salaryMultiplier: number): number {
  if (ngBenefit <= 0) return 0;
  return Math.round(ngBenefit * (salaryMultiplier ?? 0));
}
