/**
 * Constraint Feedback Handler — Step 2.3 of NL-PIVOT-PLAN.csv
 *
 * Translates engine constraint violations (from guardrailValidator +
 * suggestedFixes) into ChatOptionCardData objects for the chat UI.
 *
 * When a modification fails feasibility, this module builds friendly
 * option cards the BA can click to apply a fix.
 */

import type { ChatOptionCardData } from '@/types/nlParse'
import type { GuardrailViolation } from '@/utils/guardrailValidator'
import type { SuggestedFix } from '@/utils/suggestedFixes'

/**
 * Builds a conversational summary of why a modification failed.
 */
export function buildConstraintMessage(
  violations: GuardrailViolation[],
  propertyLabel?: string
): string {
  const target = propertyLabel ?? 'that property'

  if (violations.length === 0) {
    return `Can't apply that change to ${target} right now.`
  }

  const parts: string[] = []

  for (const v of violations) {
    const shortfall = Math.abs(v.shortfall)
    const shortfallStr = `$${shortfall.toLocaleString()}`

    switch (v.type) {
      case 'deposit':
        parts.push(`Not enough deposit — short by ${shortfallStr}`)
        break
      case 'borrowing':
        parts.push(`Exceeds borrowing capacity by ${shortfallStr}`)
        break
      case 'serviceability':
        parts.push(`Serviceability ${v.severity === 'error' ? 'fails' : 'is tight'} — ${shortfallStr} short`)
        break
    }
  }

  return `Can't do that for ${target}. ${parts.join('. ')}.`
}

/**
 * Converts SuggestedFix objects into ChatOptionCardData for the chat UI.
 * Each card carries an actionPayload with the exact context update to apply.
 */
export function buildFixOptionCards(
  fixes: SuggestedFix[],
  instanceId: string,
  propertyIndex: number
): ChatOptionCardData[] {
  const cards: ChatOptionCardData[] = []

  for (const fix of fixes) {
    const card = mapFixToCard(fix, instanceId, propertyIndex)
    if (card) {
      cards.push(card)
    }
  }

  return cards
}

function mapFixToCard(
  fix: SuggestedFix,
  instanceId: string,
  propertyIndex: number
): ChatOptionCardData | null {
  const propLabel = `Property ${propertyIndex + 1}`

  switch (fix.field) {
    case 'purchasePrice': {
      const currentStr = `$${(fix.currentValue / 1000).toFixed(0)}k`
      const suggestedStr = `$${(fix.suggestedValue / 1000).toFixed(0)}k`
      return {
        id: `fix-price-${instanceId}`,
        icon: 'arrow-down',
        label: `Lower ${propLabel} price`,
        description: `Drop from ${currentStr} to ${suggestedStr}`,
        actionPayload: {
          type: 'instance-update',
          instanceId,
          updates: {
            purchasePrice: fix.suggestedValue,
            valuationAtPurchase: fix.suggestedValue,
          },
        },
      }
    }

    case 'lvr': {
      return {
        id: `fix-lvr-${instanceId}`,
        icon: 'refresh',
        label: `Adjust ${propLabel} LVR`,
        description: `Change LVR from ${fix.currentValue}% to ${fix.suggestedValue}%`,
        actionPayload: {
          type: 'instance-update',
          instanceId,
          updates: { lvr: fix.suggestedValue },
        },
      }
    }

    case 'rentPerWeek': {
      const currentStr = `$${fix.currentValue}/wk`
      const suggestedStr = `$${fix.suggestedValue}/wk`
      return {
        id: `fix-rent-${instanceId}`,
        icon: 'arrow-up',
        label: `Increase ${propLabel} rent`,
        description: `Raise from ${currentStr} to ${suggestedStr}`,
        actionPayload: {
          type: 'instance-update',
          instanceId,
          updates: { rentPerWeek: fix.suggestedValue },
        },
      }
    }

    case 'lmiCapitalization': {
      return {
        id: `fix-lmi-${instanceId}`,
        icon: 'zap',
        label: `Capitalise LMI for ${propLabel}`,
        description: fix.explanation,
        actionPayload: {
          type: 'instance-update',
          instanceId,
          updates: { lmiCapitalized: true },
        },
      }
    }

    default:
      return null
  }
}

/**
 * Builds a "remove this property" option card — useful when no fix
 * can resolve the constraint.
 */
export function buildRemoveCard(
  instanceId: string,
  propertyIndex: number
): ChatOptionCardData {
  return {
    id: `fix-remove-${instanceId}`,
    icon: 'minus',
    label: `Remove Property ${propertyIndex + 1}`,
    description: 'Drop this property from the plan entirely',
    actionPayload: {
      type: 'remove-property',
      instanceId,
    },
  }
}
