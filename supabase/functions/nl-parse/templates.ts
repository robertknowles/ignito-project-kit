/**
 * Message Templates — Tier 2 Architecture
 *
 * Generates user-facing text from structured data for action responses.
 * The AI never writes these messages — code does. This eliminates the
 * "weird phrasing" class of bugs entirely for plan actions.
 *
 * AI-authored messages are ONLY used for:
 *   - respond tool (conversation / explanation)
 *   - suggest_properties tool (needs to describe options naturally)
 */

// ── Helpers ────────────────────────────────────────────────────────

function formatDollars(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `$${n.toLocaleString()}`;
}

// ── create_plan message ────────────────────────────────────────────

interface CreatePlanData {
  clientProfile: {
    members: Array<{ name: string; annualIncome: number }>;
    borrowingCapacity?: number;
  };
  investmentProfile: {
    depositPool: number;
    annualSavings: number;
    timelineYears: number;
    timelineYearsExplicit?: boolean;
  };
  properties: Array<{
    type: string;
    purchasePrice: number;
    state: string;
    lvr: number;
    lmiCapitalized?: boolean;
    loanProduct: string;
  }>;
  strategyPreset: string;
  missingInputs?: string[];
  assumptions: string[];
}

const PRESET_NAMES: Record<string, string> = {
  'eg-low': 'equity growth, low price point',
  'eg-high': 'equity growth, high price point',
  'cf-low': 'cashflow, low price point',
  'cf-high': 'cashflow, high price point',
  'commercial-transition': 'commercial transition',
};

export function buildCreatePlanMessage(data: CreatePlanData): string {
  const count = data.properties.length;
  const names = data.clientProfile.members.map(m => m.name).filter(n => n && n !== 'Client');
  const nameStr = names.length > 0 ? ` for ${names.join(' & ')}` : '';

  // Price range
  const prices = data.properties.map(p => p.purchasePrice).sort((a, b) => a - b);
  const priceRange = prices.length === 1
    ? `at ${formatDollars(prices[0])}`
    : `from ${formatDollars(prices[0])} to ${formatDollars(prices[prices.length - 1])}`;

  // LVR/LMI
  const lvrs = [...new Set(data.properties.map(p => p.lvr))];
  const lvrStr = lvrs.length === 1 ? `${lvrs[0]}%` : `${Math.min(...lvrs)}-${Math.max(...lvrs)}%`;
  const hasLmi = data.properties.some(p => p.lmiCapitalized);
  const lmiNote = hasLmi ? ' with LMI capitalised' : '';

  // Loan type
  const loanTypes = [...new Set(data.properties.map(p => p.loanProduct))];
  const loanStr = loanTypes.join('/');

  // Preset
  const presetStr = PRESET_NAMES[data.strategyPreset] || data.strategyPreset;

  // Timeline
  const timelineNote = data.investmentProfile.timelineYearsExplicit
    ? ''
    : ` Default 20-year horizon applied.`;

  let msg = `Built a ${count}-property plan${nameStr}, priced ${priceRange}. Modelled at ${lvrStr} LVR${lmiNote} with ${loanStr} loans, biased toward ${presetStr}.${timelineNote}`;

  // Missing inputs nudge
  if (data.missingInputs && data.missingInputs.length > 0) {
    const fieldLabels: Record<string, string> = {
      'borrowing_capacity': 'borrowing capacity',
      'existing_debt': 'existing property details',
      'income': 'income',
      'savings': 'savings',
      'deposit': 'deposit',
      'goal': 'goal',
    };
    const missing = data.missingInputs
      .map(k => fieldLabels[k] || k)
      .slice(0, 2);
    msg += ` For tighter numbers, share ${missing.join(' and ')}.`;
  }

  msg += ' See the dashboard for the engine\'s exact projection.';
  return msg;
}

// ── modify_plan message ────────────────────────────────────────────

interface ModificationEntry {
  target: string;
  action: string;
  params: Record<string, unknown>;
}

