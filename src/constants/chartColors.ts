/**
 * Centralized Chart Color Palette
 *
 * SINGLE SOURCE OF TRUTH for all chart and data visualization colors.
 * DO NOT define chart colors elsewhere — always import from this file.
 *
 * Design: Neutral chrome + blue accent. Property series use distinct hues
 * (blue, purple, cyan, indigo) at equal visual weight — no hierarchy.
 */

// =============================================================================
// PROPERTY COLOURS — distinct hues, equal visual weight (charts only)
// =============================================================================

export const PROPERTY_COLORS = [
  '#2563EB', // P1: Blue (Units / Apartments)
  '#8B5CF6', // P2: Violet (Villas / Townhouses)
  '#06B6D4', // P3: Cyan (Duplexes)
  '#6366F1', // P4: Indigo (Houses Regional)
] as const;

// =============================================================================
// CHART COLORS
// =============================================================================

export const CHART_COLORS = {
  // ── Core line colors ───────────────────────────────────────────────
  /** Primary line — portfolio value, main metric */
  primary: 'rgba(37, 99, 235, 0.70)',
  /** Secondary line — equity, second series */
  secondary: 'rgba(37, 99, 235, 0.45)',
  /** Tertiary line — debt, background series (dashed) */
  tertiary: 'rgba(156, 163, 175, 0.60)',

  // Semantic
  positive: 'rgba(37, 99, 235, 0.70)',
  negative: 'rgba(107, 114, 128, 0.50)',
  net: 'rgba(37, 99, 235, 0.70)',

  // ── Property lines (distinct-hue palette) ─────────────────────────
  // Each property is an equal peer — no visual hierarchy
  property1: '#2563EB',  // blue
  property2: '#8B5CF6',  // violet
  property3: '#06B6D4',  // cyan
  property4: '#6366F1',  // indigo

  // Legacy aliases — map to new palette
  lineBlue: '#2563EB',
  linePurple: '#8B5CF6',
  lineAqua: '#06B6D4',

  // ── Goal & milestone markers ───────────────────────────────────────
  goal: 'rgba(37, 99, 235, 0.50)',
  goalMarker: 'rgba(37, 99, 235, 0.60)',
  goalMarkerStroke: '#FFFFFF',

  // ── Area fills & gradients (very low opacity) ──────────────────────
  primaryFillStart: 'rgba(37, 99, 235, 0.12)',
  primaryFillEnd: 'rgba(37, 99, 235, 0.01)',
  secondaryFillStart: 'rgba(37, 99, 235, 0.06)',
  secondaryFillEnd: 'rgba(37, 99, 235, 0.01)',
  positiveFillStart: 'rgba(37, 99, 235, 0.07)',
  positiveFillEnd: 'rgba(37, 99, 235, 0.01)',
  negativeFillStart: 'rgba(156, 163, 175, 0.06)',
  negativeFillEnd: 'rgba(156, 163, 175, 0.01)',

  // ── Grid, axes, chrome ─────────────────────────────────────────────
  grid: '#F3F4F6',
  axisText: '#9CA3AF',
  labelText: '#6B7280',
  tooltipBorder: '#E5E7EB',
  referenceLine: '#CBD5E1',
  annotationText: '#9CA3AF',

  // ── Comparison/overlay ─────────────────────────────────────────────
  scenarioA: 'rgba(37, 99, 235, 0.60)',
  scenarioALight: 'rgba(37, 99, 235, 0.40)',
  scenarioB: 'rgba(30, 79, 208, 0.60)',
  scenarioBLight: 'rgba(80, 128, 232, 0.50)',

  // ── Multi-series categorical (property palette) ────────────────────
  series: PROPERTY_COLORS as unknown as readonly string[],

  // ── Bar chart fills ────────────────────────────────────────────────
  barPositive: 'rgba(37, 99, 235, 0.50)',
  barNegative: 'rgba(156, 163, 175, 0.35)',
  barPrimary: 'rgba(37, 99, 235, 0.50)',
} as const;

// =============================================================================
// CHART STYLE
// =============================================================================

export const CHART_STYLE = {
  grid: {
    strokeDasharray: '0',
    stroke: CHART_COLORS.grid,
    strokeOpacity: 1,
    vertical: false as const,
  },

  xAxis: {
    tick: {
      fontSize: 12,
      fill: CHART_COLORS.axisText,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    axisLine: false as const,
    tickLine: false as const,
  },

  yAxis: {
    tick: {
      fontSize: 12,
      fill: CHART_COLORS.axisText,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    axisLine: false as const,
    tickLine: false as const,
    width: 80,
  },

  lineStrokeWidth: 2,
  lineStrokeWidthLight: 1.5,
  dashedPattern: '6 3',

  referenceLine: {
    stroke: CHART_COLORS.referenceLine,
    strokeDasharray: '4 4',
    strokeWidth: 1,
  },

  goalLine: {
    stroke: CHART_COLORS.goal,
    strokeDasharray: '5 5',
    strokeWidth: 1.5,
  },

  milestoneLine: {
    stroke: 'rgba(37, 99, 235, 0.35)',
    strokeDasharray: '4 4',
    strokeWidth: 1.2,
  },
} as const;

// =============================================================================
// CHART GRADIENTS
// =============================================================================

export const CHART_GRADIENTS = {
  primary: {
    startColor: '#2563EB',
    startOpacity: 0.12,
    endColor: '#2563EB',
    endOpacity: 0.01,
  },
  secondary: {
    startColor: '#2563EB',
    startOpacity: 0.06,
    endColor: '#2563EB',
    endOpacity: 0.01,
  },
  positive: {
    startColor: '#2563EB',
    startOpacity: 0.07,
    endColor: '#2563EB',
    endOpacity: 0.01,
  },
  negative: {
    startColor: '#9CA3AF',
    startOpacity: 0.08,
    endColor: '#9CA3AF',
    endOpacity: 0.01,
  },
} as const;
