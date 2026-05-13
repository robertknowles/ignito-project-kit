/**
 * Eval suite types — defines test cases and assertion results.
 */

export interface TestCase {
  id: string;
  name: string;
  /** Which tier this test belongs to (from demo testing notes) */
  tier: 'A' | 'B' | 'C' | 'D' | 'demo' | 'regression';
  /** The user message to send */
  message: string;
  /** Optional conversation history (for follow-up tests) */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Optional current plan state (for modification/explanation tests) */
  currentPlan?: CurrentPlanStateForEval | null;
  /** Strategy preset to use */
  strategyPreset?: string;
  /** Assertions to check against the response */
  assertions: Assertion[];
}

export interface CurrentPlanStateForEval {
  investmentProfile: {
    depositPool: number;
    annualSavings: number;
    baseSalary: number;
    timelineYears: number;
    equityGoal: number;
    cashflowGoal: number;
    strategyPreset?: string;
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
    mode?: string;
  }>;
  clientNames: string[];
  enginePlanState?: {
    horizonYear: number;
    projectedPortfolioValue: number;
    projectedEquity: number;
    projectedAnnualCashflow?: number;
    equityGoalReachedYear: number | null;
  };
}

export type AssertionOp =
  | 'equals'
  | 'includes'
  | 'not_includes'
  | 'greater_than'
  | 'less_than'
  | 'range'
  | 'exists'
  | 'not_exists'
  | 'length'
  | 'length_gte'
  | 'length_lte'
  | 'one_of';

export interface Assertion {
  /** Dot-notation path into the response object, e.g. "type", "clientProfile.monthlySavings", "properties.0.state" */
  path: string;
  op: AssertionOp;
  /** Expected value (for equals, includes, greater_than, less_than, one_of) */
  expected?: unknown;
  /** For range: [min, max] inclusive */
  range?: [number, number];
  /** Human-readable description of what this assertion checks */
  description: string;
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  actual: unknown;
  message: string;
}

export interface ModelGrade {
  coherence: number;
  relevance: number;
  tone: number;
  overall: number;
  reasoning: string;
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  assertions: AssertionResult[];
  passedCount: number;
  failedCount: number;
  responseTimeMs: number;
  rawResponse?: unknown;
  classifiedIntent?: string;
  modelGrade?: ModelGrade;
  error?: string;
}

export interface EvalReport {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
  assertionPassRate: number;
  averageResponseTimeMs: number;
  results: TestResult[];
}
