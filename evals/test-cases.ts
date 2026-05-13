/**
 * Eval test cases — seeded from investor demo notes and edge case testing.
 *
 * Each test case is a message sent to the AI, plus assertions about the
 * structured JSON response. Add new test cases whenever a bug is found —
 * the bug becomes a regression test that prevents it from happening again.
 */

import type { TestCase } from './types.ts';

// ─── Tier A: Initial plan generation ──────────────────────────────

const tierA: TestCase[] = [
  {
    id: 'A2',
    name: 'Low-income first-timer (72k, saving 1500/mo, male client)',
    tier: 'A',
    message: 'Got a young bloke, earns 72k, saving 1500 a month, wants to build a portfolio of 5 or more properties. No existing property.',
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Should generate an initial plan' },
      { path: 'clientProfile.members.0.annualIncome', op: 'equals', expected: 72000, description: 'Income extracted as $72k annual' },
      { path: 'clientProfile.monthlySavings', op: 'equals', expected: 1500, description: 'Savings extracted literally as $1500/mo — NOT substituted with $2000 estimate' },
      { path: 'properties', op: 'length_gte', expected: 4, description: 'Should generate 4+ properties (goal was 5+)' },
      { path: 'message', op: 'not_includes', expected: ' she ', description: 'Should NOT use "she" for male client' },
      { path: 'missingInputs', op: 'includes', expected: 'borrowing_capacity', description: 'Should flag missing borrowing capacity' },
    ],
  },
  {
    id: 'A4',
    name: '$10M Toorak PPOR → single IP',
    tier: 'A',
    message: 'Client has a $10M home in Toorak with $2M owing. Wants to leverage equity into a single high-value investment property around $8.5M. Income 450k, saving 15k/month.',
    strategyPreset: 'eg-high',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Should generate an initial plan' },
      { path: 'clientProfile.members.0.annualIncome', op: 'equals', expected: 450000, description: 'Income extracted as $450k' },
      { path: 'clientProfile.monthlySavings', op: 'equals', expected: 15000, description: 'Savings extracted as $15k/mo' },
      { path: 'clientProfile.existingPropertyDebt', op: 'equals', expected: 2000000, description: 'Existing debt extracted as $2M' },
      { path: 'properties', op: 'length', expected: 1, description: 'Should generate exactly 1 property (client asked for single IP)' },
    ],
  },
  {
    id: 'A5',
    name: 'Commercial transition plan',
    tier: 'A',
    message: 'Couple — Dave earns 180k, partner earns 140k. They have 300k deposit, saving 10k/month. Want to start with residential then move into commercial. Borrowing capacity 1.5M. 15 year plan, equity goal 5M.',
    strategyPreset: 'commercial-transition',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Should generate an initial plan' },
      { path: 'clientProfile.members', op: 'length', expected: 2, description: 'Should extract two members' },
      { path: 'clientProfile.members.0.annualIncome', op: 'equals', expected: 180000, description: 'Dave income $180k' },
      { path: 'clientProfile.members.1.annualIncome', op: 'equals', expected: 140000, description: 'Partner income $140k' },
      { path: 'clientProfile.borrowingCapacity', op: 'equals', expected: 1500000, description: 'BC extracted as $1.5M' },
      { path: 'clientProfile.monthlySavings', op: 'equals', expected: 10000, description: 'Savings $10k/mo' },
      { path: 'clientProfile.currentDeposit', op: 'equals', expected: 300000, description: 'Deposit $300k' },
      { path: 'strategyPreset', op: 'equals', expected: 'commercial-transition', description: 'Should use commercial-transition preset' },
      { path: 'properties', op: 'length_gte', expected: 3, description: 'Should have 3+ properties' },
    ],
  },
  {
    id: 'A6',
    name: 'Minimal info — should ask questions',
    tier: 'A',
    message: 'I have a client who wants to invest.',
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'one_of', expected: ['initial_plan', 'explanation'], description: 'Should return initial_plan or explanation (no financial data provided)' },
      { path: 'message', op: 'exists', description: 'Should have a message asking for more info' },
    ],
  },
  {
    id: 'A-couple-basic',
    name: 'Couple, first-time investors, standard scenario',
    tier: 'A',
    message: 'Jane and John, both earning 120k, saving 3500/month, 80k deposit. Want to start building a portfolio, first property around 650k in VIC.',
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Should generate an initial plan' },
      { path: 'clientProfile.members', op: 'length', expected: 2, description: 'Should extract two members' },
      { path: 'clientProfile.members.0.annualIncome', op: 'equals', expected: 120000, description: 'Each earner at $120k (not combined)' },
      { path: 'clientProfile.members.1.annualIncome', op: 'equals', expected: 120000, description: 'Second earner also $120k' },
      { path: 'clientProfile.monthlySavings', op: 'equals', expected: 3500, description: 'Savings $3500/mo' },
      { path: 'clientProfile.currentDeposit', op: 'equals', expected: 80000, description: 'Deposit $80k' },
      { path: 'properties', op: 'length_gte', expected: 2, description: 'Should generate 2+ properties' },
      { path: 'missingInputs', op: 'includes', expected: 'borrowing_capacity', description: 'Should flag missing BC' },
    ],
  },
  {
    id: 'A-ambiguous-numbers',
    name: 'Ambiguous numbers — couple earning 240k combined',
    tier: 'A',
    message: 'Client couple earning 240, saving about 4k, deposit 120. Want to invest in VIC.',
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Should generate an initial plan' },
      { path: 'clientProfile.members', op: 'length', expected: 2, description: 'Should extract two members (couple)' },
      { path: 'clientProfile.monthlySavings', op: 'equals', expected: 4000, description: 'Savings $4k/mo' },
      { path: 'clientProfile.currentDeposit', op: 'equals', expected: 120000, description: '$120 interpreted as $120k deposit' },
    ],
  },
  {
    id: 'A-zero-savings',
    name: 'Zero savings edge case',
    tier: 'A',
    message: 'Client Tom, 95k income, 30k saved, no ongoing savings capacity right now.',
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Should generate plan even with zero savings' },
      { path: 'clientProfile.members.0.name', op: 'equals', expected: 'Tom', description: 'Name extracted' },
      { path: 'clientProfile.members.0.annualIncome', op: 'equals', expected: 95000, description: 'Income $95k' },
      { path: 'clientProfile.monthlySavings', op: 'equals', expected: 0, description: 'Zero savings extracted correctly' },
      { path: 'clientProfile.currentDeposit', op: 'equals', expected: 30000, description: 'Deposit $30k' },
      { path: 'properties', op: 'length_gte', expected: 1, description: 'Should still generate at least 1 property' },
    ],
  },
];

