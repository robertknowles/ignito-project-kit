/**
 * Scenario Accuracy Suite — 20 scenarios derived from real beta-tester saves.
 *
 * MEASUREMENT ONLY. No app/engine/prompt code is touched. Each scenario is a
 * natural-language brief (verbatim chatHistory for the 8 real fixtures; written
 * in the same BA voice for the 12 variants) plus structured expectations that
 * encode what an experienced buyers' agent said they'd expect (Ella/Anu/Julian/
 * Adam beta-call criteria).
 *
 * Grading criteria sources:
 *  - ELLA:   high-income clients ($250k/$300k) should get FEWER, HIGHER-VALUE
 *            blue-chip properties (~$750k+, negatively geared), not 4 cheap
 *            cash-flow properties; a commercial finisher must be LABELLED
 *            commercial; one purchase every ~2 years is conservative-correct.
 *  - ANU:    stated price/yield bands respected (no $200k/15%-yield outliers);
 *            "properties 2-3 in trust" → exactly the stated count; equity-first
 *            then cash-flow briefs should visibly transition.
 *  - JULIAN: goal-anchored — hit the stated goal or clearly show the shortfall;
 *            trusts should appear when capacity is tight.
 *  - ADAM:   explicit sequences ("3 × $375-390k then a ~$600k house") followed
 *            within band; existing equity used for later deposits.
 *
 * Modes:
 *  - Fixture scenarios run the SAVED plan (what the AI pipeline produced and
 *    persisted for a real tester) through the real engine and grade both the
 *    persisted plan structure and the engine outcome.
 *  - Variant scenarios simulate a FAITHFUL extraction of the brief (the plan a
 *    correct AI parse would emit) and grade the ENGINE's placement/pacing/goal
 *    behaviour, isolating engine faults from AI-extraction faults.
 *  - schemaChecks statically verify whether a brief statement is even
 *    representable in the nl-parse RESPONSE_TOOL schema (known gaps →
 *    EXPECTED-FAIL).
 */

import type { PropertyInstanceDetails } from '../src/types/propertyInstance';
import type { InvestmentProfileData } from '../src/contexts/InvestmentProfileContext';
import type { ExistingProperty } from '../src/types/existingProperty';

// ─── Expectation model ───────────────────────────────────────────────────────

export type FailureCause =
  | 'extraction'        // AI mis-captured / silently dropped a user statement
  | 'plan-selection'    // AI chose the wrong property mix for the archetype
  | 'engine-placement'  // engine failed to place / paced wrongly
  | 'engine-goal'       // plan does not reach the stated goal within tolerance
  | 'schema-gap'        // statement not representable in nl-parse schema (known)
  | 'persistence';      // chat claimed something the saved state doesn't contain

export interface PerPropertyExpectation {
  /** 0-based index into propertyOrder */
  index: number;
  price?: [number, number];
  yieldPct?: [number, number];
  entity?: 'individual' | 'trust' | 'company' | 'smsf';
  placedBy?: number; // calendar year
  /**
   * Mapped-instance field assertions (AI leg only — the engine leg builds
   * instances from the variant spec, so asserting them there is circular).
   * `expected` is an exact value, or [lo, hi] for a numeric tolerance band.
   */
  instanceFields?: Array<{
    field: keyof PropertyInstanceDetails;
    expected: number | string | boolean | null | [number, number];
  }>;
}

export interface BriefGoal {
  amount: number;
  byYear: number;
}

export interface SchemaCheck {
  /** dot path inside RESPONSE_TOOL.input_schema.properties */
  path: string;
  shouldExist: boolean;
  description: string;
}

export interface ManualFinding {
  name: string;
  pass: boolean;
  detail: string;
  cause: FailureCause;
}

export interface Expectations {
  propertyCount?: [number, number];
  existingCount?: number;
  priceBand?: [number, number];
  avgPriceMin?: number;
  yieldBand?: [number, number];
  perProperty?: PerPropertyExpectation[];
  minTrustCount?: number;
  lastPropertyCommercial?: boolean;
  containsCommercial?: boolean;
  transitionExpected?: boolean;
  timelineYears?: number;
  profileFields?: { field: keyof InvestmentProfileData; expected: unknown }[];
  cashflowGoal?: BriefGoal;
  equityGoal?: BriefGoal;
  allPlaced?: boolean;
  pacing?: { minAvgGapYears?: number };
  monthlyCashflowFloorY1?: number; // e.g. -1500 → year-1 net/12 must be >= -1500
  schemaChecks?: SchemaCheck[];
  manualFindings?: ManualFinding[];
  /** check names whose failure downgrades to EXPECTED-FAIL (known gap) */
  expectedFailChecks?: string[];
}

