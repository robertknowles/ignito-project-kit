/**
 * Parses a user-typed number that may use currency shorthand:
 * "10k" → 10,000 · "1.5m" → 1,500,000 · "$450,000" → 450,000.
 * Returns null when the input isn't a valid number.
 */
export const parseShorthandNumber = (raw: string): number | null => {
  const cleaned = raw.trim().replace(/[$,\s]/g, '')
  if (!cleaned) return null
  const match = cleaned.match(/^(-?\d*\.?\d+)([kKmM])?$/)
  if (!match) return null
  const base = parseFloat(match[1])
  if (isNaN(base)) return null
  const suffix = match[2]?.toLowerCase()
  const multiplier = suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : 1
  return base * multiplier
}