// ─── Tier B: Modifications (require currentPlan) ─────────────────

const SAMPLE_PLAN_4_PROPERTIES = {
  investmentProfile: {
    depositPool: 80000,
    annualSavings: 42000,
    baseSalary: 120000,
    timelineYears: 15,
    equityGoal: 2000000,
    cashflowGoal: 0,
    strategyPreset: 'eg-low',
  },
  properties: [
    { instanceId: 'regional-house-growth_instance_0', type: 'regional-house-growth', purchasePrice: 550000, state: 'QLD', period: 1, growthAssumption: 'High' as const, loanProduct: 'IO' as const, lvr: 80, mode: 'Growth' },
    { instanceId: 'metro-unit-growth_instance_0', type: 'metro-unit-growth', purchasePrice: 480000, state: 'VIC', period: 3, growthAssumption: 'High' as const, loanProduct: 'IO' as const, lvr: 80, mode: 'Growth' },
    { instanceId: 'regional-house-growth_instance_1', type: 'regional-house-growth', purchasePrice: 430000, state: 'NSW', period: 5, growthAssumption: 'High' as const, loanProduct: 'IO' as const, lvr: 80, mode: 'Growth' },
    { instanceId: 'regional-unit-growth_instance_0', type: 'regional-unit-growth', purchasePrice: 400000, state: 'QLD', period: 7, growthAssumption: 'High' as const, loanProduct: 'IO' as const, lvr: 80, mode: 'Growth' },
  ],
  clientNames: ['Sarah'],
  enginePlanState: {
    horizonYear: 2040,
    projectedPortfolioValue: 5200000,
    projectedEquity: 2800000,
    projectedAnnualCashflow: 32000,
    equityGoalReachedYear: 2037,
  },
};