export interface VariantPropertySpec {
  cellId: string;
  overrides: Partial<PropertyInstanceDetails>;
  /** If set, place manually at this period (1 = BASE_YEAR H1). Otherwise the
   *  engine decides placement — that's what variants measure. */
  targetPeriod?: number;
}

export interface SuiteScenario {
  id: string;
  source: 'fixture' | 'variant';
  archetype: string;
  /** NL brief — verbatim chatHistory user turns for fixtures */
  brief: string;
  /**
   * Company-strategy free text sent as strategyProfileText (AI leg only) —
   * exercises the Company Strategy prompt section + schema extraction the
   * same way ChatPanel does when a BA picks a strategy pill.
   */
  strategyProfileText?: string;
  fixtureFile?: string;
  variant?: {
    profile: Partial<InvestmentProfileData>;
    properties: VariantPropertySpec[];
    existingProperties?: ExistingProperty[];
  };
  expectations: Expectations;
  notes?: string[];
}

// ─── Existing-property helper (full shape, sensible defaults) ────────────────

let epSeq = 0;
export function makeExisting(p: Partial<ExistingProperty>): ExistingProperty {
  return {
    id: `ep-suite-${epSeq++}`,
    address: p.address ?? 'Suite fixture',
    state: p.state ?? 'QLD',
    boughtYear: p.boughtYear ?? 2022,
    purchasePrice: p.purchasePrice ?? p.currentValue ?? 500000,
    currentValue: p.currentValue ?? 500000,
    loan: p.loan ?? 0,
    rentPerWeek: p.rentPerWeek ?? 0,
    yield: p.currentValue ? ((p.rentPerWeek ?? 0) * 52 * 100) / p.currentValue : 0,
    interestRate: p.interestRate ?? 6,
    loanType: p.loanType ?? 'IO',
    stampDuty: 0,
    legals: 1500,
    buildingPest: 700,
    baFee: 0,
    cashDeposit: p.cashDeposit ?? 0,
    propertyMgmtPercent: 8,
    councilWater: 2500,
    insurance: 1500,
    maintenance: 2000,
    growthAssumption: 'Medium',
    loanTerm: 30,
    // FRACTION (engine computes rent × (1 − rate)); was 2 = −100% of rent
    vacancyRate: 0.02,
    saleYear: null,
    allowEquityRelease: p.allowEquityRelease ?? true,
    isNewBuild: false,
    ...p,
  } as ExistingProperty;
}

// ─── The 8 real fixtures ─────────────────────────────────────────────────────