function describeModification(mod: ModificationEntry, currentPlan?: Record<string, unknown> | null): string {
  const target = mod.target;
  const action = mod.action;
  const params = mod.params;

  if (action === 'remove') {
    const propNum = target.replace('property-', '');
    return `Removed property ${propNum} from the plan.`;
  }

  if (action === 'add' && target === 'portfolio') {
    return 'Added a new property to the plan.';
  }

  if (action === 'change') {
    // Property changes
    if (target.startsWith('property-')) {
      const propNum = target.replace('property-', '');
      const changes: string[] = [];
      if (params.purchasePrice !== undefined) changes.push(`price to ${formatDollars(params.purchasePrice as number)}`);
      if (params.lvr !== undefined) changes.push(`LVR to ${params.lvr}%`);
      if (params.loanProduct !== undefined) changes.push(`loan type to ${params.loanProduct}`);
      if (params.growthAssumption !== undefined) changes.push(`growth to ${params.growthAssumption}`);
      if (params.rentPerWeek !== undefined) changes.push(`rent to $${params.rentPerWeek}/week`);
      if (params.interestRate !== undefined) changes.push(`interest rate to ${params.interestRate}%`);
      return `Property ${propNum} updated: ${changes.join(', ')}.`;
    }

    // Profile changes
    const fieldLabels: Record<string, string> = {
      savings: 'Annual savings',
      income: 'Income',
      timeline: 'Timeline',
      equityGoal: 'Equity target',
      cashflowGoal: 'Cashflow target',
    };
    const label = fieldLabels[target] || target;
    const value = Object.values(params)[0];
    if (typeof value === 'number') {
      return `${label} updated to ${target === 'timeline' ? `${value} years` : formatDollars(value)}.`;
    }
    return `${label} updated.`;
  }

  if (action === 'move' && target.startsWith('property-')) {
    const propNum = target.replace('property-', '');
    return `Property ${propNum} timing adjusted.`;
  }

  return `Updated ${target}.`;
}

export function buildModifyPlanMessage(
  data: { modification?: ModificationEntry; modifications?: ModificationEntry[] },
): string {
  const mods = data.modifications || (data.modification ? [data.modification] : []);
  if (mods.length === 0) return 'Plan updated.';

  const descriptions = mods.map(m => describeModification(m));
  return descriptions.join(' ') + ' The dashboard reflects the updated numbers.';
}

// ── update_profile message ─────────────────────────────────────────

interface ProfileUpdates {
  baseSalary?: number;
  annualSavings?: number;
  depositPool?: number;
  borrowingCapacity?: number;
  equityGoal?: number;
  cashflowGoal?: number;
  timelineYears?: number;
  existingPropertyDebt?: number;
  existingPropertyEquity?: number;
  targetPassiveIncome?: number;
  existingPortfolio?: unknown[];
}

export function buildUpdateProfileMessage(updates: ProfileUpdates): string {
  const parts: string[] = [];

  const fieldLabels: Record<string, (v: number) => string> = {
    baseSalary: (v) => `income to ${formatDollars(v)}`,
    annualSavings: (v) => `annual savings to ${formatDollars(v)} (${formatDollars(v / 12)}/month)`,
    depositPool: (v) => `deposit pool to ${formatDollars(v)}`,
    borrowingCapacity: (v) => `borrowing capacity to ${formatDollars(v)}`,
    equityGoal: (v) => `equity target to ${formatDollars(v)}`,
    cashflowGoal: (v) => `cashflow target to ${formatDollars(v)}/year`,
    timelineYears: (v) => `timeline to ${v} years`,
    existingPropertyDebt: (v) => `existing debt to ${formatDollars(v)}`,
    existingPropertyEquity: (v) => `existing equity to ${formatDollars(v)}`,
    targetPassiveIncome: (v) => `target passive income to ${formatDollars(v)}/year`,
  };

  for (const [key, formatter] of Object.entries(fieldLabels)) {
    const value = updates[key as keyof ProfileUpdates];
    if (typeof value === 'number') {
      parts.push(formatter(value));
    }
  }

  if (updates.existingPortfolio && updates.existingPortfolio.length > 0) {
    parts.push(`existing portfolio (${updates.existingPortfolio.length} ${updates.existingPortfolio.length === 1 ? 'property' : 'properties'})`);
  }

  if (parts.length === 0) return 'Profile updated. The dashboard reflects the new numbers.';

  return `Updated ${parts.join(', ')}. The dashboard reflects the new numbers.`;
}

// ── add_event message ──────────────────────────────────────────────

interface EventData {
  eventType: string;
  targetYear: number;
  parameters: Record<string, unknown>;
}

export function buildAddEventMessage(event: EventData): string {
  if (event.eventType === 'refinance') {
    const rate = event.parameters.newRate;
    const propIdx = event.parameters.propertyIndex;
    const propNum = typeof propIdx === 'number' ? propIdx + 1 : '?';
    return `Added refinance event for property ${propNum} in ${event.targetYear}${rate ? ` at ${rate}%` : ''}. The dashboard shows the projected impact.`;
  }

  if (event.eventType === 'salary_change') {
    const salary = event.parameters.newSalary;
    const member = event.parameters.member || 'primary';
    return `Added salary change to ${typeof salary === 'number' ? formatDollars(salary) : 'new amount'} for ${member} earner in ${event.targetYear}. The dashboard shows the projected impact.`;
  }

  return `Added ${event.eventType} event in ${event.targetYear}. The dashboard shows the projected impact.`;
}
