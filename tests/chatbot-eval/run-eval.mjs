/**
 * Chatbot Evaluation Runner
 *
 * Calls the nl-parse edge function with 50 real-world test inputs,
 * logs every request/response, and produces a results summary.
 *
 * Usage: node tests/chatbot-eval/run-eval.mjs
 * Output: tests/chatbot-eval/results/eval-<timestamp>.json
 */

const SUPABASE_URL = 'https://gaoqzrdzihmrwipwsbwo.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdhb3F6cmR6aWhtcndpcHdzYndvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTk2MDQsImV4cCI6MjA3NDQ5NTYwNH0.PcoSky4H-rC3D7FqpNHUrVGeqTx52cfmRawqm1DBxsM';
const ENDPOINT = `${SUPABASE_URL}/functions/v1/nl-parse`;

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Mock current plan (used for follow-up / modification tests) ────
const MOCK_PLAN = {
  investmentProfile: {
    depositPool: 80000,
    annualSavings: 24000,
    baseSalary: 120000,
    timelineYears: 20,
    equityGoal: 160000,
    cashflowGoal: 0,
    strategyPreset: 'eg-low',
  },
  properties: [
    {
      instanceId: 'prop-1',
      type: 'regional-house-growth',
      purchasePrice: 450000,
      state: 'QLD',
      period: 1,
      growthAssumption: 'High',
      loanProduct: 'IO',
      lvr: 88,
      mode: 'Growth',
    },
    {
      instanceId: 'prop-2',
      type: 'metro-unit-growth',
      purchasePrice: 420000,
      state: 'VIC',
      period: 5,
      growthAssumption: 'Medium',
      loanProduct: 'IO',
      lvr: 88,
      mode: 'Growth',
    },
    {
      instanceId: 'prop-3',
      type: 'regional-house-growth',
      purchasePrice: 470000,
      state: 'QLD',
      period: 9,
      growthAssumption: 'High',
      loanProduct: 'IO',
      lvr: 88,
      mode: 'Growth',
    },
  ],
  clientNames: ['Tom'],
  enginePlanState: {
    horizonYear: 2046,
    projectedPortfolioValue: 3200000,
    projectedEquity: 1800000,
    projectedAnnualCashflow: 25000,
    equityGoalReachedYear: 2038,
  },
};

// Couple version of the plan
const MOCK_PLAN_COUPLE = {
  ...MOCK_PLAN,
  investmentProfile: {
    ...MOCK_PLAN.investmentProfile,
    baseSalary: 240000,
    depositPool: 150000,
    annualSavings: 48000,
  },
  clientNames: ['Tom', 'Sarah'],
};

// ── Test cases ─────────────────────────────────────────────────────

