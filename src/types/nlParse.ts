/**
 * NL Parse Types
 *
 * Contract between the nl-parse Supabase Edge Function and the frontend.
 * Claude extracts structured data from natural language — all financial
 * calculations happen client-side in the existing engine.
 */

// ── Edge Function Request ──────────────────────────────────────────

export interface NLParseRequest {
  message: string;
  conversationHistory: ChatMessage[];
  currentPlan: CurrentPlanState | null;
}

export interface CurrentPlanState {
  investmentProfile: {
    depositPool: number;
    annualSavings: number;
    baseSalary: number;
    timelineYears: number;
    equityGoal: number;
    cashflowGoal: number;
    /** v4 strategy preset selected by the BA. Drives chatbot cell selection. */
    strategyPreset?: 'eg-low' | 'eg-high' | 'cf-low' | 'cf-high' | 'commercial-transition';
  };
  properties: Array<{
    instanceId: string;
    type: string;
    purchasePrice: number;
    state: string;
    period: number;
    growthAssumption: 'High' | 'Medium' | 'Low';
    loanProduct: 'IO' | 'PI';
    lvr: number;
    /** v4 mode of the cell ("Growth"/"Cashflow" for residential; "HighCost"/"LowCost" for Commercial). */
    mode?: 'Growth' | 'Cashflow' | 'HighCost' | 'LowCost';
  }>;
  clientNames: string[];
}

// ── Edge Function Response ─────────────────────────────────────────

export interface NLParseResponse {
  type: 'initial_plan' | 'modification' | 'explanation' | 'comparison' | 'add_event' | 'property_suggestions';

  // For initial_plan — client financial details
  clientProfile?: {
    members: Array<{ name: string; annualIncome: number }>;
    monthlySavings: number;
    currentDeposit: number;
    // Borrowing capacity / max loan / pre-approval amount in AUD.
    borrowingCapacity?: number;
    // Existing property debt (e.g. PPOR mortgage + IP loans) in AUD.
    // 0 = confirmed no existing debt. Undefined = BA didn't mention.
    existingPropertyDebt?: number;
    // Existing property equity (usable equity across PPOR + IPs) in AUD.
    // 0 = confirmed no existing equity. Undefined = BA didn't mention.
    existingPropertyEquity?: number;
  };

  // For initial_plan — mapped to InvestmentProfileData
  investmentProfile?: {
    depositPool: number;
    annualSavings: number;
    baseSalary: number; // Highest earner for serviceability
    timelineYears: number;
    equityGoal?: number;
    cashflowGoal?: number;
    targetPassiveIncome?: number;
  };

  // For initial_plan — property sequence
  properties?: Array<{
    type: string; // v4 cell ID (e.g. "metro-house-growth"). Legacy v3 keys still accepted.
    /** v4 mode of the cell. If omitted, the cell's default mode is used. */
    mode?: 'Growth' | 'Cashflow' | 'HighCost' | 'LowCost';
    purchasePrice: number;
    state: string; // NSW, VIC, QLD, SA, WA, TAS, NT, ACT
    growthAssumption: 'High' | 'Medium' | 'Low';
    loanProduct: 'IO' | 'PI';
    lvr: number; // 0-100 (e.g. 80, 88, 90)
    rentPerWeek?: number;
    targetPeriod?: number; // Preferred timing (period number, semi-annual)
  }>;

  // For modification — what to change (single or multiple)
  modification?: {
    target: string; // e.g. "property-2", "savings", "interest-rate"
    action: string; // e.g. "move", "change", "add", "remove"
    params: Record<string, unknown>;
  };

  // For compound modifications — multiple changes at once
  modifications?: Array<{
    target: string;
    action: string;
    params: Record<string, unknown>;
  }>;

  // For explanation — what to look up
  explanation?: {
    question: string;
    relevantPeriods: number[];
    relevantProperties: string[];
    relevantPeriod?: { startYear: number; endYear: number };
  };

  // For comparison — "what if" scenario fork
  comparison?: {
    description: string; // e.g. "Brisbane instead of Melbourne for property 3"
    changes: Array<{
      target: string;
      field: string;
      from: string | number;
      to: string | number;
    }>;
  };

  // Always present
  message: string; // Conversational response for the chat
  assumptions: string[]; // What was assumed (shown in confirmation)
  followUpSuggestions?: string[]; // Optional suggested next prompts

  // Material inputs the BA did NOT provide — used to flag rows in amber and
  // surface a "for greater accuracy, share X" nudge. Canonical keys:
  // 'income' | 'savings' | 'deposit' | 'borrowing_capacity' | 'goal' | 'existing_debt'
  missingInputs?: string[];

  // For property_suggestions — AI-suggested property cards
  propertySuggestions?: Array<{
    propertyType: string;
    label: string;
    price: string;
    yield: string;
    reason: string;
    prompt: string;
  }>;

  // For add_event — timeline events (refinance, salary change, sell, rate change)
  event?: {
    eventType: 'refinance' | 'salary_change' | 'sell_property' | 'interest_rate_change';
    targetYear: number;
    parameters: Record<string, unknown>;
  };

  /** Strategy preset selected (or confirmed) by the chatbot. Drives cell selection. */
  strategyPreset?: 'eg-low' | 'eg-high' | 'cf-low' | 'cf-high' | 'commercial-transition';

  // Post-plan refinement options — contextual buttons shown after initial plan generation
  refinementOptions?: Array<{
    label: string; // Short label (4-6 words)
    prompt: string; // Full message to send when clicked
  }>;
}

// ── Chat UI Types ──────────────────────────────────────────────────

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export type ChatMessageType =
  | 'text'
  | 'summary-card'
  | 'portfolio-card'
  | 'micro-confirmation'
  | 'option-cards'
  | 'loading';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  type: ChatMessageType;
  content: string;
  timestamp: number;

  // Structured content for non-text messages
  summaryCard?: SummaryCardData;
  portfolioCard?: PortfolioCardData;
  microConfirmation?: MicroConfirmationData;
  optionCards?: ChatOptionCardData[];
  assumptions?: string[];
  missingInputs?: string[];
  followUpSuggestions?: string[];
  refinementOptions?: Array<{ label: string; prompt: string }>;
  showRefinement?: boolean;
}

export interface SummaryCardData {
  income: string; // e.g. "$120k + $120k ($240k combined)"
  borrowingCapacity: string; // e.g. "$1M" or "Not provided"
  savings: string; // e.g. "$3,500/mo ($42k/yr)"
  availableDeposit: string; // e.g. "$80,000"
  existingPropertyDebt: string; // e.g. "$0", "$450k" or "Not provided"
  existingPropertyEquity: string; // e.g. "$0", "$500k" or "Not provided"
  // Card-row keys whose values were inferred or missing. Rows matching these
  // keys render with an amber background. Valid keys: 'income' | 'savings' |
  // 'availableDeposit' | 'borrowingCapacity' | 'existingPropertyDebt' |
  // 'existingPropertyEquity'
  missingFields?: string[];
}

export interface PortfolioCardData {
  properties: Array<{
    label: string; // e.g. "Property 1"
    description: string; // e.g. "~$650k in VIC, high-growth, IO"
  }>;
}

export interface MicroConfirmationData {
  members: Array<{ name: string; income: string }>;
  savings: string;
}

export interface ChatOptionCardData {
  id: string;
  icon: 'arrow-down' | 'arrow-up' | 'zap' | 'refresh' | 'plus' | 'minus';
  label: string; // e.g. "Lower purchase price"
  description: string; // e.g. "Drop to $380k — affordable by mid-2026"
  actionPayload: Record<string, unknown>; // Applied when clicked
}
