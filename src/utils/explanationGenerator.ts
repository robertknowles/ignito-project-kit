/**
 * Explanation Generator — Step 2.6 of NL-PIVOT-PLAN.csv
 *
 * Builds data context for explanation-type requests. When a BA asks
 * "why is cashflow negative in 2029", this module extracts the relevant
 * calculated data from the chart data and timeline properties, then
 * formats it into a context block that Claude can reference.
 *
 * Claude MUST reference real engine numbers — never make up figures.
 */

import type { PortfolioGrowthDataPoint, CashflowDataPoint } from '@/hooks/useChartDataGenerator'
import type { TimelineProperty } from '@/types/property'
import { BASE_YEAR } from '@/constants/financialParams'

export interface ExplanationContext {
  /** Summary of what data was found for the question */
  dataContext: string
  /** The periods/years that are relevant */
  relevantYears: string[]
}

/**
 * Builds a data context string for an explanation request.
 * This is injected into the edge function call so Claude can
 * reference real numbers from the engine.
 */
export function buildExplanationContext(
  question: string,
  portfolioGrowthData: PortfolioGrowthDataPoint[],
  cashflowData: CashflowDataPoint[],
  timelineProperties: TimelineProperty[],
  relevantPeriods?: number[],
  relevantProperties?: string[]
): ExplanationContext {
  // Try to extract year references from the question
  const yearMatches = question.match(/20\d{2}/g)
  const relevantYears = yearMatches ? [...new Set(yearMatches)] : []

  // If no years found but we have relevantPeriods, convert them
  if (relevantYears.length === 0 && relevantPeriods && relevantPeriods.length > 0) {
    for (const period of relevantPeriods) {
      const year = String(BASE_YEAR + Math.floor((period - 1) / 2))
      if (!relevantYears.includes(year)) {
        relevantYears.push(year)
      }
    }
  }

  const sections: string[] = []

  // ── Portfolio Growth Data ──
  if (portfolioGrowthData.length > 0) {
    const relevantGrowth = relevantYears.length > 0
      ? portfolioGrowthData.filter(d => relevantYears.includes(d.year))
      : portfolioGrowthData.slice(0, 5) // First 5 years if no specific years

    if (relevantGrowth.length > 0) {
      sections.push('**Portfolio Growth:**')
      for (const d of relevantGrowth) {
        const parts = [
          `Year ${d.year}:`,
          `Portfolio Value $${Math.round(d.portfolioValue).toLocaleString()}`,
          `Equity $${Math.round(d.equity).toLocaleString()}`,
          d.totalDebt !== undefined ? `Debt $${Math.round(d.totalDebt).toLocaleString()}` : '',
          d.monthlyHoldingCost !== undefined ? `Monthly Holding Cost $${Math.round(d.monthlyHoldingCost).toLocaleString()}` : '',
          d.properties && d.properties.length > 0 ? `Purchased: ${d.properties.join(', ')}` : '',
        ].filter(Boolean)
        sections.push(parts.join(', '))
      }
    }
  }

  // ── Cashflow Data ──
  if (cashflowData.length > 0) {
    const relevantCashflow = relevantYears.length > 0
      ? cashflowData.filter(d => relevantYears.includes(d.year))
      : cashflowData.slice(0, 5)

    if (relevantCashflow.length > 0) {
      sections.push('\n**Cashflow Breakdown:**')
      for (const d of relevantCashflow) {
        sections.push(
          `Year ${d.year}: Net Cashflow $${Math.round(d.cashflow).toLocaleString()}, ` +
          `Rental Income $${Math.round(d.rentalIncome).toLocaleString()}, ` +
          `Expenses $${Math.round(d.expenses).toLocaleString()}, ` +
          `Loan Repayments $${Math.round(d.loanRepayments).toLocaleString()}`
        )
      }
    }
  }

  // ── Timeline Properties ──
  if (timelineProperties.length > 0) {
    sections.push('\n**Properties in Timeline:**')
    for (const prop of timelineProperties) {
      const parts = [
        `${prop.title}:`,
        `$${prop.cost.toLocaleString()} in Period ${prop.period} (${prop.displayPeriod})`,
        `Loan $${Math.round(prop.loanAmount).toLocaleString()}`,
        `Deposit Required $${Math.round(prop.depositRequired).toLocaleString()}`,
        `Net Cashflow $${Math.round(prop.netCashflow).toLocaleString()}/yr`,
        prop.status === 'challenging' ? '(Status: Challenging)' : '',
      ].filter(Boolean)
      sections.push(parts.join(', '))
    }
  }

  // If nothing matched, provide general summary
  if (sections.length === 0) {
    const lastGrowth = portfolioGrowthData[portfolioGrowthData.length - 1]
    const lastCashflow = cashflowData[cashflowData.length - 1]
    if (lastGrowth) {
      sections.push(`Current portfolio value: $${Math.round(lastGrowth.portfolioValue).toLocaleString()}, Equity: $${Math.round(lastGrowth.equity).toLocaleString()}`)
    }
    if (lastCashflow) {
      sections.push(`Latest cashflow: $${Math.round(lastCashflow.cashflow).toLocaleString()}/yr`)
    }
    sections.push(`${timelineProperties.length} properties in timeline`)
  }

  return {
    dataContext: sections.join('\n'),
    relevantYears,
  }
}