const TEST_CASES = [

  // ═══════════════════════════════════════════════════════════════════
  // CATEGORY 1: New Plan Generation (no currentPlan)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'NP-01',
    category: 'new_plan',
    description: 'Standard single client brief',
    message: 'I have a client earning 120k with 80k deposit, saving 2k a month. Borrowing capacity of 600k.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should extract 120k salary', 'should extract 80k deposit', 'should extract 2k/month savings = 24k annual', 'should extract 600k borrowing capacity'],
  },
  {
    id: 'NP-02',
    category: 'new_plan',
    description: 'Couple with casual language',
    message: 'Got a young couple, Tom and Sarah. Both earning about 120k, saving 3500 a month between them, got 150k sitting in the bank. Pre-approved for 1.2m.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should have 2 members', 'should be 120k EACH not combined', 'savings should be 3500/month = 42000/year', 'deposit 150k', 'borrowing capacity 1.2m'],
  },
  {
    id: 'NP-03',
    category: 'new_plan',
    description: 'Minimal information - just income',
    message: 'Client on 90k, wants to get into property.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should generate a plan despite missing info', 'should flag missing inputs', 'should NOT ask clarifying questions before generating'],
  },
  {
    id: 'NP-04',
    category: 'new_plan',
    description: 'Australian slang heavy',
    message: 'Got a bloke in Brissy, earns about 95k, got 60k deposit. Wants a couple of IPs, nothing too flash. No existing properties. Saving about 1500 a month.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should use he/him pronouns', 'should interpret Brissy as Brisbane/QLD', 'should interpret "couple of IPs" as ~2 properties', 'savings 1500/month = 18000/year'],
  },
  {
    id: 'NP-05',
    category: 'new_plan',
    description: 'High capacity client',
    message: 'Power couple - combined income 450k, 300k deposit, saving 8k a month. Borrowing capacity 2.5m. Want to build a serious portfolio over 15 years.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should use high-price cells', 'should respect 15yr timeline', 'should set timelineYearsExplicit true', 'high capacity pricing'],
  },
  {
    id: 'NP-06',
    category: 'new_plan',
    description: 'Very low deposit, challenging financials',
    message: 'Young guy, first job out of uni. Earning 65k, only got 20k saved. Saving 800 a month. No idea about borrowing yet.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should still generate a plan', 'should use cheapest cells', 'should flag borrowing_capacity as missing', 'savings 800/month NOT substituted'],
  },
  {
    id: 'NP-07',
    category: 'new_plan',
    description: 'Cashflow focused request',
    message: 'Client wants passive income. Earning 130k, 100k deposit, saving 3k/month. Wants 80k a year in rental income eventually. Capacity about 900k.',
    currentPlan: null,
    strategyPreset: 'cf-low',
    expectedType: 'initial_plan',
    checks: ['should bias toward cashflow cells', 'should set cashflowGoal to 80000', 'should extract all numbers correctly'],
  },
  {
    id: 'NP-08',
    category: 'new_plan',
    description: 'Existing property with PPOR',
    message: 'Couple earning 200k combined, saving 4k a month, 90k deposit. They own their PPOR worth 900k with 400k owing. Capacity 1.1m.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should calculate PPOR equity: (900k * 0.8) - 400k = 320k', 'should extract existing property data', 'should NOT flag existing_debt as missing'],
  },
  {
    id: 'NP-09',
    category: 'new_plan',
    description: 'Almost no info - should still try',
    message: 'I have a client who wants to invest.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['may ask up to 2 questions OR generate with defaults', 'should NOT block entirely', 'should NOT ask 3+ questions'],
  },
  {
    id: 'NP-10',
    category: 'new_plan',
    description: 'Numbers without units',
    message: 'Client earns 140, deposit 100, saves 2500 a month, capacity 800.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should interpret 140 as 140k', 'deposit 100 as 100k', 'savings 2500/month', 'capacity 800 as 800k'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // CATEGORY 2: Follow-up Questions (with currentPlan)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'FQ-01',
    category: 'follow_up',
    description: 'Simple question about the plan',
    message: 'What interest rate are you using?',
    currentPlan: MOCK_PLAN,
    expectedType: 'explanation',
    checks: ['should answer the question directly', 'should NOT try to modify the plan', 'should reference actual rates from plan'],
  },
  {
    id: 'FQ-02',
    category: 'follow_up',
    description: 'Question about a specific property',
    message: 'Why did you pick QLD for property 1?',
    currentPlan: MOCK_PLAN,
    expectedType: 'explanation',
    checks: ['should explain reasoning', 'should NOT modify anything', 'should NOT block the question'],
  },
  {
    id: 'FQ-03',
    category: 'follow_up',
    description: 'Question about timeline',
    message: 'When does the first property get purchased?',
    currentPlan: MOCK_PLAN,
    expectedType: 'explanation',
    checks: ['should reference period/timeline', 'should NOT block or refuse'],
  },
  {
    id: 'FQ-04',
    category: 'follow_up',
    description: 'Vague follow-up',
    message: 'Looks good. Tell me more.',
    currentPlan: MOCK_PLAN,
    expectedType: 'explanation',
    checks: ['should provide more detail about the plan', 'should NOT treat as new plan', 'should NOT block'],
  },
  {
    id: 'FQ-05',
    category: 'follow_up',
    description: 'Question that sounds like it could be a modification',
    message: 'Can we do better in NSW?',
    currentPlan: MOCK_PLAN,
    expectedType: null, // could be explanation or modification - either is OK
    checks: ['should NOT block', 'should either explain NSW options or suggest change', 'should be conversational'],
  },
  {
    id: 'FQ-06',
    category: 'follow_up',
    description: 'Question about feasibility',
    message: 'Is this realistic?',
    currentPlan: MOCK_PLAN,
    expectedType: 'explanation',
    checks: ['should reference plan data', 'should NOT refuse to answer', 'should frame as modelling not advice'],
  },
  {
    id: 'FQ-07',
    category: 'follow_up',
    description: 'Question about LMI',
    message: 'How much LMI are we paying on these?',
    currentPlan: MOCK_PLAN,
    expectedType: 'explanation',
    checks: ['should explain LMI in context', 'should NOT attempt to calculate (engine does that)', 'should reference the dashboard'],
  },
  {
    id: 'FQ-08',
    category: 'follow_up',
    description: 'Off-topic question',
    message: 'What do you think about the Brisbane market right now?',
    currentPlan: MOCK_PLAN,
    expectedType: 'explanation',
    checks: ['should acknowledge but stay in modelling lane', 'should NOT provide market advice', 'should NOT block'],
  },
  {
    id: 'FQ-09',
    category: 'follow_up',
    description: 'Single word follow-up',
    message: 'Why?',
    currentPlan: MOCK_PLAN,
    expectedType: 'explanation',
    checks: ['should attempt to answer based on context', 'should NOT block or refuse', 'should NOT treat as new plan'],
  },
  {
    id: 'FQ-10',
    category: 'follow_up',
    description: 'Thanks / acknowledgment',
    message: 'Thanks, that looks great.',
    currentPlan: MOCK_PLAN,
    expectedType: 'explanation',
    checks: ['should acknowledge naturally', 'should NOT modify anything', 'should NOT ask follow-up questions'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // CATEGORY 3: Profile Updates (with currentPlan)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'PU-01',
    category: 'profile_update',
    description: 'Income correction',
    message: 'Actually he makes 150k not 120k.',
    currentPlan: MOCK_PLAN,
    expectedType: 'update_profile',
    checks: ['should update baseSalary to 150000', 'should NOT rebuild plan', 'should NOT touch other fields'],
  },
  {
    id: 'PU-02',
    category: 'profile_update',
    description: 'Multiple updates at once',
    message: 'He makes 150k and has 600k capacity.',
    currentPlan: MOCK_PLAN,
    expectedType: 'update_profile',
    checks: ['should update baseSalary AND borrowingCapacity', 'should NOT rebuild plan', 'should NOT treat as new client'],
  },
  {
    id: 'PU-03',
    category: 'profile_update',
    description: 'Savings correction',
    message: 'He actually saves 3k a month, not 2k.',
    currentPlan: MOCK_PLAN,
    expectedType: 'update_profile',
    checks: ['should update annualSavings to 36000', 'should convert monthly to annual'],
  },
  {
    id: 'PU-04',
    category: 'profile_update',
    description: 'Adding borrowing capacity that was missing',
    message: 'Just got the pre-approval back - 750k borrowing capacity.',
    currentPlan: MOCK_PLAN,
    expectedType: 'update_profile',
    checks: ['should set borrowingCapacity to 750000', 'should NOT rebuild plan'],
  },
  {
    id: 'PU-05',
    category: 'profile_update',
    description: 'Deposit update',
    message: 'Deposit is actually 120k, they got a gift from parents.',
    currentPlan: MOCK_PLAN,
    expectedType: 'update_profile',
    checks: ['should update depositPool to 120000', 'should NOT touch other fields'],
  },
  {
    id: 'PU-06',
    category: 'profile_update',
    description: 'Adding a partner (couple names issue)',
    message: 'Oh and his partner Sarah is also earning 110k.',
    currentPlan: MOCK_PLAN,
    expectedType: null, // could be update_profile or other
    checks: ['should NOT treat as new client', 'should NOT glitch out on adding a name', 'should update income or acknowledge partner'],
  },
  {
    id: 'PU-07',
    category: 'profile_update',
    description: 'Timeline change',
    message: 'Make it 15 years instead of 20.',
    currentPlan: MOCK_PLAN,
    expectedType: null, // could be update_profile or modification
    checks: ['should update timeline to 15', 'should NOT block'],
  },
  {
    id: 'PU-08',
    category: 'profile_update',
    description: 'Goal update',
    message: 'He wants 3 million in equity, not 160k.',
    currentPlan: MOCK_PLAN,
    expectedType: 'update_profile',
    checks: ['should update equityGoal to 3000000', 'should NOT rebuild plan'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // CATEGORY 4: Property Modifications (with currentPlan)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'PM-01',
    category: 'modification',
    description: 'Change price of specific property',
    message: 'Make property 2 600k instead.',
    currentPlan: MOCK_PLAN,
    expectedType: 'modification',
    checks: ['should target property 2', 'should set price to 600000', 'should cite new absolute value in message'],
  },
  {
    id: 'PM-02',
    category: 'modification',
    description: 'Change state of a property',
    message: 'Move property 1 to NSW.',
    currentPlan: MOCK_PLAN,
    expectedType: 'modification',
    checks: ['should target property 1', 'should change state to NSW'],
  },
  {
    id: 'PM-03',
    category: 'modification',
    description: 'Remove a property',
    message: 'Drop the last property.',
    currentPlan: MOCK_PLAN,
    expectedType: 'modification',
    checks: ['should target property 3 (last)', 'should remove it'],
  },
  {
    id: 'PM-04',
    category: 'modification',
    description: 'Add a property',
    message: 'Add a metro unit in Sydney around 550k.',
    currentPlan: MOCK_PLAN,
    expectedType: 'modification',
    checks: ['should add a new property', 'should be metro-unit type', 'state NSW', 'price ~550k'],
  },
  {
    id: 'PM-05',
    category: 'modification',
    description: 'Change loan type',
    message: 'Switch property 1 to P&I.',
    currentPlan: MOCK_PLAN,
    expectedType: 'modification',
    checks: ['should target property 1', 'should change loanProduct to PI'],
  },
  {
    id: 'PM-06',
    category: 'modification',
    description: 'Vague modification request',
    message: 'Can we make the portfolio cheaper overall?',
    currentPlan: MOCK_PLAN,
    expectedType: null, // could be modification or explanation
    checks: ['should NOT block', 'should either suggest changes or make them', 'should be helpful'],
  },
  {
    id: 'PM-07',
    category: 'modification',
    description: 'Multiple changes in one message',
    message: 'Bump property 1 to 500k and move property 2 to QLD.',
    currentPlan: MOCK_PLAN,
    expectedType: 'modification',
    checks: ['should handle both changes', 'should cite new values in message'],
  },
  {
    id: 'PM-08',
    category: 'modification',
    description: 'Change growth assumption',
    message: 'Set property 2 to high growth.',
    currentPlan: MOCK_PLAN,
    expectedType: 'modification',
    checks: ['should target property 2', 'should change growthAssumption to High'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // CATEGORY 5: Ambiguous / Edge Case Inputs
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'EC-01',
    category: 'edge_case',
    description: 'Repeated sentence (known bug)',
    message: 'I have a client I have a client earning 120k with 80k deposit.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should NOT fail or produce garbage', 'should handle repeated text gracefully', 'should extract data from the repeated input'],
  },
  {
    id: 'EC-02',
    category: 'edge_case',
    description: 'Typos and bad grammar',
    message: 'clent earns 100k, hes got like 50k deposit n saves bout 2k a mnth. capacity probs around 700k',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should parse despite typos', 'should extract correct numbers', 'should not refuse'],
  },
  {
    id: 'EC-03',
    category: 'edge_case',
    description: 'Message that could be new plan or update',
    message: 'Tom earns 150k and has 600k capacity.',
    currentPlan: MOCK_PLAN, // Plan exists with Tom already
    expectedType: 'update_profile',
    checks: ['should recognize Tom is the EXISTING client', 'should NOT treat as new client', 'should update profile'],
  },
  {
    id: 'EC-04',
    category: 'edge_case',
    description: 'Message with two new names (couple glitch test)',
    message: 'New client - Rob and Emily, both earning 110k, 200k deposit, saving 5k a month, 1.5m capacity.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should create 2 members', 'should NOT glitch on two names', 'should have both names in members array'],
  },
  {
    id: 'EC-05',
    category: 'edge_case',
    description: 'Two names with existing single-name plan',
    message: 'Actually Tom and Sarah are a couple. Sarah earns 100k too.',
    currentPlan: MOCK_PLAN, // Has "Tom" only
    expectedType: null, // update_profile or explanation
    checks: ['should NOT treat as entirely new client', 'should recognize Tom is existing', 'should add Sarah as partner'],
  },
  {
    id: 'EC-06',
    category: 'edge_case',
    description: 'Entirely different client when plan exists',
    message: 'New client - completely different person. Jake, 95k income, 40k deposit, saving 1500/month, 500k capacity.',
    currentPlan: MOCK_PLAN,
    expectedType: 'explanation', // should say "clear plan first"
    checks: ['should recognize this is a NEW client', 'should suggest clearing current plan', 'should NOT overwrite Tom with Jake'],
  },
  {
    id: 'EC-07',
    category: 'edge_case',
    description: 'Just a greeting',
    message: 'Hey',
    currentPlan: null,
    expectedType: null,
    checks: ['should NOT block or error', 'should respond conversationally', 'should NOT generate a plan from nothing'],
  },
  {
    id: 'EC-08',
    category: 'edge_case',
    description: 'Request with conflicting numbers',
    message: 'Client earns 90k but wants 10 properties in 5 years with only 30k deposit.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should generate BEST realistic plan', 'should note the gap', 'should NOT just refuse'],
  },
  {
    id: 'EC-09',
    category: 'edge_case',
    description: 'Follow-up that is actually a new plan request',
    message: 'Start fresh. New plan - client earning 180k, 200k deposit, 4k/month savings, 1.3m capacity.',
    currentPlan: MOCK_PLAN,
    expectedType: 'initial_plan',
    checks: ['should generate fresh plan', 'should NOT mix with existing plan data'],
  },
  {
    id: 'EC-10',
    category: 'edge_case',
    description: 'Emotional / frustrated user',
    message: 'This doesnt look right at all. The numbers are way off. Can you just redo the whole thing properly?',
    currentPlan: MOCK_PLAN,
    expectedType: null,
    checks: ['should NOT be defensive', 'should ask what looks wrong OR offer to rebuild', 'should be helpful not blocking'],
  },
  {
    id: 'EC-11',
    category: 'edge_case',
    description: 'Instruction-like message',
    message: 'Show me what 5 properties looks like for this client.',
    currentPlan: MOCK_PLAN,
    expectedType: null, // could be modification (rebuild with 5) or explanation
    checks: ['should NOT block', 'should interpret as wanting 5-property scenario'],
  },
  {
    id: 'EC-12',
    category: 'edge_case',
    description: 'Message with only savings mentioned',
    message: 'She saves 2500 a month.',
    currentPlan: MOCK_PLAN,
    expectedType: 'update_profile',
    checks: ['should update annualSavings to 30000', 'should use she/her pronouns', 'should NOT flag savings as missing'],
  },
  {
    id: 'EC-13',
    category: 'edge_case',
    description: 'Very long rambling input',
    message: 'So I was talking to this client yesterday and he mentioned he works in mining and earns pretty good money, like around 160k or so, and his wife works part time at a school earning maybe 45k, they have been saving for a while and have about 200k in the bank, they want to build a portfolio over the next maybe 10 to 15 years, nothing crazy but they want some growth. They own their house outright worth about 700k. Borrowing capacity around 1m I think.',
    currentPlan: null,
    expectedType: 'initial_plan',
    checks: ['should extract 160k + 45k incomes', 'should get 200k deposit', 'should calculate PPOR equity (700k * 0.8 = 560k)', 'should handle timeline range (10-15)'],
  },
  {
    id: 'EC-14',
    category: 'edge_case',
    description: 'Preset switch request',
    message: 'Switch to cashflow focus.',
    currentPlan: MOCK_PLAN,
    expectedType: null, // could be preset_switch
    checks: ['should recognize preset change request', 'should NOT block'],
  },
];