const FIXTURES: SuiteScenario[] = [
  {
    id: 'FIX-ANU-275',
    source: 'fixture',
    archetype: 'anu · high income, aggressive, 7-year passive-income goal',
    fixtureFile: 'anugrahv-freshstartadvisory-scenario-275.json',
    brief:
      'With 5 mil borrowing capacity, 300k income, 150k deposit, want to achieve 200k passive income, no existing properties. ' +
      '[follow-up] To achieve this goal in a seven-year timeframe',
    expectations: {
      timelineYears: 7, // user explicitly asked; assistant confirmed "Updated timeline to 7 years"
      propertyCount: [4, 8], // assistant claimed a 6-property plan; $200k passive needs ~5-7
      existingCount: 0, // brief: "no existing properties"
      priceBand: [500000, 900000],
      yieldBand: [3.5, 8],
      cashflowGoal: { amount: 200000, byYear: 2032 },
      allPlaced: true,
    },
    notes: [
      'Saved state has 1 planned property and portfolioValue $630k — identical to the planned property price — despite "no existing properties" in the brief.',
    ],
  },
  {
    id: 'FIX-ANU-287',
    source: 'fixture',
    archetype: 'anu · commercial transition, $1m BC, $100k passive, ~$2m commercial',
    fixtureFile: 'anugrahv-freshstartadvisory-scenario-287.json',
    brief:
      '- $1,000,000 borrowing capacity - $100,000 passive income - Want to buy a commercial property worth around $2,000,000 - Monthly savings: $3,000. ' +
      '[follow-up] add $100k savings at the start of the journey and remap accordingly',
    expectations: {
      propertyCount: [3, 3],
      lastPropertyCommercial: true,
      perProperty: [{ index: 2, price: [1600000, 2400000] }], // "around $2,000,000"
      yieldBand: [3, 10], // ANU criterion: no $200k / 15%-yield outliers
      transitionExpected: true,
      minTrustCount: 1,
      cashflowGoal: { amount: 100000, byYear: 2045 },
      allPlaced: true,
    },
    notes: [
      'Assistant message claimed "priced from $600k to $2M"; saved commercial instance is $245,000 with $2,330/wk rent (49% gross yield).',
    ],
  },
  {
    id: 'FIX-ELLA-314',
    source: 'fixture',
    archetype: 'ella · $700k BC, retire on $150k by 2045, cap P1 at -$1,500/mo, then "only one purchase"',
    fixtureFile: 'ella-scenario-314.json',
    brief:
      'i have $700,000 in borrowing capacity. I want to retire on $150k passive income by 2045. I want the first property to be negative by no more than $1,500 per month. ' +
      '[follow-up] annual income is $180k, sole income earner, $200k deposit saved, saving $5k per month. ' +
      '[follow-up] can you please reconfigure to include only one purchase',
    expectations: {
      propertyCount: [1, 1], // explicit: "include only one purchase"
      monthlyCashflowFloorY1: -1500,
      timelineYears: 20,
      cashflowGoal: { amount: 150000, byYear: 2045 },
      allPlaced: true,
    },
    notes: [
      'Assistant claimed "Removed property 2..5"; saved state still contains 3 planned instances.',
    ],
  },
  {
    id: 'FIX-ELLA-315',
    source: 'fixture',
    archetype: 'ella · $250k income / $300k deposit / 3 existing — blue-chip expectation',
    fixtureFile: 'ella-scenario-315.json',
    brief:
      'I own 3 properties, one in Townsville (2024) worth $600k renting $550/wk, 80% LVR. One in Melbourne for $920k (2025, 100% LVR) renting $300/wk, plus a $180k granny flat plan renting $400/wk. A Darwin house bought $500k (2025, 80% LVR), now $600k, rents $550/wk. [income $250k, savings $100k/yr, deposit $300k]',
    expectations: {
      propertyCount: [2, 4],
      equityGoal: { amount: 3000000, byYear: 2045 },
      manualFindings: [
        {
          name: 'blue-chip-selection',
          pass: false,
          detail:
            'Ella criterion: a $250k-income / $300k-deposit client should get fewer, higher-value blue-chip properties (~$750k+). Assistant chat: "Built a 4-property plan, priced from $400k to $500k" — four cheap properties.',
          cause: 'plan-selection',
        },
      ],
    },
    notes: [
      'Saved propertyOrder is EMPTY — the claimed 4-property plan was never persisted; engine run covers existing portfolio only.',
    ],
  },
  {
    id: 'FIX-ELLA-316',
    source: 'fixture',
    archetype: 'ella · cf-high with 6%-yield commercial interest, retire 2046 on $250k',
    fixtureFile: 'ella-scenario-316.json',
    brief:
      'I own 3 properties, QLD (600k, 80% LVR), Vic ($920k, 100% LVR) & NT ($500k, 80% LVR). Goal: retire by 2046 on $250k cash flow. Interested in a commercial property with a 6% yield, and a $180k granny flat on the Vic house. [income $250k, $300k cash; loans QLD $442,594 / VIC $945k / NT $400k] ' +
      '[follow-up] Change the client goal to reach $1m+ in equity and $250k passive income by 2046',
    expectations: {
      propertyCount: [3, 5], // assistant claimed a 4-property plan
      containsCommercial: true, // must be labelled commercial — it is
      perProperty: [{ index: 0, yieldPct: [5, 7] }], // client stated 6% commercial yield
      cashflowGoal: { amount: 250000, byYear: 2046 },
      equityGoal: { amount: 1000000, byYear: 2046 },
      allPlaced: true,
    },
    notes: [
      'Saved plan has 2 planned instances (commercial $750k @ $1,225/wk = 8.5% yield, metro-house-cashflow $420k), not the 4 claimed.',
      'Granny flat request has no representation in the saved plan (no schema field for improvements/granny flats).',
    ],
  },
  {
    id: 'FIX-ELLA-317',
    source: 'fixture',
    archetype: 'ella · "4 properties, retire on 250k" — $250k income / $300k deposit / $15k mo savings',
    fixtureFile: 'ella-scenario-317.json',
    brief:
      'i want to buy 4 properties and retire on 250k. [follow-up] annual income - $250k, $300k deposit, monthly savings = $15k, no debt, BC +2m',
    expectations: {
      propertyCount: [4, 4],
      avgPriceMin: 650000, // blue-chip-ness for a $250k earner
      yieldBand: [3, 7],
      pacing: { minAvgGapYears: 1.75 }, // Ella: one purchase every ~2 years is conservative-correct
      cashflowGoal: { amount: 250000, byYear: 2045 },
      minTrustCount: 1,
      allPlaced: true,
    },
  },
  {
    id: 'FIX-JULIAN-210',
    source: 'fixture',
    archetype: 'julian · goal-anchored: $1m BC, $100k income, $50k CF + $2m equity in 20y',
    fixtureFile: 'julian-scenario-210.json',
    brief:
      'Rob. $1m borrowing capacity. $100k income. $150k deposit. $50k/year cashflow goal. $2m equity goal. 20 years.',
    expectations: {
      propertyCount: [4, 6],
      lastPropertyCommercial: true,
      priceBand: [350000, 800000],
      equityGoal: { amount: 2000000, byYear: 2045 }, // assistant claimed "clearing the $2M target"
      cashflowGoal: { amount: 50000, byYear: 2045 },
      minTrustCount: 1, // Julian: trusts should appear when capacity is tight ($2.48m buys vs $1m BC)
      allPlaced: true,
    },
  },
  {
    id: 'FIX-JULIAN-290',
    source: 'fixture',
    archetype: 'julian · $100k passive goal, 1 existing property, $750k BC, couple on $300k',
    fixtureFile: 'julian-scenario-290.json',
    brief:
      '$100,000 passive income, already own 1 property worth 600,000 with yearly costs of 20,000 and current borrowing capacity of $750,000. [follow-up] 70% LVR, couple earning 300k household, 250k cash, saving 2500/month',
    expectations: {
      profileFields: [
        { field: 'cashflowGoal', expected: 100000 }, // brief goal; saved as 50,000
        { field: 'useExistingEquity', expected: true },
      ],
      minTrustCount: 1,
      cashflowGoal: { amount: 100000, byYear: 2045 },
      allPlaced: true,
    },
  },
];

