/**
 * Validation Layer — Tier 2 Architecture
 *
 * Business rule validation between AI output and frontend.
 * Catches and auto-fixes obviously wrong data before it hits the dashboard.
 * Returns warnings for anything it fixed so the user knows.
 */

const VALID_CELL_IDS = [
  'metro-house-growth', 'metro-house-cashflow',
  'regional-house-growth', 'regional-house-cashflow',
  'metro-unit-growth', 'metro-unit-cashflow',
  'regional-unit-growth', 'regional-unit-cashflow',
  'commercial-high-cost', 'commercial-low-cost',
];

const VALID_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

const VALID_GROWTH = ['High', 'Medium', 'Low'];
const VALID_LOAN = ['IO', 'PI'];
const VALID_PRESETS = ['eg-low', 'eg-high', 'cf-low', 'cf-high', 'commercial-transition'];

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  data: Record<string, unknown>;
}

// ── Property validation ────────────────────────────────────────────

function validateProperty(
  prop: Record<string, unknown>,
  index: number,
): { warnings: string[]; fixed: Record<string, unknown> } {
  const warnings: string[] = [];
  const fixed = { ...prop };

  // Cell type
  if (!VALID_CELL_IDS.includes(fixed.type as string)) {
    // Try to fuzzy-match
    const lower = (fixed.type as string || '').toLowerCase().replace(/\s+/g, '-');
    const match = VALID_CELL_IDS.find(c => c.includes(lower) || lower.includes(c));
    if (match) {
      warnings.push(`Property ${index + 1}: auto-corrected internal classification`);
      fixed.type = match;
    } else {
      warnings.push(`Property ${index + 1}: auto-corrected to default classification`);
      fixed.type = 'regional-house-growth';
    }
  }

  // State
  if (!VALID_STATES.includes(fixed.state as string)) {
    const upper = (fixed.state as string || '').toUpperCase();
    if (VALID_STATES.includes(upper)) {
      fixed.state = upper;
    } else {
      warnings.push(`Property ${index + 1}: auto-corrected default location`);
      fixed.state = 'QLD';
    }
  }

  // Price bounds
  const price = fixed.purchasePrice as number;
  const isCommercial = (fixed.type as string).startsWith('commercial');
  const minPrice = 250_000;
  const maxPrice = isCommercial ? 5_000_000 : 2_000_000;
  if (typeof price !== 'number' || price < minPrice) {
    warnings.push(`Property ${index + 1}: price ${price} below minimum, clamped to $${minPrice.toLocaleString()}`);
    fixed.purchasePrice = minPrice;
  } else if (price > maxPrice) {
    warnings.push(`Property ${index + 1}: price ${price} above maximum, clamped to $${maxPrice.toLocaleString()}`);
    fixed.purchasePrice = maxPrice;
  }

  // LVR bounds
  const lvr = fixed.lvr as number;
  if (typeof lvr !== 'number' || lvr < 50) {
    warnings.push(`Property ${index + 1}: LVR ${lvr} too low, set to 80`);
    fixed.lvr = 80;
  } else if (lvr > 95) {
    warnings.push(`Property ${index + 1}: LVR ${lvr} too high, clamped to 95`);
    fixed.lvr = 95;
  }

  // Growth assumption
  if (!VALID_GROWTH.includes(fixed.growthAssumption as string)) {
    fixed.growthAssumption = 'Medium';
  }

  // Loan product
  if (!VALID_LOAN.includes(fixed.loanProduct as string)) {
    fixed.loanProduct = 'IO';
  }

  return { warnings, fixed };
}

// ── create_plan validation ─────────────────────────────────────────

export function validateCreatePlan(data: Record<string, unknown>): ValidationResult {
  const warnings: string[] = [];
  const fixed = { ...data };

  // Validate properties
  const properties = fixed.properties as Array<Record<string, unknown>>;
  if (!Array.isArray(properties) || properties.length === 0) {
    return { valid: false, warnings: ['No properties in plan'], data: fixed };
  }

  const fixedProperties = properties.map((p, i) => {
    const result = validateProperty(p, i);
    warnings.push(...result.warnings);
    return result.fixed;
  });
  fixed.properties = fixedProperties;

  // Validate strategy preset
  if (!VALID_PRESETS.includes(fixed.strategyPreset as string)) {
    fixed.strategyPreset = 'eg-low';
    warnings.push('Invalid strategy preset, defaulting to eg-low');
  }

  // Validate investment profile
  const ip = fixed.investmentProfile as Record<string, unknown> | undefined;
  if (ip) {
    if (typeof ip.baseSalary === 'number' && ip.baseSalary <= 0) {
      warnings.push('Base salary <= 0, setting to 90000 (AU average)');
      ip.baseSalary = 90000;
    }
    if (typeof ip.depositPool === 'number' && ip.depositPool < 0) {
      ip.depositPool = 0;
    }
    if (typeof ip.annualSavings === 'number' && ip.annualSavings < 0) {
      ip.annualSavings = 0;
    }
    if (typeof ip.timelineYears === 'number' && (ip.timelineYears < 1 || ip.timelineYears > 40)) {
      warnings.push(`Timeline ${ip.timelineYears} years out of range, clamped to 1-40`);
      ip.timelineYears = Math.max(1, Math.min(40, ip.timelineYears as number));
    }
  }

  // Validate client profile
  const cp = fixed.clientProfile as Record<string, unknown> | undefined;
  if (cp && Array.isArray(cp.members)) {
    for (const member of cp.members as Array<Record<string, unknown>>) {
      if (typeof member.annualIncome === 'number' && member.annualIncome < 0) {
        member.annualIncome = 0;
      }
    }
    if (typeof cp.monthlySavings === 'number' && cp.monthlySavings < 0) {
      cp.monthlySavings = 0;
    }
    if (typeof cp.currentDeposit === 'number' && cp.currentDeposit < 0) {
      cp.currentDeposit = 0;
    }
  }

  return { valid: true, warnings, data: fixed };
}

