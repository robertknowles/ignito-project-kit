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
  }>;
  clientNames: string[];
}

// ── Edge Function Response ─────────────────────────────────────────

export interface NLParseResponse {
  type: 'initial_plan' | 'modification' | 'explanation' | 'comparison';

  // For initial_plan — client financial details
  clientProfile?: {
    members: Array<{ name: string; annualIncome: number }>;
    monthlySavings: number;
    currentDeposit: number;
    existingDebt?: number;
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
    type: string; // Must match property-defaults.json keys (e.g. "units-apartments")
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
  microConfirmation?: MicroConfirmationData;
  optionCards?: ChatOptionCardData[];
  assumptions?: string[];
  followUpSuggestions?: string[];
  refinementOptions?: Array<{ label: string; prompt: string }>;
}

export interface SummaryCardData {
  clients: string; // e.g. "Jane & John"
  income: string; // e.g. "$120k + $120k ($240k combined)"
  savings: string; // e.g. "$3,500/mo ($42k/yr)"
  availableDeposit: string; // e.g. "$80,000"
  properties: Array<{
    label: string; // e.g. "Property 1"
    description: string; // e.g. "~$650k in VIC, high-growth, IO"
  }>;
  ownership: string; // e.g. "Individual (50/50)"
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