const tierB: TestCase[] = [
  {
    id: 'B1',
    name: 'Bump property 2 up by 200k (relative change)',
    tier: 'B',
    message: 'Bump property 2 up by 200k',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'modification', description: 'Should be a modification' },
      { path: 'modification.target', op: 'equals', expected: 'property-2', description: 'Should target property 2' },
      { path: 'modification.action', op: 'equals', expected: 'change', description: 'Action should be change' },
      { path: 'modification.params.purchasePrice', op: 'equals', expected: 680000, description: 'Should be absolute $680k (was $480k + $200k)' },
    ],
  },
  {
    id: 'B2',
    name: 'Switch to cashflow strategy',
    tier: 'B',
    message: 'Switch to cash flow',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Strategy switch MUST return initial_plan, not modification' },
      { path: 'strategyPreset', op: 'one_of', expected: ['cf-low', 'cf-high'], description: 'Should switch to a cashflow preset' },
      { path: 'properties', op: 'length_gte', expected: 2, description: 'Should generate new properties for cashflow preset' },
    ],
  },
  {
    id: 'B3',
    name: 'Multiple changes at once',
    tier: 'B',
    message: 'Change savings to 5k a month and drop property 1 to 400k',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'modification', description: 'Should be a modification' },
      { path: 'modifications', op: 'length', expected: 2, description: 'Should have 2 modifications (compound)' },
    ],
  },
  {
    id: 'B4',
    name: 'What if rates rise 2% (hypothetical)',
    tier: 'B',
    message: 'What if rates rise 2%?',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'explanation', description: 'Rate hypothetical should be explanation, NOT modification' },
      { path: 'refinementOptions', op: 'length_gte', expected: 1, description: 'Should offer a refinement option to apply the rate change' },
    ],
  },
  {
    id: 'B6',
    name: 'Vague yield request — should return suggestions',
    tier: 'B',
    message: 'Squeeze in one more, something with good yield',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'property_suggestions', description: 'Vague property request should return suggestions, not auto-add' },
    ],
  },
  {
    id: 'B-explicit-add',
    name: 'Explicit add — specific enough to act',
    tier: 'B',
    message: 'Add a regional house in QLD at 450k',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'modification', description: 'Specific add should be modification, not suggestions' },
      { path: 'modification.action', op: 'equals', expected: 'add', description: 'Action should be add' },
      { path: 'properties', op: 'length_gte', expected: 1, description: 'Should include the new property in properties array' },
      { path: 'properties.0.state', op: 'equals', expected: 'QLD', description: 'New property should be in QLD' },
      { path: 'properties.0.purchasePrice', op: 'equals', expected: 450000, description: 'New property price $450k' },
    ],
  },
  {
    id: 'B-remove',
    name: 'Remove property',
    tier: 'B',
    message: 'Drop property 3',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'modification', description: 'Should be a modification' },
      { path: 'modification.target', op: 'equals', expected: 'property-3', description: 'Should target property 3' },
      { path: 'modification.action', op: 'equals', expected: 'remove', description: 'Action should be remove' },
    ],
  },
  {
    id: 'B-profile-update-savings',
    name: 'Update savings (profile change)',
    tier: 'B',
    message: 'Actually she saves 3k a month',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'one_of', expected: ['modification', 'update_profile'], description: 'Should be a modification or update_profile (profile change)' },
      { path: 'message', op: 'exists', description: 'Should have a response message' },
    ],
  },
  {
    id: 'B-equity-goal-change',
    name: 'Change equity goal',
    tier: 'B',
    message: 'Set the equity goal to 5M',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'modification', description: 'Should be a modification' },
      { path: 'modification.target', op: 'one_of', expected: ['equityGoal', 'equity-goal'], description: 'Target should be equityGoal' },
      { path: 'modification.params.equityGoal', op: 'equals', expected: 5000000, description: 'New goal $5M' },
    ],
  },
];

// ─── Tier C: Edge cases — extraction quality ─────────────────────