// ─── The 12 systematic variants ──────────────────────────────────────────────
// Archetype grid coverage:
//   income:    $80k (V1,V2) · $150k (V3,V4,V5) · $250k (V6,V7,V8) · mid (V9,V10,V11,V12)
//   strategy:  cash-flow (V1,V5,V9,V10) · equity-growth (V2,V6) ·
//              eg-to-cf (V3,V8) · commercial-transition (V4,V7)
//   existing portfolio: yes (V2,V8,V10) / no (rest)
//   trust/SMSF mentions: V4 (trust, exact count) · V7 (SMSF)
//   explicit price+yield bands: V5, V9
//   explicit BA fee / purchase costs: V11, V12 (EXPECTED-FAIL — schema gap)

const P = (cellId: string, price: number, rentPerWeek: number, extra: Partial<PropertyInstanceDetails> = {}, targetPeriod?: number): VariantPropertySpec => ({
  cellId,
  overrides: { purchasePrice: price, rentPerWeek, ...extra },
  targetPeriod,
});

const VARIANTS: SuiteScenario[] = [
  {
    id: 'VAR-CF-80K',
    source: 'variant',
    archetype: 'grid · $80k income, cash-flow, no existing',
    brief:
      'Client earns $80k, single, $60k deposit saved, saving $1k/month. Wants $30k passive income in 15 years. Cash flow focus, nothing over $450k.',
    variant: {
      profile: {
        baseSalary: 80000, annualSavings: 12000, depositPool: 60000,
        borrowingCapacity: 480000, cashflowGoal: 30000, targetPassiveIncome: 30000,
        equityGoal: 500000, timelineYears: 15, strategyPreset: 'cf-low',
      },
      properties: [
        P('regional-unit-cashflow', 380000, 450),
        P('regional-house-cashflow', 430000, 500, { entity: 'trust' }),
      ],
    },
    expectations: {
      allPlaced: true,
      priceBand: [300000, 450000],
      yieldBand: [5, 7.5],
      cashflowGoal: { amount: 30000, byYear: 2040 },
    },
  },
  {
    id: 'VAR-EG-80K-EXIST',
    source: 'variant',
    archetype: 'grid · $80k income, equity-growth, existing portfolio (equity-funded deposit)',
    brief:
      'Client earns $80k, owns an investment unit worth $500k with $300k owing, rents $420/week. Only $20k cash but happy to use the equity. Wants one more growth property around $450k within the next two years.',
    variant: {
      profile: {
        baseSalary: 80000, annualSavings: 12000, depositPool: 20000,
        borrowingCapacity: 550000, portfolioValue: 500000, currentDebt: 300000,
        existingAnnualRent: 420 * 52, useExistingEquity: true,
        equityGoal: 400000, cashflowGoal: 20000, timelineYears: 15, strategyPreset: 'eg-low',
      },
      existingProperties: [
        makeExisting({ currentValue: 500000, purchasePrice: 430000, loan: 300000, rentPerWeek: 420, state: 'QLD', boughtYear: 2021 }),
      ],
      properties: [P('regional-unit-growth', 450000, 410)],
    },
    expectations: {
      allPlaced: true,
      perProperty: [{ index: 0, placedBy: 2027 }], // "within the next two years", equity makes it fundable
    },
  },
  {
    id: 'VAR-EGCF-150K',
    source: 'variant',
    archetype: 'grid · $150k income, eg-to-cf, transition must be visible',
    brief:
      'Couple earning $150k combined, $120k deposit, saving $2.5k/month, borrowing capacity $900k. Build equity first, then switch to cash flow. Want to retire on $80k in 20 years.',
    variant: {
      profile: {
        baseSalary: 150000, annualSavings: 30000, depositPool: 120000,
        borrowingCapacity: 900000, cashflowGoal: 80000, targetPassiveIncome: 80000,
        equityGoal: 1000000, timelineYears: 20, strategyPreset: 'eg-to-cf',
      },
      properties: [
        P('regional-house-growth', 620000, 475),
        P('metro-unit-growth', 580000, 445, { entity: 'trust' }),
        P('regional-house-cashflow', 500000, 625, { entity: 'trust' }),
        P('regional-unit-cashflow', 380000, 510, { entity: 'trust' }),
      ],
    },
    expectations: {
      allPlaced: true,
      transitionExpected: true, // growth purchases must be PLACED before cash-flow purchases
      cashflowGoal: { amount: 80000, byYear: 2045 },
    },
  },
  {
    id: 'VAR-CT-150K-TRUST',
    source: 'variant',
    archetype: 'grid · $150k income, commercial-transition, "properties 2 and 3 in a trust"',
    brief:
      '$150k income, $100k deposit, $3k/month savings, $1m capacity. Three properties: two residential growth then finish with a commercial. Put properties 2 and 3 in a trust.',
    variant: {
      profile: {
        baseSalary: 150000, annualSavings: 36000, depositPool: 100000,
        borrowingCapacity: 1000000, cashflowGoal: 80000, equityGoal: 1000000,
        timelineYears: 20, strategyPreset: 'commercial-transition',
      },
      properties: [
        P('regional-house-growth', 620000, 475),
        P('regional-house-growth', 620000, 475, { entity: 'trust' }),
        P('commercial-low-cost', 750000, 1000, { entity: 'trust', lvr: 65 }),
      ],
    },
    expectations: {
      propertyCount: [3, 3], // ANU criterion: exactly the stated count
      perProperty: [
        { index: 1, entity: 'trust' },
        { index: 2, entity: 'trust' },
      ],
      lastPropertyCommercial: true,
      transitionExpected: true,
      allPlaced: true, // the known commercial-transition silent-fail is exactly this check
    },
  },
  {
    id: 'VAR-CF-150K-BANDS',
    source: 'variant',
    archetype: 'grid · $150k income, cash-flow, explicit price AND yield bands',
    brief:
      'Client earning $150k, $150k deposit, $4k/month, BC $1.2m. Buy three cash flow properties between $500k and $650k, yields between 5.5% and 6.5%. No cheap regional stock under $300k.',
    variant: {
      profile: {
        baseSalary: 150000, annualSavings: 48000, depositPool: 150000,
        borrowingCapacity: 1200000, cashflowGoal: 60000, equityGoal: 1000000,
        timelineYears: 20, strategyPreset: 'cf-low',
      },
      properties: [
        P('regional-house-cashflow', 520000, 600),
        P('regional-house-cashflow', 580000, 650, { entity: 'trust' }),
        P('metro-house-cashflow', 640000, 700, { entity: 'trust' }),
      ],
    },
    expectations: {
      priceBand: [500000, 650000],
      yieldBand: [5.5, 6.5],
      allPlaced: true,
      cashflowGoal: { amount: 60000, byYear: 2045 },
    },
  },
  {
    id: 'VAR-EG-250K-BLUECHIP',
    source: 'variant',
    archetype: 'grid · $250k income, equity-growth blue-chip, conservative pacing requested',
    brief:
      'High earner — $250k income, $300k in savings, saving $8k/month, BC $2m. Wants blue-chip growth assets, negatively geared is fine. Fewer, higher-quality properties — nothing under $750k. One purchase every couple of years, no rush.',
    variant: {
      profile: {
        baseSalary: 250000, annualSavings: 96000, depositPool: 300000,
        borrowingCapacity: 2000000, equityGoal: 2000000, cashflowGoal: 100000,
        timelineYears: 20, strategyPreset: 'eg-high', pacingMode: 'conservative',
      },
      // Faithful extraction leaves placement to the engine — the brief's pacing
      // instruction has no investmentProfile field, only per-property targetPeriod.
      properties: [
        P('metro-house-growth', 900000, 545),
        P('metro-house-growth', 950000, 575, { entity: 'trust' }),
        P('metro-house-growth', 1000000, 600, { entity: 'trust' }),
      ],
    },
    expectations: {
      priceBand: [750000, 1200000],
      yieldBand: [2.5, 4.5], // negatively geared blue-chip
      pacing: { minAvgGapYears: 1.75 }, // Ella: every ~2 years is conservative-correct
      allPlaced: true,
    },
    notes: [
      'pacingMode is not read by the engine and maxPurchasesPerYear/pacing is not in the nl-parse schema — the only lever is per-property targetPeriod, which a faithful extraction of "one every couple of years" would need to set explicitly.',
    ],
  },
  {
    id: 'VAR-CT-250K-SMSF',
    source: 'variant',
    archetype: 'grid · $250k income, commercial-transition, commercial held in SMSF',
    brief:
      '$250k income, $200k deposit, $5k/month, BC $1.5m. Two growth houses in personal names, then a $1.1m commercial inside the client\'s SMSF.',
    variant: {
      profile: {
        baseSalary: 250000, annualSavings: 60000, depositPool: 200000,
        borrowingCapacity: 1500000, equityGoal: 1500000, cashflowGoal: 120000,
        timelineYears: 20, strategyPreset: 'commercial-transition',
      },
      properties: [
        P('metro-house-growth', 900000, 545),
        P('regional-house-growth', 650000, 500),
        P('commercial-high-cost', 1100000, 1300, { entity: 'smsf', lvr: 70 }),
      ],
    },
    expectations: {
      perProperty: [{ index: 2, entity: 'smsf' }],
      lastPropertyCommercial: true,
      transitionExpected: true,
      allPlaced: true,
    },
  },
  {
    id: 'VAR-EGCF-250K-EXIST',
    source: 'variant',
    archetype: 'grid · $250k income, eg-to-cf, existing portfolio with equity release',
    brief:
      'Clients earn $250k, own an IP worth $700k with a $450k loan renting $600/wk. $150k cash, $6k/month savings, BC $1.8m. Growth now, cash flow later — want $100k passive by 2045, happy to release equity along the way.',
    variant: {
      profile: {
        baseSalary: 250000, annualSavings: 72000, depositPool: 150000,
        borrowingCapacity: 1800000, portfolioValue: 700000, currentDebt: 450000,
        existingAnnualRent: 600 * 52, useExistingEquity: true,
        cashflowGoal: 100000, targetPassiveIncome: 100000, equityGoal: 1500000,
        timelineYears: 20, strategyPreset: 'eg-to-cf',
      },
      existingProperties: [
        makeExisting({ currentValue: 700000, purchasePrice: 550000, loan: 450000, rentPerWeek: 600, state: 'NSW', boughtYear: 2020 }),
      ],
      properties: [
        P('regional-house-growth', 700000, 520),
        P('metro-unit-growth', 580000, 445, { entity: 'trust' }),
        P('regional-house-cashflow', 500000, 625, { entity: 'trust' }),
        P('regional-unit-cashflow', 380000, 510, { entity: 'trust' }),
      ],
    },
    expectations: {
      allPlaced: true,
      transitionExpected: true,
      cashflowGoal: { amount: 100000, byYear: 2045 },
    },
  },
  {
    id: 'VAR-ADAM-BAND',
    source: 'variant',
    archetype: 'adam · explicit sequence: 3 × $375-390k then a ~$600k freestanding house',
    brief:
      'Buy 3 properties between $375k and $390k over the first three years, then a freestanding house around $600k. Income $120k, $90k deposit, saving $2k/month, BC $1.1m.',
    variant: {
      profile: {
        baseSalary: 120000, annualSavings: 24000, depositPool: 90000,
        borrowingCapacity: 1100000, equityGoal: 1000000, cashflowGoal: 50000,
        timelineYears: 20, strategyPreset: 'cf-low',
      },
      properties: [
        P('regional-unit-cashflow', 380000, 510),
        P('regional-unit-cashflow', 385000, 515, { entity: 'trust' }),
        P('regional-unit-cashflow', 390000, 520, { entity: 'trust' }),
        P('regional-house-growth', 600000, 475, { entity: 'trust' }),
      ],
    },
    expectations: {
      propertyCount: [4, 4],
      perProperty: [
        { index: 0, price: [375000, 390000], placedBy: 2028 },
        { index: 1, price: [375000, 390000], placedBy: 2028 },
        { index: 2, price: [375000, 390000], placedBy: 2028 },
        { index: 3, price: [570000, 630000] },
      ],
      allPlaced: true,
    },
  },
  {
    id: 'VAR-ADAM-EQUITY',
    source: 'variant',
    archetype: 'adam · existing equity funds later deposits (low cash)',
    brief:
      'Client owns a $700k IP with $350k owing, rents $580/wk. Just $25k cash, saves $1.5k/month, earns $140k, BC $900k. Use the equity for the next deposits — two more around $450k each.',
    variant: {
      profile: {
        baseSalary: 140000, annualSavings: 18000, depositPool: 25000,
        borrowingCapacity: 900000, portfolioValue: 700000, currentDebt: 350000,
        existingAnnualRent: 580 * 52, useExistingEquity: true,
        equityGoal: 800000, cashflowGoal: 40000, timelineYears: 20, strategyPreset: 'cf-low',
      },
      existingProperties: [
        makeExisting({ currentValue: 700000, purchasePrice: 500000, loan: 350000, rentPerWeek: 580, state: 'QLD', boughtYear: 2019 }),
      ],
      properties: [
        P('regional-house-cashflow', 450000, 520),
        P('regional-house-cashflow', 450000, 520, { entity: 'trust' }),
      ],
    },
    expectations: {
      allPlaced: true, // deposits must come from equity release, cash alone can't fund them
      perProperty: [
        { index: 0, placedBy: 2028 },
        { index: 1, placedBy: 2033 },
      ],
    },
  },
  {
    id: 'VAR-BAFEE',
    source: 'variant',
    archetype: 'schema coverage · explicit BA engagement fee statement (fixed 16 Jul 2026)',
    brief:
      '$150k income, $120k deposit, $3k/month savings, BC $1m. Two properties around $550k. Include my $15k engagement fee on each purchase in the numbers.',
    variant: {
      profile: {
        baseSalary: 150000, annualSavings: 36000, depositPool: 120000,
        borrowingCapacity: 1000000, equityGoal: 1000000, cashflowGoal: 50000,
        timelineYears: 20, strategyPreset: 'eg-low',
      },
      properties: [
        P('regional-house-growth', 550000, 450),
        P('regional-house-growth', 550000, 450, { entity: 'trust' }),
      ],
    },
    expectations: {
      allPlaced: true,
      perProperty: [
        { index: 0, instanceFields: [{ field: 'engagementFee', expected: 15000 }] },
        { index: 1, instanceFields: [{ field: 'engagementFee', expected: 15000 }] },
      ],
      schemaChecks: [
        {
          path: 'properties.items.properties.engagementFee',
          shouldExist: true,
          description:
            'BA fee ("include my $15k engagement fee") must be expressible per property. Was a known schema gap (EXPECTED-FAIL) until engagementFee was added to create_plan on 16 Jul 2026 — a failure here now is a REGRESSION.',
        },
      ],
    },
  },
  {
    id: 'VAR-PURCHCOSTS',
    source: 'variant',
    archetype: 'schema coverage · explicit purchase-costs statement (fixed 16 Jul 2026)',
    brief:
      '$200k income, $250k deposit, $5k/month, BC $1.6m. Three properties around $600k in Sydney. Budget $45k purchase costs per property — NSW stamp duty plus legals — make sure that\'s in the model.',
    variant: {
      profile: {
        baseSalary: 200000, annualSavings: 60000, depositPool: 250000,
        borrowingCapacity: 1600000, equityGoal: 1200000, cashflowGoal: 60000,
        timelineYears: 20, strategyPreset: 'eg-low',
      },
      properties: [
        P('regional-house-growth', 600000, 475, { state: 'NSW' }),
        P('regional-house-growth', 600000, 475, { state: 'NSW', entity: 'trust' }),
        P('metro-unit-growth', 600000, 460, { state: 'NSW', entity: 'trust' }),
      ],
    },
    expectations: {
      allPlaced: true,
      schemaChecks: [
        {
          path: 'properties.items.properties.stampDutyOverride',
          shouldExist: true,
          description:
            'Explicit purchase-cost statements ("budget $45k stamp duty + legals per property") must be representable. Was a known schema gap (EXPECTED-FAIL) until stampDutyOverride was added on 16 Jul 2026 — a failure here now is a REGRESSION.',
        },
        {
          path: 'properties.items.properties.conveyancing',
          shouldExist: true,
          description: 'Stated legals must be representable. conveyancing added to create_plan on 16 Jul 2026 — a failure here now is a REGRESSION.',
        },
      ],
    },
  },

  // ── Company-strategy extraction cases (added 16 Jul 2026 with the schema
  //    expansion — verify strategy-stated factors land on the mapped plan,
  //    not the defaults). strategyProfileText exercises the same prompt path
  //    ChatPanel uses when a BA picks a strategy pill. ─────────────────────
  {
    id: 'VAR-STRAT-FEES',
    source: 'variant',
    archetype: 'company strategy · fee + other-costs lump / PM% / rate / IO term must stick per property',
    strategyProfileText:
      'Our engagement fee is $15,000 per purchase and we charge it on every buy. Allow another $6,000 in other purchase costs (legals, inspections, mortgage fees). Property management is 6.6% of rent. We model all lending at 6.8% and keep clients IO for the first 7 years.',
    brief:
      'New client: $160k income, $140k deposit, saving $3k/month, BC $1.1m. Build a two-property plan around $550k each following our company strategy.',
    variant: {
      profile: {
        baseSalary: 160000, annualSavings: 36000, depositPool: 140000,
        borrowingCapacity: 1100000, equityGoal: 1000000, cashflowGoal: 50000,
        timelineYears: 20, strategyPreset: 'eg-low',
      },
      properties: [
        P('regional-house-growth', 550000, 450, {
          engagementFee: 15000, purchaseCostsOverride: 21000, propertyManagementPercent: 6.6, interestRate: 6.8, ioTermYears: 7,
        }),
        P('regional-house-growth', 550000, 450, {
          engagementFee: 15000, purchaseCostsOverride: 21000, propertyManagementPercent: 6.6, interestRate: 6.8, ioTermYears: 7, entity: 'trust',
        }),
      ],
    },
    expectations: {
      allPlaced: true,
      propertyCount: [2, 2],
      perProperty: [
        {
          index: 0,
          instanceFields: [
            { field: 'engagementFee', expected: 15000 },
            // fee + other-costs lump: purchaseCostsOverride replaces the whole
            // fee bundle INCLUDING the BA fee, so the stated $15k + $6k must
            // land as ~$21k — $6k alone would erase the fee (re-sweep R1)
            { field: 'purchaseCostsOverride', expected: [20500, 21500] },
            { field: 'propertyManagementPercent', expected: 6.6 },
            { field: 'interestRate', expected: 6.8 },
            { field: 'ioTermYears', expected: 7 },
          ],
        },
        {
          index: 1,
          instanceFields: [
            { field: 'engagementFee', expected: 15000 },
            { field: 'purchaseCostsOverride', expected: [20500, 21500] },
            { field: 'propertyManagementPercent', expected: 6.6 },
            { field: 'interestRate', expected: 6.8 },
            { field: 'ioTermYears', expected: 7 },
          ],
        },
      ],
    },
  },
  {
    id: 'VAR-STRAT-GROWTH',
    source: 'variant',
    archetype: 'company strategy · rent growth / vacancy / portfolio rate + explicit 30y timeline',
    strategyProfileText:
      'We model rents growing 3% a year and allow 4% vacancy. Portfolio modelling rate is 6.5%.',
    brief:
      'Couple earning $90k each, $150k deposit, $4k/month savings, BC $1.4m. Three properties following our strategy, and make it a 30-year plan.',
    variant: {
      profile: {
        baseSalary: 90000, annualSavings: 48000, depositPool: 150000,
        borrowingCapacity: 1400000, equityGoal: 1200000, cashflowGoal: 50000,
        timelineYears: 30, timelineYearsExplicit: true,
        rentEscalationRate: 0.03, vacancyRate: 0.04, interestRate: 0.065,
        strategyPreset: 'eg-low',
      },
      properties: [
        P('regional-house-growth', 520000, 430),
        P('metro-unit-growth', 540000, 440, { entity: 'trust' }),
        P('regional-house-growth', 560000, 460, { entity: 'trust' }),
      ],
    },
    expectations: {
      allPlaced: true,
      timelineYears: 30,
      profileFields: [
        { field: 'rentEscalationRate', expected: 0.03 },
        { field: 'vacancyRate', expected: 0.04 },
        { field: 'interestRate', expected: 0.065 },
      ],
    },
  },
  {
    id: 'VAR-STRAT-UMV',
    source: 'variant',
    archetype: 'company strategy · buy-under-market valuation + 80% LVR + stated sell-down',
    strategyProfileText:
      'We buy roughly 8% under market value — day-one equity is our edge. Deposits are 20% (80% LVR, no LMI).',
    brief:
      '$200k income, $250k deposit, $5k/month savings, BC $1.6m. Two properties at $600k following our strategy, and per the exit plan sell the second one in 2041.',
    variant: {
      profile: {
        baseSalary: 200000, annualSavings: 60000, depositPool: 250000,
        borrowingCapacity: 1600000, equityGoal: 1200000, cashflowGoal: 60000,
        timelineYears: 20, strategyPreset: 'eg-low',
      },
      properties: [
        P('regional-house-growth', 600000, 480, { lvr: 80, valuationAtPurchase: 650000 }),
        P('regional-house-growth', 600000, 480, { lvr: 80, valuationAtPurchase: 650000, saleYear: 2041, entity: 'trust' }),
      ],
    },
    expectations: {
      allPlaced: true,
      perProperty: [
        {
          index: 0,
          instanceFields: [
            { field: 'lvr', expected: 80 },
            // 8% under market on $600k: 600000/0.92 ≈ 652k or 600000×1.08 = 648k
            { field: 'valuationAtPurchase', expected: [640000, 660000] },
          ],
        },
        {
          index: 1,
          instanceFields: [
            { field: 'lvr', expected: 80 },
            { field: 'valuationAtPurchase', expected: [640000, 660000] },
            { field: 'saleYear', expected: 2041 },
          ],
        },
      ],
    },
  },
];

export const SUITE: SuiteScenario[] = [...FIXTURES, ...VARIANTS];