// ── Runner ─────────────────────────────────────────────────────────

async function callAPI(testCase) {
  const body = {
    message: testCase.message,
    conversationHistory: testCase.conversationHistory || [],
    currentPlan: testCase.currentPlan || null,
    strategyPreset: testCase.strategyPreset || 'eg-low',
    planningDefaults: null,
  };

  const startTime = Date.now();
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });

    const elapsed = Date.now() - startTime;
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* leave null */ }

    return {
      status: resp.status,
      elapsed,
      raw: text.substring(0, 5000), // cap at 5k chars
      parsed: json,
      error: null,
    };
  } catch (err) {
    return {
      status: 0,
      elapsed: Date.now() - startTime,
      raw: null,
      parsed: null,
      error: err.message,
    };
  }
}

function analyzeResult(testCase, result) {
  const issues = [];

  if (result.error) {
    issues.push(`API ERROR: ${result.error}`);
    return { verdict: 'ERROR', issues };
  }

  if (result.status !== 200) {
    issues.push(`HTTP ${result.status}: ${result.raw?.substring(0, 200)}`);
    return { verdict: 'ERROR', issues };
  }

  const r = result.parsed;
  if (!r) {
    issues.push('Response was not valid JSON');
    return { verdict: 'ERROR', issues };
  }

  // Check response type matches expected
  if (testCase.expectedType && r.type !== testCase.expectedType) {
    issues.push(`WRONG TYPE: expected "${testCase.expectedType}", got "${r.type}"`);
  }

  // Check message quality
  if (r.message) {
    // Check for buttons/options language
    if (/click|select.*option|choose.*below|option \d/i.test(r.message)) {
      issues.push('MESSAGE: Contains button/option language');
    }
    // Check for "see below" references
    if (/see below|shown below|below this|cards below/i.test(r.message)) {
      issues.push('MESSAGE: References content "below" that doesnt exist');
    }
    // Check for trailing questions (except for genuinely allowed clarification)
    if (/\?\s*$/.test(r.message) && r.type !== 'explanation') {
      issues.push('MESSAGE: Ends with a question (potential unwanted follow-up prompt)');
    }
    // Check for duplicate "See the dashboard"
    const dashCount = (r.message.match(/See the dashboard/gi) || []).length;
    if (dashCount > 1) {
      issues.push(`MESSAGE: Duplicate "See the dashboard" (${dashCount} times)`);
    }
    // Check for banned words
    const banned = ['strategy', 'recommend', 'should', 'aggressive', 'passive income', 'goal achieved', 'wealth building'];
    for (const word of banned) {
      // "should" only banned in advisory context, skip in quotes
      if (word === 'should' && !/you should|they should|he should|she should/i.test(r.message)) continue;
      if (new RegExp(`\\b${word}\\b`, 'i').test(r.message)) {
        issues.push(`COMPLIANCE: Contains banned phrase "${word}"`);
      }
    }
    // Check for emoji
    if (/[\u{1F600}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F300}-\u{1F5FF}]/u.test(r.message)) {
      issues.push('MESSAGE: Contains emoji');
    }
    // Check for exclamation marks
    if (/!/.test(r.message)) {
      issues.push('MESSAGE: Contains exclamation mark');
    }
  }

  // Type-specific checks
  if (r.type === 'initial_plan') {
    if (!r.clientProfile) issues.push('MISSING: clientProfile');
    if (!r.investmentProfile) issues.push('MISSING: investmentProfile');
    if (!r.properties || r.properties.length === 0) issues.push('MISSING: properties array');
    if (!r.strategyPreset) issues.push('MISSING: strategyPreset');
  }

  if (r.type === 'update_profile') {
    if (!r.profileUpdates || Object.keys(r.profileUpdates).length === 0) {
      issues.push('MISSING: profileUpdates (empty or missing)');
    }
  }

  if (r.type === 'modification') {
    if (!r.modification && (!r.modifications || r.modifications.length === 0)) {
      issues.push('MISSING: modification or modifications');
    }
  }

  const verdict = issues.length === 0 ? 'PASS' :
                  issues.some(i => i.startsWith('WRONG TYPE') || i.startsWith('API ERROR') || i.startsWith('MISSING:')) ? 'FAIL' : 'WARN';

  return { verdict, issues };
}

