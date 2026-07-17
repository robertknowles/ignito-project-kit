/**
 * Tool Definitions — Tier 2 Architecture
 *
 * Six tools the AI can choose from. Each maps to one frontend response type.
 * The AI reads the message + current state and picks the right tool.
 * No classifier step — tool selection replaces intent routing.
 *
 * Tool → Frontend Type mapping:
 *   create_plan       → initial_plan
 *   modify_plan       → modification
 *   update_profile    → update_profile
 *   add_event         → add_event
 *   suggest_properties → property_suggestions
 *   respond           → explanation | conversation
 */

// ── create_plan ────────────────────────────────────────────────────

export const CREATE_PLAN_TOOL = {
  name: 'create_plan',
  description: `Generate a new property investment plan from a client brief. Use when the BA describes a new client's financial situation. NEVER use when a plan already exists — unless the BA explicitly says "start fresh", "new plan", or "rebuild". IMPORTANT: When proposing 3+ properties on ≤$1.5M borrowing capacity, set entity to "trust" on properties 2+ to avoid serviceability blocks. Mention this in the message.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      clientProfile: {
        type: 'object' as const,
        properties: {
          members: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                name: { type: 'string' as const },
                annualIncome: { type: 'number' as const },
              },
              required: ['name', 'annualIncome'],
            },
          },
          monthlySavings: { type: 'number' as const },
          currentDeposit: { type: 'number' as const },
          borrowingCapacity: { type: 'number' as const },
          existingPropertyDebt: { type: 'number' as const },
          existingPropertyEquity: { type: 'number' as const },
          existingPortfolio: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                address: { type: 'string' as const },
                state: { type: 'string' as const },
                boughtYear: { type: 'number' as const },
                purchasePrice: { type: 'number' as const },
                currentValue: { type: 'number' as const },
                loan: { type: 'number' as const },
                rentPerWeek: { type: 'number' as const },
                interestRate: { type: 'number' as const },
                loanType: { type: 'string' as const },
                allowEquityRelease: { type: 'boolean' as const },
                saleYear: { type: 'number' as const },
                entity: { type: 'string' as const, enum: ['individual', 'trust', 'company', 'smsf'], description: 'Ownership structure of this EXISTING property. "Personal" on a form = "individual". NEVER put an ownership word in loanType — loanType is strictly IO or PI.' },
                isNewBuild: { type: 'boolean' as const },
              },
              required: ['state', 'purchasePrice', 'currentValue', 'loan'],
            },
          },
        },
        required: ['members', 'monthlySavings', 'currentDeposit'],
      },
      investmentProfile: {
        type: 'object' as const,
        properties: {
          depositPool: { type: 'number' as const },
          annualSavings: { type: 'number' as const },
          baseSalary: { type: 'number' as const },
          timelineYears: { type: 'number' as const },
          timelineYearsExplicit: { type: 'boolean' as const },
          equityGoal: { type: 'number' as const },
          cashflowGoal: { type: 'number' as const },
          targetPassiveIncome: { type: 'number' as const },
          interestRate: { type: 'number' as const, description: 'Portfolio-wide modelling interest rate as a percentage (e.g. 6.5). ONLY when the strategy or brief states one — omit otherwise.' },
          vacancyRate: { type: 'number' as const, description: 'Vacancy as a fraction of annual rent (e.g. 0.04 for ~2 weeks/yr). ONLY when stated — omit otherwise.' },
          rentEscalationRate: { type: 'number' as const, description: 'Annual rent growth as a fraction (e.g. 0.03 for 3%). ONLY when stated — omit otherwise.' },
          useExistingEquity: { type: 'boolean' as const, description: 'Set false ONLY when the brief or company strategy explicitly says NOT to use the client\'s existing equity ("don\'t refinance the family home", "leave the existing equity alone", "cash savings only"). Set true when they explicitly say to use it. Omit when unstated — equity release is on by default.' },
        },
        required: ['depositPool', 'annualSavings', 'baseSalary', 'timelineYears'],
      },
      properties: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            type: { type: 'string' as const, description: 'v4 cell ID (e.g. metro-house-growth)' },
            mode: { type: 'string' as const, enum: ['Growth', 'Cashflow', 'HighCost', 'LowCost'] },
            purchasePrice: { type: 'number' as const },
            state: { type: 'string' as const },
            growthAssumption: { type: 'string' as const, enum: ['High', 'Medium', 'Low'] },
            loanProduct: { type: 'string' as const, enum: ['IO', 'PI'] },
            lvr: { type: 'number' as const },
            lmiCapitalized: { type: 'boolean' as const },
            rentPerWeek: { type: 'number' as const },
            targetPeriod: { type: 'number' as const },
            entity: { type: 'string' as const, enum: ['individual', 'trust', 'company', 'smsf'], description: 'REQUIRED for properties 2+ when total loans exceed borrowing capacity or when proposing 3+ properties on ≤$1.5M capacity. Set to "trust" to reduce serviceability impact by 75%. Property 1 = "individual", properties 2+ = "trust".' },
            interestRate: { type: 'number' as const, description: 'Annual interest rate as a percentage (e.g. 6.5). ONLY when the strategy or brief states a modelling/assessment rate — omit otherwise.' },
            ioTermYears: { type: 'number' as const, description: 'Years of Interest Only before rolling to P&I. ONLY when stated (e.g. "IO for 7 years") — omit otherwise (default 5).' },
            engagementFee: { type: 'number' as const, description: "The firm's BA/engagement fee for this purchase in dollars. ONLY when the company strategy or brief states a fee. If stated as a % of price, compute the dollar amount." },
            propertyManagementPercent: { type: 'number' as const, description: 'Property management fee as a % of rent (e.g. 7 for 7%). ONLY when stated — omit otherwise.' },
            valuationAtPurchase: { type: 'number' as const, description: 'Market value at purchase when the strategy says the firm buys under market value (e.g. "10% under market" on a $315k purchase → 350000). Omit otherwise (defaults to purchasePrice).' },
            isNewBuild: { type: 'boolean' as const, description: 'true for new builds / house-and-land, false or omitted for established.' },
            stampDutyOverride: { type: 'number' as const, description: 'Stated stamp duty budget for this purchase in dollars. ONLY when the strategy/brief states a duty figure or concession — omit to use the state calculation.' },
            conveyancing: { type: 'number' as const, description: 'Stated conveyancing/legals cost in dollars. ONLY when stated — omit otherwise.' },
            purchaseCostsTotal: { type: 'number' as const, description: 'Lump upfront FEES in dollars (BA fee + inspections + legals + mortgage/insurance fees) when the strategy states a lump costs figure. EXCLUDES stamp duty and deposit — duty is calculated separately (use stampDutyOverride only when a duty figure is explicitly stated). If the stated lump clearly includes duty, put only the non-duty remainder here and say so in assumptions. When a BA fee is ALSO stated separately, this lump REPLACES the whole fee bundle including the BA fee — set it to fee + other costs, never other costs alone. Omit when costs are itemised or unstated.' },
            saleYear: { type: 'number' as const, description: 'Planned sale year when the strategy/brief states a sell-down (e.g. "sell property 2 in 2040"). Omit = hold.' },
          },
          required: ['type', 'purchasePrice', 'state', 'growthAssumption', 'loanProduct', 'lvr'],
        },
      },
      strategyPreset: {
        type: 'string' as const,
        enum: ['eg-low', 'eg-high', 'cf-low', 'cf-high', 'commercial-transition', 'eg-to-cf'],
      },
      missingInputs: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Canonical keys for data the BA did not provide: borrowing_capacity, existing_debt, income, savings, deposit, goal',
      },
      assumptions: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      clientProfileSources: {
        type: 'object' as const,
        description: 'Source for each clientProfile field. Keys match clientProfile field names. Values: "user" (extracted from input), "assumed" (defaulted/inferred), "derived" (calculated).',
        additionalProperties: { type: 'string' as const, enum: ['user', 'assumed', 'derived'] },
      },
      investmentProfileSources: {
        type: 'object' as const,
        description: 'Source for each investmentProfile field. Keys match investmentProfile field names.',
        additionalProperties: { type: 'string' as const, enum: ['user', 'assumed', 'derived'] },
      },
      propertySources: {
        type: 'array' as const,
        description: 'Source map for each property, parallel to the properties array.',
        items: {
          type: 'object' as const,
          additionalProperties: { type: 'string' as const, enum: ['user', 'assumed', 'derived'] },
        },
      },
    },
    required: ['clientProfile', 'investmentProfile', 'properties', 'strategyPreset', 'assumptions', 'clientProfileSources', 'investmentProfileSources', 'propertySources'],
  },
} as const;

// ── modify_plan ────────────────────────────────────────────────────

export const MODIFY_PLAN_TOOL = {
  name: 'modify_plan',
  description: `Modify the existing plan — change a property's price/state/LVR/timing, add or remove a property, or change a profile-level field (savings, income, timeline, goals). Use for ANY concrete change instruction with a clear target and value. ONLY valid when a plan already exists.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      modification: {
        type: 'object' as const,
        description: 'Single modification. Use this OR modifications (not both).',
        properties: {
          target: { type: 'string' as const, description: 'e.g. property-1, property-2, savings, income, timeline, equityGoal, cashflowGoal, portfolio' },
          action: { type: 'string' as const, description: 'move, change, add, remove' },
          params: { type: 'object' as const },
        },
        required: ['target', 'action', 'params'],
      },
      modifications: {
        type: 'array' as const,
        description: 'Multiple modifications in one message. Use this OR modification (not both).',
        items: {
          type: 'object' as const,
          properties: {
            target: { type: 'string' as const },
            action: { type: 'string' as const },
            params: { type: 'object' as const },
          },
          required: ['target', 'action', 'params'],
        },
      },
      properties: {
        type: 'array' as const,
        description: 'For "add" action only — the NEW properties to add.',
        items: {
          type: 'object' as const,
          properties: {
            type: { type: 'string' as const },
            mode: { type: 'string' as const, enum: ['Growth', 'Cashflow', 'HighCost', 'LowCost'] },
            purchasePrice: { type: 'number' as const },
            state: { type: 'string' as const },
            growthAssumption: { type: 'string' as const, enum: ['High', 'Medium', 'Low'] },
            loanProduct: { type: 'string' as const, enum: ['IO', 'PI'] },
            lvr: { type: 'number' as const },
            lmiCapitalized: { type: 'boolean' as const },
            rentPerWeek: { type: 'number' as const },
            targetPeriod: { type: 'number' as const },
            entity: { type: 'string' as const, enum: ['individual', 'trust', 'company', 'smsf'] },
            interestRate: { type: 'number' as const, description: 'Annual interest rate as a percentage — ONLY when stated.' },
            ioTermYears: { type: 'number' as const, description: 'Years of IO before P&I — ONLY when stated.' },
            engagementFee: { type: 'number' as const, description: 'BA/engagement fee in dollars — ONLY when stated.' },
            propertyManagementPercent: { type: 'number' as const, description: 'PM fee as % of rent — ONLY when stated.' },
            valuationAtPurchase: { type: 'number' as const, description: 'Market value at purchase for buy-under-market — omit otherwise.' },
            isNewBuild: { type: 'boolean' as const },
            stampDutyOverride: { type: 'number' as const, description: 'Stated stamp duty in dollars — omit to use the state calculation.' },
            conveyancing: { type: 'number' as const, description: 'Stated conveyancing/legals in dollars — ONLY when stated.' },
            purchaseCostsTotal: { type: 'number' as const, description: 'Lump upfront FEES in dollars, excluding stamp duty and deposit — ONLY when stated as a lump.' },
            saleYear: { type: 'number' as const, description: 'Planned sale year — omit = hold.' },
          },
          required: ['type', 'purchasePrice', 'state', 'growthAssumption', 'loanProduct', 'lvr'],
        },
      },
      assumptions: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
    },
    required: ['assumptions'],
  },
} as const;