const tierC: TestCase[] = [
  {
    id: 'C1',
    name: 'Long rambling input (teacher/electrician couple)',
    tier: 'C',
    message: "So I've got this couple right, she's a teacher making about 85k and he's a sparky — electrician — pulls in about 130k. They've got a place in Penrith worth maybe 750, still owe 350 on it. Saving about 4k a month between them. They want to get into investing, maybe 3 or 4 properties over the next 10-15 years. Nothing too crazy.",
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Should generate a plan from rambling input' },
      { path: 'clientProfile.members', op: 'length', expected: 2, description: 'Should extract two members' },
      { path: 'clientProfile.members.0.annualIncome', op: 'one_of', expected: [85000, 130000], description: 'First member income extracted' },
      { path: 'clientProfile.monthlySavings', op: 'equals', expected: 4000, description: 'Savings $4k/mo' },
      { path: 'clientProfile.existingPropertyDebt', op: 'equals', expected: 350000, description: 'Existing debt $350k' },
      { path: 'properties', op: 'length_gte', expected: 3, description: 'Should generate 3+ properties' },
    ],
  },
  {
    id: 'C2',
    name: 'Slang-heavy input (Brissy, GC, missus)',
    tier: 'C',
    message: "Young bloke, earns about 95k. His missus is on 80k. They've got 60k saved up, putting away 3k a month. Keen on Brissy and maybe the GC. Want to build something solid over 20 years.",
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Should generate a plan' },
      { path: 'clientProfile.members', op: 'length', expected: 2, description: 'Should extract two members' },
      { path: 'clientProfile.members.0.annualIncome', op: 'one_of', expected: [95000, 80000], description: 'First income extracted' },
      { path: 'clientProfile.monthlySavings', op: 'equals', expected: 3000, description: 'Savings $3k/mo' },
      { path: 'clientProfile.currentDeposit', op: 'equals', expected: 60000, description: 'Deposit $60k' },
      { path: 'properties.0.state', op: 'equals', expected: 'QLD', description: 'Brissy/GC should map to QLD' },
    ],
  },
  {
    id: 'C3',
    name: 'Hypothetical phrasing',
    tier: 'C',
    message: "How would a $2m borrowing capacity work for a couple on 200k combined with 150k deposit? Maybe 4 properties.",
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Should generate a plan even from hypothetical phrasing' },
      { path: 'clientProfile.borrowingCapacity', op: 'equals', expected: 2000000, description: 'BC $2M extracted' },
      { path: 'clientProfile.currentDeposit', op: 'equals', expected: 150000, description: 'Deposit $150k' },
      { path: 'properties', op: 'length', expected: 4, description: 'Should generate 4 properties as requested' },
    ],
  },
  {
    id: 'C4',
    name: 'Ambiguous "make it cheaper" (needs clarification)',
    tier: 'C',
    message: 'Make it cheaper',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'explanation', description: 'Ambiguous request should ask for clarification' },
    ],
  },
  {
    id: 'C5',
    name: 'Mixed hypothetical + action',
    tier: 'C',
    message: "What if we went 90% LVR — actually yeah do that, set all properties to 90% LVR",
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'modification', description: 'Should recognise the action intent ("actually do that")' },
    ],
  },
];

// ─── Demo scenarios ──────────────────────────────────────────────