async function main() {
  console.log(`\n🧪 PropPath Chatbot Evaluation`);
  console.log(`   ${TEST_CASES.length} test cases`);
  console.log(`   Endpoint: ${ENDPOINT}`);
  console.log(`   Started: ${new Date().toISOString()}\n`);

  const results = [];
  let passCount = 0, warnCount = 0, failCount = 0, errorCount = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    process.stdout.write(`  [${i + 1}/${TEST_CASES.length}] ${tc.id}: ${tc.description}...`);

    const apiResult = await callAPI(tc);
    const analysis = analyzeResult(tc, apiResult);

    const entry = {
      id: tc.id,
      category: tc.category,
      description: tc.description,
      input: tc.message,
      hasPlan: !!tc.currentPlan,
      expectedType: tc.expectedType,
      checks: tc.checks,
      response: {
        status: apiResult.status,
        elapsed: apiResult.elapsed,
        type: apiResult.parsed?.type || null,
        message: apiResult.parsed?.message || null,
        assumptions: apiResult.parsed?.assumptions || null,
        missingInputs: apiResult.parsed?.missingInputs || null,
        profileUpdates: apiResult.parsed?.profileUpdates || null,
        modification: apiResult.parsed?.modification || null,
        modifications: apiResult.parsed?.modifications || null,
        clientProfile: apiResult.parsed?.clientProfile || null,
        investmentProfile: apiResult.parsed?.investmentProfile || null,
        propertyCount: apiResult.parsed?.properties?.length || 0,
        properties: apiResult.parsed?.properties || null,
        propertySuggestions: apiResult.parsed?.propertySuggestions || null,
        strategyPreset: apiResult.parsed?.strategyPreset || null,
        error: apiResult.error,
      },
      analysis: analysis,
    };

    results.push(entry);

    switch (analysis.verdict) {
      case 'PASS': passCount++; break;
      case 'WARN': warnCount++; break;
      case 'FAIL': failCount++; break;
      case 'ERROR': errorCount++; break;
    }

    const icon = { PASS: '✅', WARN: '⚠️', FAIL: '❌', ERROR: '💥' }[analysis.verdict];
    console.log(` ${icon} ${analysis.verdict} (${apiResult.elapsed}ms)${analysis.issues.length > 0 ? ' — ' + analysis.issues[0] : ''}`);

    // Small delay to avoid rate limiting
    if (i < TEST_CASES.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // ── Summary ────────────────────────────────────────────────────
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests: TEST_CASES.length,
    pass: passCount,
    warn: warnCount,
    fail: failCount,
    error: errorCount,
    categories: {},
  };

  // Group by category
  for (const r of results) {
    if (!summary.categories[r.category]) {
      summary.categories[r.category] = { total: 0, pass: 0, warn: 0, fail: 0, error: 0 };
    }
    summary.categories[r.category].total++;
    summary.categories[r.category][r.analysis.verdict.toLowerCase()]++;
  }

  const output = { summary, results };

  // Write results
  const resultsDir = join(__dirname, 'results');
  mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = join(resultsDir, `eval-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  RESULTS: ${passCount} pass, ${warnCount} warn, ${failCount} fail, ${errorCount} error`);
  console.log(`${'═'.repeat(60)}`);
  for (const [cat, counts] of Object.entries(summary.categories)) {
    console.log(`  ${cat.padEnd(20)} ${counts.pass}/${counts.total} pass, ${counts.warn} warn, ${counts.fail} fail`);
  }
  console.log(`\n  Full results: ${outPath}\n`);

  // Print all issues
  const issueResults = results.filter(r => r.analysis.issues.length > 0);
  if (issueResults.length > 0) {
    console.log(`\n  ISSUES DETAIL:`);
    console.log(`  ${'─'.repeat(56)}`);
    for (const r of issueResults) {
      console.log(`\n  ${r.id} [${r.analysis.verdict}] — ${r.description}`);
      console.log(`  Input: "${r.input.substring(0, 80)}${r.input.length > 80 ? '...' : ''}"`);
      console.log(`  Got type: ${r.response.type} (expected: ${r.expectedType || 'any'})`);
      for (const issue of r.analysis.issues) {
        console.log(`    → ${issue}`);
      }
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