// ── update_profile ─────────────────────────────────────────────────

export const UPDATE_PROFILE_TOOL = {
  name: 'update_profile',
  description: `Update client financial details without rebuilding the plan. Use when the BA corrects or adds income, savings, deposit, borrowing capacity, existing property info, or goals. Only include fields being changed. ONLY valid when a plan already exists — if no plan exists, use create_plan instead.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      profileUpdates: {
        type: 'object' as const,
        properties: {
          baseSalary: { type: 'number' as const },
          annualSavings: { type: 'number' as const },
          depositPool: { type: 'number' as const },
          borrowingCapacity: { type: 'number' as const },
          equityGoal: { type: 'number' as const },
          cashflowGoal: { type: 'number' as const },
          timelineYears: { type: 'number' as const },
          existingPropertyDebt: { type: 'number' as const },
          existingPropertyEquity: { type: 'number' as const },
          targetPassiveIncome: { type: 'number' as const },
          interestRate: { type: 'number' as const, description: 'Portfolio-wide modelling interest rate as a percentage — ONLY when stated.' },
          vacancyRate: { type: 'number' as const, description: 'Vacancy as a fraction of annual rent (e.g. 0.04) — ONLY when stated.' },
          rentEscalationRate: { type: 'number' as const, description: 'Annual rent growth as a fraction (e.g. 0.03) — ONLY when stated.' },
          useExistingEquity: { type: 'boolean' as const, description: 'false ONLY when the BA explicitly says NOT to use existing equity ("don\'t refinance the home", "cash only"); true when explicitly told to use it. Omit when unstated.' },
          existingPortfolio: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                address: { type: 'string' as const },
                state: { type: 'string' as const },
                boughtYear: { type: 'number' as const },
                purchasePrice: { type: 'number' as const },
                currentValue: { type: 'number' as const },
                loan: { type: 'number' as const },
                rentPerWeek: { type: 'number' as const },
                interestRate: { type: 'number' as const },
                loanType: { type: 'string' as const },
                allowEquityRelease: { type: 'boolean' as const },
                saleYear: { type: 'number' as const },
                entity: { type: 'string' as const, enum: ['individual', 'trust', 'company', 'smsf'], description: 'Ownership structure of this EXISTING property. "Personal" on a form = "individual". NEVER put an ownership word in loanType — loanType is strictly IO or PI.' },
                isNewBuild: { type: 'boolean' as const },
              },
              required: ['state', 'purchasePrice', 'currentValue', 'loan'],
            },
          },
        },
        description: 'Only include fields being changed.',
      },
      assumptions: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
    },
    required: ['profileUpdates', 'assumptions'],
  },
} as const;

// ── add_event ──────────────────────────────────────────────────────

export const ADD_EVENT_TOOL = {
  name: 'add_event',
  description: `Add a timeline event — refinance or salary change. Only use for concrete events with a specific year. Do NOT use for hypotheticals ("what if rates go up").`,
  input_schema: {
    type: 'object' as const,
    properties: {
      event: {
        type: 'object' as const,
        properties: {
          eventType: {
            type: 'string' as const,
            enum: ['refinance', 'salary_change'],
          },
          targetYear: { type: 'number' as const },
          parameters: { type: 'object' as const },
        },
        required: ['eventType', 'targetYear', 'parameters'],
      },
      assumptions: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
    },
    required: ['event', 'assumptions'],
  },
} as const;

// ── suggest_properties ─────────────────────────────────────────────

export const SUGGEST_PROPERTIES_TOOL = {
  name: 'suggest_properties',
  description: `Suggest 3-4 property options when the BA wants to add a property but hasn't specified what kind. Only use when the request is VAGUE ("add another", "one more", "something with yield"). NEVER mention property type or location in labels, reasons, or messages — describe options by price, growth tier, and yield only.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      propertySuggestions: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            propertyType: { type: 'string' as const, description: 'Internal cell ID — not shown to user' },
            label: { type: 'string' as const, description: 'Describe by financials only e.g. "$480k, High growth" — NO property type or location' },
            price: { type: 'string' as const, description: 'Display price e.g. "$480k"' },
            yield: { type: 'string' as const, description: 'Expected yield range e.g. "4.5-5.2%"' },
            reason: { type: 'string' as const, description: 'Why this fits — reference price, growth, yield. NO type or location.' },
            prompt: { type: 'string' as const, description: 'Message to send if chosen — describe by price and growth only e.g. "Add a $480k property with High growth"' },
          },
          required: ['propertyType', 'label', 'price', 'yield', 'reason', 'prompt'],
        },
      },
      message: {
        type: 'string' as const,
        description: 'Plain-text overview of the options. Do NOT reference buttons, clicking, property types, or locations.',
      },
      assumptions: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
    },
    required: ['propertySuggestions', 'message', 'assumptions'],
  },
} as const;