const demoTests: TestCase[] = [
  {
    id: 'Demo1',
    name: 'Demo 1: New client, 800k capacity, 100k income goal in 10 years',
    tier: 'demo',
    message: 'New client, borrowing capacity 800k, wants 100k passive income in 10 years. Has about 100k deposit, earning 150k, saving 2500 a month. Existing property worth 700k with 500k owing.',
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Should generate an initial plan' },
      { path: 'clientProfile.borrowingCapacity', op: 'equals', expected: 800000, description: 'BC $800k' },
      { path: 'clientProfile.members.0.annualIncome', op: 'equals', expected: 150000, description: 'Income $150k' },
      { path: 'clientProfile.monthlySavings', op: 'equals', expected: 2500, description: 'Savings $2500/mo — must extract literally' },
      { path: 'clientProfile.currentDeposit', op: 'equals', expected: 100000, description: 'Deposit $100k' },
      { path: 'clientProfile.existingPropertyDebt', op: 'equals', expected: 500000, description: 'Existing debt $500k' },
      { path: 'properties', op: 'length_gte', expected: 3, description: 'Should generate 3+ properties' },
    ],
  },
  {
    id: 'Demo2-update',
    name: 'Demo 2: Mid-conversation profile update (THE critical test)',
    tier: 'demo',
    message: 'He makes 150k a year and has a current capacity of 600k',
    currentPlan: {
      investmentProfile: {
        depositPool: 50000,
        annualSavings: 24000,
        baseSalary: 90000,
        timelineYears: 10,
        equityGoal: 2000000,
        cashflowGoal: 100000,
        strategyPreset: 'eg-low',
      },
      properties: [
        { instanceId: 'regional-house-growth_instance_0', type: 'regional-house-growth', purchasePrice: 500000, state: 'QLD', period: 1, growthAssumption: 'High' as const, loanProduct: 'IO' as const, lvr: 80, mode: 'Growth' },
        { instanceId: 'metro-unit-growth_instance_0', type: 'metro-unit-growth', purchasePrice: 450000, state: 'VIC', period: 3, growthAssumption: 'High' as const, loanProduct: 'IO' as const, lvr: 80, mode: 'Growth' },
        { instanceId: 'regional-house-growth_instance_1', type: 'regional-house-growth', purchasePrice: 420000, state: 'NSW', period: 5, growthAssumption: 'High' as const, loanProduct: 'IO' as const, lvr: 80, mode: 'Growth' },
      ],
      clientNames: ['Client'],
      enginePlanState: {
        horizonYear: 2036,
        projectedPortfolioValue: 3200000,
        projectedEquity: 1400000,
        equityGoalReachedYear: null,
      },
    },
    strategyPreset: 'eg-low',
    conversationHistory: [
      { role: 'user', content: 'Client wants to invest, has 50k deposit, saving 2k a month. 10 year goal, 2M equity.' },
      { role: 'assistant', content: '{"type":"initial_plan","message":"Built a 3-property plan..."}' },
    ],
    assertions: [
      { path: 'type', op: 'equals', expected: 'update_profile', description: 'Should classify as update_profile (not initial_plan or modification)' },
      { path: 'profileUpdates.baseSalary', op: 'equals', expected: 150000, description: 'Should extract income as $150k' },
      { path: 'profileUpdates.borrowingCapacity', op: 'equals', expected: 600000, description: 'Should extract borrowing capacity as $600k' },
      { path: 'message', op: 'not_includes', expected: 'new client', description: 'Should NOT say "looks like a new client"' },
      { path: 'message', op: 'not_includes', expected: 'clear the current plan', description: 'Should NOT ask to clear the plan' },
    ],
  },
];

// ─── Compliance tests ────────────────────────────────────────────

const complianceTests: TestCase[] = [
  {
    id: 'compliance-no-banned-words',
    name: 'Compliance: no banned phrases in response',
    tier: 'regression',
    message: 'Client Sarah, 120k income, 80k deposit, saving 3k/month. Build a growth portfolio.',
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'initial_plan', description: 'Should generate a plan' },
      { path: 'message', op: 'not_includes', expected: 'recommend', description: 'Should not use "recommend"' },
      { path: 'message', op: 'not_includes', expected: 'should', description: 'Should not use advisory "should"' },
      { path: 'message', op: 'not_includes', expected: 'aggressive', description: 'Should not use "aggressive"' },
      { path: 'message', op: 'not_includes', expected: 'passive income', description: 'Should not use "passive income"' },
      { path: 'message', op: 'not_includes', expected: 'strategy', description: 'Should not use "strategy"' },
    ],
  },
];

// ─── Event tests ─────────────────────────────────────────────────

const eventTests: TestCase[] = [
  {
    id: 'event-refinance',
    name: 'Refinance event recognised',
    tier: 'regression',
    message: 'Plan a refinance on property 1 in 2029 at 5.5%',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'add_event', description: 'Should be add_event type' },
      { path: 'event.eventType', op: 'equals', expected: 'refinance', description: 'Event type should be refinance' },
      { path: 'event.targetYear', op: 'equals', expected: 2029, description: 'Target year 2029' },
    ],
  },
  {
    id: 'event-salary-change',
    name: 'Salary change event recognised',
    tier: 'regression',
    message: 'Sarah gets a raise to 150k in 2028',
    currentPlan: SAMPLE_PLAN_4_PROPERTIES,
    strategyPreset: 'eg-low',
    assertions: [
      { path: 'type', op: 'equals', expected: 'add_event', description: 'Should be add_event type' },
      { path: 'event.eventType', op: 'equals', expected: 'salary_change', description: 'Event type should be salary_change' },
      { path: 'event.targetYear', op: 'equals', expected: 2028, description: 'Target year 2028' },
      { path: 'event.parameters.newSalary', op: 'equals', expected: 150000, description: 'New salary $150k' },
    ],
  },
];

// ─── Export all test cases ───────────────────────────────────────

export const ALL_TEST_CASES: TestCase[] = [
  ...tierA,
  ...tierB,
  ...tierC,
  ...demoTests,
  ...complianceTests,
  ...eventTests,
];
