/**
 * Event Types Constants
 * 
 * This file defines all event types for the Custom Events System,
 * including their categories, icons, effect descriptions, and validation rules.
 */

import type { EventType, EventCategory, EventPayload } from '../contexts/PropertySelectionContext';

// =============================================================================
// EVENT CATEGORY DEFINITIONS
// =============================================================================

export interface EventCategoryDefinition {
  id: EventCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const EVENT_CATEGORIES: Record<EventCategory, EventCategoryDefinition> = {
  income: {
    id: 'income',
    label: 'Income Changes',
    description: 'Salary increases, partner income, bonuses',
    icon: '💼',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  portfolio: {
    id: 'portfolio',
    label: 'Portfolio Changes',
    description: 'Sell, refinance, or renovate properties',
    icon: '🏠',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  life: {
    id: 'life',
    label: 'Life Events',
    description: 'Inheritance, major expenses, family changes',
    icon: '👨‍👩‍👧',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  market: {
    id: 'market',
    label: 'Market Events',
    description: 'Interest rate changes, market corrections',
    icon: '📈',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
};

// =============================================================================
// EVENT TYPE DEFINITIONS
// =============================================================================

export interface EventEffect {
  field: string;
  description: string;
  direction: 'increase' | 'decrease' | 'variable';
}

export interface EventTypeDefinition {
  id: EventType;
  category: EventCategory;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  effects: EventEffect[];
  requiredFields: (keyof EventPayload)[];
  optionalFields: (keyof EventPayload)[];
  isPersistent: boolean; // Does this event's effect persist beyond the event period?
}

export const EVENT_TYPES: Record<EventType, EventTypeDefinition> = {
  // =============================================================================
  // INCOME EVENTS
  // =============================================================================
  salary_change: {
    id: 'salary_change',
    category: 'income',
    label: 'Salary Change',
    shortLabel: 'Salary',
    description: 'Increase or decrease in your annual salary',
    icon: '💰',
    effects: [
      { field: 'Borrowing Capacity', description: 'Changes based on new salary', direction: 'variable' },
      { field: 'Annual Savings', description: 'Adjusts with income change', direction: 'variable' },
    ],
    requiredFields: ['newSalary'],
    optionalFields: ['previousSalary'],
    isPersistent: true,
  },
  partner_income_change: {
    id: 'partner_income_change',
    category: 'income',
    label: 'Partner Income Change',
    shortLabel: 'Partner',
    description: 'Change in partner\'s annual income',
    icon: '👥',
    effects: [
      { field: 'Borrowing Capacity', description: 'Household income affects capacity', direction: 'variable' },
      { field: 'Annual Savings', description: 'Household savings adjust', direction: 'variable' },
    ],
    requiredFields: ['newPartnerSalary'],
    optionalFields: ['previousPartnerSalary'],
    isPersistent: true,
  },
  bonus_windfall: {
    id: 'bonus_windfall',
    category: 'income',
    label: 'Bonus / Windfall',
    shortLabel: 'Bonus',
    description: 'One-time cash injection (bonus, windfall, tax return)',
    icon: '🎁',
    effects: [
      { field: 'Available Cash', description: 'One-time increase', direction: 'increase' },
    ],
    requiredFields: ['bonusAmount'],
    optionalFields: [],
    isPersistent: false, // One-time event
  },

  // =============================================================================
  // PORTFOLIO EVENTS
  // =============================================================================
  sell_property: {
    id: 'sell_property',
    category: 'portfolio',
    label: 'Sell a Property',
    shortLabel: 'Sell',
    description: 'Sell a property from your portfolio',
    icon: '🏷️',
    effects: [
      { field: 'Available Cash', description: 'Equity released from sale', direction: 'increase' },
      { field: 'Total Debt', description: 'Loan paid off', direction: 'decrease' },
      { field: 'Rental Income', description: 'Lost rental income', direction: 'decrease' },
      { field: 'Borrowing Capacity', description: 'Freed up capacity', direction: 'increase' },
    ],
    requiredFields: ['propertyInstanceId', 'salePrice'],
    optionalFields: [],
    isPersistent: true,
  },
  refinance: {
    id: 'refinance',
    category: 'portfolio',
    label: 'Refinance Properties',
    shortLabel: 'Refinance',
    description: 'Refinance at a new interest rate',
    icon: '🔄',
    effects: [
      { field: 'Loan Repayments', description: 'Changes with new rate', direction: 'variable' },
      { field: 'Cashflow', description: 'Adjusts with repayments', direction: 'variable' },
      { field: 'Serviceability', description: 'Recalculated at new rate', direction: 'variable' },
    ],
    requiredFields: ['newInterestRate'],
    optionalFields: ['previousInterestRate', 'propertyInstanceId'],
    isPersistent: true,
  },
  renovate: {
    id: 'renovate',
    category: 'portfolio',
    label: 'Renovate a Property',
    shortLabel: 'Renovate',
    description: 'Spend cash to increase property value',
    icon: '🔨',
    effects: [
      { field: 'Available Cash', description: 'Renovation cost', direction: 'decrease' },
      { field: 'Property Value', description: 'Value increase after reno', direction: 'increase' },
      { field: 'Equity', description: 'Net equity change', direction: 'increase' },
    ],
    requiredFields: ['propertyInstanceId', 'renovationCost', 'valueIncrease'],
    optionalFields: [],
    isPersistent: true,
  },

  // =============================================================================
  // LIFE EVENTS
  // =============================================================================
  inheritance: {
    id: 'inheritance',
    category: 'life',
    label: 'Inheritance / Gift',
    shortLabel: 'Inheritance',
    description: 'Receive cash from inheritance or gift',
    icon: '🎀',
    effects: [
      { field: 'Available Cash', description: 'One-time increase', direction: 'increase' },
    ],
    requiredFields: ['cashAmount'],
    optionalFields: [],
    isPersistent: false, // One-time event
  },
  major_expense: {
    id: 'major_expense',
    category: 'life',
    label: 'Major Expense',
    shortLabel: 'Expense',
    description: 'Large one-time expense (wedding, car, etc.)',
    icon: '💸',
    effects: [
      { field: 'Available Cash', description: 'One-time decrease', direction: 'decrease' },
    ],
    requiredFields: ['cashAmount'],
    optionalFields: [],
    isPersistent: false, // One-time event
  },
  dependent_change: {
    id: 'dependent_change',
    category: 'life',
    label: 'Dependent Change',
    shortLabel: 'Dependent',
    description: 'Add or remove a dependent (affects borrowing)',
    icon: '👶',
    effects: [
      { field: 'Borrowing Capacity', description: 'Adjusted for dependents', direction: 'variable' },
      { field: 'Annual Savings', description: 'Living expenses change', direction: 'variable' },
    ],
    requiredFields: ['dependentChange'],
    optionalFields: [],
    isPersistent: true,
  },

  // =============================================================================
  // MARKET EVENTS
  // =============================================================================
  interest_rate_change: {
    id: 'interest_rate_change',
    category: 'market',
    label: 'Interest Rate Change',
    shortLabel: 'Rates',
    description: 'Market-wide interest rate change',
    icon: '📊',
    effects: [
      { field: 'Loan Repayments', description: 'All loans affected', direction: 'variable' },
      { field: 'Cashflow', description: 'Portfolio cashflow changes', direction: 'variable' },
      { field: 'Serviceability', description: 'All tests recalculated', direction: 'variable' },
    ],
    requiredFields: ['rateChange'],
    optionalFields: [],
    isPersistent: true,
  },
  market_correction: {
    id: 'market_correction',
    category: 'market',
    label: 'Market Correction',
    shortLabel: 'Correction',
    description: 'Temporary adjustment to growth rates',
    icon: '📉',
    effects: [
      { field: 'Property Values', description: 'Growth rate adjusted', direction: 'decrease' },
      { field: 'Equity', description: 'Slower equity growth', direction: 'decrease' },
    ],
    requiredFields: ['growthAdjustment', 'durationPeriods'],
    optionalFields: [],
    isPersistent: false, // Effect is temporary for specified duration
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all event types for a specific category
 */
export const getEventTypesForCategory = (category: EventCategory): EventTypeDefinition[] => {
  return Object.values(EVENT_TYPES).filter(et => et.category === category);
};

/**
 * Get the display label for an event
 */
export const getEventLabel = (eventType: EventType, payload: EventPayload): string => {
  const typeDef = EVENT_TYPES[eventType];
  // Guard against unknown event types — an unknown eventType previously
  // crashed the timeline render (typeDef.label on undefined).
  if (!typeDef) {
    console.warn('[eventTypes] unknown event type:', eventType);
    return String(eventType);
  }

  switch (eventType) {
    case 'salary_change':
      if (payload.newSalary !== undefined && payload.newSalary !== null) {
        const direction = payload.previousSalary !== undefined 
          ? (payload.newSalary > payload.previousSalary ? ' ↑' : payload.newSalary < payload.previousSalary ? ' ↓' : '')
          : ' ↑';
        return `Salary${direction}`;
      }
      return typeDef.label;
    case 'partner_income_change':
      if (payload.newPartnerSalary !== undefined && payload.newPartnerSalary !== null) {
        const direction = payload.previousPartnerSalary !== undefined
          ? (payload.newPartnerSalary > payload.previousPartnerSalary ? ' ↑' : payload.newPartnerSalary < payload.previousPartnerSalary ? ' ↓' : '')
          : ' ↑';
        return `Partner Income${direction}`;
      }
      return typeDef.label;
    case 'bonus_windfall':
      return payload.bonusAmount
        ? `Bonus: +$${payload.bonusAmount.toLocaleString()}`
        : typeDef.label;
    case 'inheritance':
      return payload.cashAmount
        ? `Inheritance: +$${payload.cashAmount.toLocaleString()}`
        : typeDef.label;
    case 'major_expense':
      return payload.cashAmount
        ? `Expense: -$${payload.cashAmount.toLocaleString()}`
        : typeDef.label;
    case 'interest_rate_change':
      if (payload.rateChange !== undefined) {
        const direction = payload.rateChange > 0 ? ' ↑' : payload.rateChange < 0 ? ' ↓' : '';
        return `Rates: ${payload.rateChange > 0 ? '+' : ''}${payload.rateChange}%${direction}`;
      }
      return typeDef.label;
    case 'market_correction':
      return payload.growthAdjustment !== undefined
        ? `Market: ${payload.growthAdjustment}% growth ↓`
        : typeDef.label;
    case 'dependent_change':
      if (payload.dependentChange) {
        const direction = payload.dependentChange > 0 ? ' ↑' : ' ↓';
        return `Dependents: ${payload.dependentChange > 0 ? '+' : ''}${payload.dependentChange}${direction}`;
      }
      return typeDef.label;
    case 'refinance':
      return payload.newInterestRate
        ? `Refinance: ${payload.newInterestRate}%`
        : typeDef.label;
    default:
      return typeDef.label;
  }
};

/**
 * Get effect description strings for an event
 */
export const getEventEffectDescriptions = (eventType: EventType, payload: EventPayload): string[] => {
  const typeDef = EVENT_TYPES[eventType];
  const descriptions: string[] = [];
  
  for (const effect of typeDef.effects) {
    let description = effect.description;
    
    // Add specific values where available
    switch (eventType) {
      case 'salary_change':
        if (effect.field === 'Borrowing Capacity' && payload.newSalary) {
          // Rough estimate: 4x salary multiplier
          const capacityChange = payload.newSalary * 4;
          description = `Borrowing Capacity: ~$${capacityChange.toLocaleString()}`;
        }
        break;
      case 'inheritance':
      case 'bonus_windfall':
        if (effect.field === 'Available Cash' && payload.cashAmount) {
          description = `Available Cash: +$${payload.cashAmount.toLocaleString()}`;
        }
        break;
      case 'major_expense':
        if (effect.field === 'Available Cash' && payload.cashAmount) {
          description = `Available Cash: -$${payload.cashAmount.toLocaleString()}`;
        }
        break;
    }
    
    descriptions.push(description);
  }
  
  return descriptions;
};

/**
 * Validate that required fields are present for an event type
 */
export const validateEventPayload = (eventType: EventType, payload: EventPayload): { valid: boolean; missingFields: string[] } => {
  const typeDef = EVENT_TYPES[eventType];
  const missingFields: string[] = [];
  
  for (const field of typeDef.requiredFields) {
    if (payload[field] === undefined || payload[field] === null) {
      missingFields.push(field);
    }
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Get default payload values for an event type
 */
export const getDefaultPayload = (eventType: EventType): EventPayload => {
  switch (eventType) {
    case 'salary_change':
      return { newSalary: 100000 };
    case 'partner_income_change':
      return { newPartnerSalary: 80000 };
    case 'bonus_windfall':
      return { bonusAmount: 50000 };
    case 'inheritance':
      return { cashAmount: 100000 };
    case 'major_expense':
      return { cashAmount: 30000 };
    case 'dependent_change':
      return { dependentChange: 1 };
    case 'interest_rate_change':
      return { rateChange: 0.5 };
    case 'market_correction':
      return { growthAdjustment: -3, durationPeriods: 4 };
    case 'sell_property':
      return { propertyInstanceId: '', salePrice: 0 };
    case 'refinance':
      return { newInterestRate: 6.0 };
    case 'renovate':
      return { propertyInstanceId: '', renovationCost: 50000, valueIncrease: 80000 };
    default:
      return {};
  }
};