// ── respond ────────────────────────────────────────────────────────

export const RESPOND_TOOL = {
  name: 'respond',
  description: `Have a conversation — answer questions, clarify ambiguity, acknowledge input, explain plan data. This is the DEFAULT when no plan action is needed. Use for: greetings, follow-up questions, "what if" hypotheticals, clarification requests, acknowledgments, or any message that doesn't require changing data. IMPORTANT: Always give a substantive answer. For hypotheticals ("what if rates go up"), give a directional estimate using the plan data — never deflect with "that's a hypothetical" or "the engine handles that." The BA asked a question; answer it.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      message: {
        type: 'string' as const,
        description: 'Your conversational response, formatted for skim-reading (see Message Formatting). Reading ONLY the bold text must give the complete answer with its key numbers. Bold each fact WITH its context ("**$155,000 salary**", "**cash-flow positive in Year 8**", "**+$722/month pre-tax**") — several per sentence is fine when each is a distinct fact; never bold connective prose, bare numbers, whole sentences, or list-leading year prefixes ("2026:", "Year 10:"). Compact stat bullets are bolded whole ("**Pre-tax cash loss: $6,260/year**"); trajectory/conclusion lines are bolded in full ("**Today: -$724/month → Year 10: +$722/month**"). Any answer with 3+ figures, a projection, or a before/after MUST close with a "What stands out" section of 2-4 bullets.',
      },
      explanation: {
        type: 'object' as const,
        description: 'Optional — include when answering a specific question about plan data.',
        properties: {
          question: { type: 'string' as const },
          relevantPeriods: { type: 'array' as const, items: { type: 'number' as const } },
          relevantProperties: { type: 'array' as const, items: { type: 'string' as const } },
          relevantPeriod: {
            type: 'object' as const,
            properties: {
              startYear: { type: 'number' as const },
              endYear: { type: 'number' as const },
            },
            required: ['startYear', 'endYear'],
          },
        },
        required: ['question'],
      },
      assumptions: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
    },
    required: ['message'],
  },
} as const;

// ── All tools + tool choice ────────────────────────────────────────

export const ALL_TOOLS = [
  CREATE_PLAN_TOOL,
  MODIFY_PLAN_TOOL,
  UPDATE_PROFILE_TOOL,
  ADD_EVENT_TOOL,
  SUGGEST_PROPERTIES_TOOL,
  RESPOND_TOOL,
] as const;

/** Force the model to use one of the tools (but it picks which one) */
export const TOOL_CHOICE = { type: 'any' as const };

/**
 * Map tool name → frontend response type.
 * The AI calls a tool; code wraps the output in the correct type.
 */
export function toolToResponseType(toolName: string): string {
  switch (toolName) {
    case 'create_plan': return 'initial_plan';
    case 'modify_plan': return 'modification';
    case 'update_profile': return 'update_profile';
    case 'add_event': return 'add_event';
    case 'suggest_properties': return 'property_suggestions';
    case 'respond': return 'explanation';
    default: return 'explanation';
  }
}