// ── modify_plan validation ─────────────────────────────────────────

export function validateModifyPlan(
  data: Record<string, unknown>,
  currentProperties: Array<Record<string, unknown>>,
): ValidationResult {
  const warnings: string[] = [];
  const fixed = { ...data };

  const mods = (fixed.modifications as Array<Record<string, unknown>>) ||
               (fixed.modification ? [fixed.modification as Record<string, unknown>] : []);

  for (const mod of mods) {
    const target = mod.target as string;

    // Validate property index exists
    if (target?.startsWith('property-')) {
      const idx = parseInt(target.replace('property-', ''), 10) - 1;
      if (idx < 0 || idx >= currentProperties.length) {
        warnings.push(`Target "${target}" out of range (plan has ${currentProperties.length} properties)`);
      }
    }

    // Validate params
    const params = mod.params as Record<string, unknown> | undefined;
    if (params) {
      if (typeof params.purchasePrice === 'number') {
        if (params.purchasePrice < 250_000) {
          warnings.push(`Price ${params.purchasePrice} below minimum, clamped to $250,000`);
          params.purchasePrice = 250_000;
        }
        if (params.purchasePrice > 5_000_000) {
          warnings.push(`Price ${params.purchasePrice} above maximum, clamped to $5,000,000`);
          params.purchasePrice = 5_000_000;
        }
      }
      if (typeof params.lvr === 'number') {
        params.lvr = Math.max(50, Math.min(95, params.lvr));
      }
      if (params.state && !VALID_STATES.includes(params.state as string)) {
        const upper = (params.state as string).toUpperCase();
        if (VALID_STATES.includes(upper)) {
          params.state = upper;
        } else {
          warnings.push(`Property: auto-corrected invalid location`);
        }
      }
    }
  }

  // Validate added properties
  if (Array.isArray(fixed.properties)) {
    const fixedProperties = (fixed.properties as Array<Record<string, unknown>>).map((p, i) => {
      const result = validateProperty(p, i);
      warnings.push(...result.warnings);
      return result.fixed;
    });
    fixed.properties = fixedProperties;
  }

  return { valid: true, warnings, data: fixed };
}

// ── update_profile validation ──────────────────────────────────────

export function validateUpdateProfile(data: Record<string, unknown>): ValidationResult {
  const warnings: string[] = [];
  const fixed = { ...data };
  const updates = fixed.profileUpdates as Record<string, unknown> | undefined;

  if (!updates || Object.keys(updates).length === 0) {
    return { valid: false, warnings: ['No profile updates provided'], data: fixed };
  }

  // All numeric fields should be non-negative
  const numericFields = [
    'baseSalary', 'annualSavings', 'depositPool', 'borrowingCapacity',
    'equityGoal', 'cashflowGoal', 'existingPropertyDebt',
    'existingPropertyEquity', 'targetPassiveIncome',
  ];
  for (const field of numericFields) {
    if (typeof updates[field] === 'number' && (updates[field] as number) < 0) {
      warnings.push(`${field} was negative, set to 0`);
      updates[field] = 0;
    }
  }

  // Timeline bounds
  if (typeof updates.timelineYears === 'number') {
    updates.timelineYears = Math.max(1, Math.min(40, updates.timelineYears as number));
  }

  return { valid: true, warnings, data: fixed };
}

// ── add_event validation ───────────────────────────────────────────

export function validateAddEvent(data: Record<string, unknown>): ValidationResult {
  const warnings: string[] = [];
  const fixed = { ...data };
  const event = fixed.event as Record<string, unknown> | undefined;

  if (!event) {
    return { valid: false, warnings: ['No event data'], data: fixed };
  }

  const validEventTypes = ['refinance', 'salary_change'];
  if (!validEventTypes.includes(event.eventType as string)) {
    warnings.push(`Unsupported event type "${event.eventType}"`);
    return { valid: false, warnings, data: fixed };
  }

  const currentYear = new Date().getFullYear();
  if (typeof event.targetYear === 'number') {
    if (event.targetYear < currentYear) {
      warnings.push(`Event year ${event.targetYear} is in the past, set to ${currentYear + 1}`);
      event.targetYear = currentYear + 1;
    }
    if (event.targetYear > currentYear + 40) {
      warnings.push(`Event year ${event.targetYear} too far out, capped at ${currentYear + 40}`);
      event.targetYear = currentYear + 40;
    }
  }

  return { valid: true, warnings, data: fixed };
}
