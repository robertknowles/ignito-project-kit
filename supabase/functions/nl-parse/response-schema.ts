/**
 * Structured output tool definition for NLParseResponse.
 *
 * Uses Anthropic's tool_use with forced tool_choice to guarantee the model
 * returns valid, schema-conformant JSON. The model "calls" a tool named
 * `respond` whose input schema matches NLParseResponse — we extract the
 * tool input as our structured response.
 *
 * This eliminates the entire class of "malformed JSON" bugs and removes the
 * need for fallback parsing (raw JSON → markdown extraction → text wrap).
 *
 * Keep in sync with src/types/nlParse.ts NLParseResponse interface.
 */

export const RESPONSE_TOOL = {
  name: "respond",
  description: "Return the structured response to the user's message. Always use this tool to respond.",
  input_schema: {
    type: "object" as const,
    properties: {
      type: {
        type: "string" as const,
        enum: [
          "initial_plan",
          "modification",
          "explanation",
          "comparison",
          "add_event",
          "property_suggestions",
          "update_profile",
        ],
        description: "The response intent type",
      },

      // Always present
      message: {
        type: "string" as const,
        description: "Conversational response for the chat",
      },
      assumptions: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "What was assumed (shown in confirmation)",
      },

      // initial_plan — client financial details
      clientProfile: {
        type: "object" as const,
        properties: {
          members: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                name: { type: "string" as const },
                annualIncome: { type: "number" as const },
              },
              required: ["name", "annualIncome"],
            },
          },
          monthlySavings: { type: "number" as const },
          currentDeposit: { type: "number" as const },
          borrowingCapacity: { type: "number" as const },
          existingPropertyDebt: { type: "number" as const },
          existingPropertyEquity: { type: "number" as const },
          existingProperties: { type: "string" as const },
          existingPortfolio: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                address: { type: "string" as const },
                state: { type: "string" as const },
                boughtYear: { type: "number" as const },
                purchasePrice: { type: "number" as const },
                currentValue: { type: "number" as const },
                loan: { type: "number" as const },
                rentPerWeek: { type: "number" as const },
                interestRate: { type: "number" as const },
                loanType: { type: "string" as const },
                allowEquityRelease: { type: "boolean" as const },
              },
              required: ["state", "purchasePrice", "currentValue", "loan"],
            },
          },
        },
        required: ["members", "monthlySavings", "currentDeposit"],
      },

      // initial_plan — mapped to InvestmentProfileData
      investmentProfile: {
        type: "object" as const,
        properties: {
          depositPool: { type: "number" as const },
          annualSavings: { type: "number" as const },
          baseSalary: { type: "number" as const },
          timelineYears: { type: "number" as const },
          timelineYearsExplicit: { type: "boolean" as const },
          equityGoal: { type: "number" as const },
          cashflowGoal: { type: "number" as const },
          targetPassiveIncome: { type: "number" as const },
        },
        required: ["depositPool", "annualSavings", "baseSalary", "timelineYears"],
      },

      // initial_plan + modification (add) — property sequence
      properties: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            type: { type: "string" as const, description: "v4 cell ID (e.g. metro-house-growth)" },
            mode: {
              type: "string" as const,
              enum: ["Growth", "Cashflow", "HighCost", "LowCost"],
            },
            purchasePrice: { type: "number" as const },
            state: { type: "string" as const },
            growthAssumption: {
              type: "string" as const,
              enum: ["High", "Medium", "Low"],
            },
            loanProduct: {
              type: "string" as const,
              enum: ["IO", "PI"],
            },
            lvr: { type: "number" as const },
            lmiCapitalized: { type: "boolean" as const },
            rentPerWeek: { type: "number" as const },
            targetPeriod: { type: "number" as const },
            entity: {
              type: "string" as const,
              enum: ["individual", "trust", "company", "smsf"],
              description: "Ownership entity. Use trust when serviceability is tight (trust debt discounted 30% for serviceability). Default: individual.",
            },
          },
          required: ["type", "purchasePrice", "state", "growthAssumption", "loanProduct", "lvr"],
        },
      },

      // modification — single change
      modification: {
        type: "object" as const,
        properties: {
          target: { type: "string" as const },
          action: { type: "string" as const },
          params: { type: "object" as const },
        },
        required: ["target", "action", "params"],
      },

      // modification — compound changes
      modifications: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            target: { type: "string" as const },
            action: { type: "string" as const },
            params: { type: "object" as const },
          },
          required: ["target", "action", "params"],
        },
      },

      // explanation — what to look up
      explanation: {
        type: "object" as const,
        properties: {
          question: { type: "string" as const },
          relevantPeriods: {
            type: "array" as const,
            items: { type: "number" as const },
          },
          relevantProperties: {
            type: "array" as const,
            items: { type: "string" as const },
          },
          relevantPeriod: {
            type: "object" as const,
            properties: {
              startYear: { type: "number" as const },
              endYear: { type: "number" as const },
            },
            required: ["startYear", "endYear"],
          },
        },
        required: ["question"],
      },

      // comparison — scenario fork
      comparison: {
        type: "object" as const,
        properties: {
          description: { type: "string" as const },
          changes: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                target: { type: "string" as const },
                field: { type: "string" as const },
                from: {},
                to: {},
              },
              required: ["target", "field", "from", "to"],
            },
          },
        },
        required: ["description", "changes"],
      },

      // add_event — timeline events
      event: {
        type: "object" as const,
        properties: {
          eventType: {
            type: "string" as const,
            enum: ["refinance", "salary_change", "sell_property", "interest_rate_change"],
          },
          targetYear: { type: "number" as const },
          parameters: { type: "object" as const },
        },
        required: ["eventType", "targetYear", "parameters"],
      },

      // update_profile — partial profile field updates
      profileUpdates: {
        type: "object" as const,
        properties: {
          baseSalary: { type: "number" as const },
          annualSavings: { type: "number" as const },
          depositPool: { type: "number" as const },
          borrowingCapacity: { type: "number" as const },
          equityGoal: { type: "number" as const },
          cashflowGoal: { type: "number" as const },
          timelineYears: { type: "number" as const },
          existingPropertyDebt: { type: "number" as const },
          existingPropertyEquity: { type: "number" as const },
          targetPassiveIncome: { type: "number" as const },
          existingPortfolio: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                address: { type: "string" as const },
                state: { type: "string" as const },
                boughtYear: { type: "number" as const },
                purchasePrice: { type: "number" as const },
                currentValue: { type: "number" as const },
                loan: { type: "number" as const },
                rentPerWeek: { type: "number" as const },
                interestRate: { type: "number" as const },
                loanType: { type: "string" as const },
                allowEquityRelease: { type: "boolean" as const },
              },
              required: ["state", "purchasePrice", "currentValue", "loan"],
            },
          },
        },
        description: "Partial profile updates for update_profile responses. Only include fields being changed.",
      },

      // Strategy preset
      strategyPreset: {
        type: "string" as const,
        enum: ["eg-low", "eg-high", "cf-low", "cf-high", "commercial-transition"],
      },

      // Per-field confidence/source tagging (initial_plan)
      clientProfileSources: {
        type: "object" as const,
        description: "Source for each clientProfile field. Values: user | assumed | derived.",
        additionalProperties: { type: "string" as const, enum: ["user", "assumed", "derived"] },
      },
      investmentProfileSources: {
        type: "object" as const,
        description: "Source for each investmentProfile field.",
        additionalProperties: { type: "string" as const, enum: ["user", "assumed", "derived"] },
      },
      propertySources: {
        type: "array" as const,
        description: "Source map for each property, parallel to properties array.",
        items: {
          type: "object" as const,
          additionalProperties: { type: "string" as const, enum: ["user", "assumed", "derived"] },
        },
      },

      // Optional arrays
      missingInputs: {
        type: "array" as const,
        items: { type: "string" as const },
      },
      propertySuggestions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            propertyType: { type: "string" as const },
            label: { type: "string" as const },
            price: { type: "string" as const },
            yield: { type: "string" as const },
            reason: { type: "string" as const },
            prompt: { type: "string" as const },
          },
          required: ["propertyType", "label", "price", "yield", "reason", "prompt"],
        },
      },
    },
    required: ["type", "message", "assumptions"],
  },
} as const;

/** Force the model to always call the respond tool */
export const RESPONSE_TOOL_CHOICE = {
  type: "tool" as const,
  name: "respond",
};
