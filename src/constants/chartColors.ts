/**
 * Centralized Chart Color Palette
 *
 * SINGLE SOURCE OF TRUTH for all chart and data visualization colors.
 * DO NOT define chart colors elsewhere — always import from this file.
 *
 * Design: ALL BLUE palette. Every series, bar, line, and fill uses a shade
 * of blue. No green, red, teal, amber, or any other hue.
 */

// =============================================================================
// CHART COLORS — all blue, all the time
// =============================================================================

export const CHART_COLORS = {
  // Core data series (darkest → lightest)
  /** Primary line/bar — portfolio value, main metric */
  primary: '#3B6CF4',
  /** Secondary line — equity, net worth, second series */
  secondary: '#6B9CF7',
  /** Tertiary line — debt, background series (dashed) */
  tertiary: '#A3C1FA',

  // Semantic series — same blue family, just mapped to meaning
  /** Positive values — income, gains */
  positive: '#3B6CF4',
  /** Negative values — expenses, debt, losses (lighter blue) */
  negative: '#A3C1FA',
  /** Net/result values */
  net: '#3B6CF4',

  // Goal & milestone markers (still blue)
  /** Goal/target reference lines */
  goal: '#6B9CF7',
  /** Goal achieved dot/marker */
  goalMarker: '#3B6CF4',
  /** Goal marker stroke */
  goalMarkerStroke: '#FFFFFF',

  // Area fills & gradients (very low opacity blues)
  primaryFillStart: 'rgba(59, 108, 244, 0.08)',
  primaryFillEnd: 'rgba(59, 108, 244, 0.01)',
  secondaryFillStart: 'rgba(107, 156, 247, 0.06)',
  secondaryFillEnd: 'rgba(107, 156, 247, 0.01)',
  positiveFillStart: 'rgba(59, 108, 244, 0.07)',
  positiveFillEnd: 'rgba(59, 108, 244, 0.01)',
  negativeFillStart: 'rgba(163, 193, 250, 0.06)',
  negativeFillEnd: 'rgba(163, 193, 250, 0.01)',

  // Grid, axes, chrome
  grid: '#F1F3F5',
  axisText: '#9CA3AF',
  labelText: '#6B7280',
  tooltipBorder: '#F1F3F5',
  referenceLine: '#CBD5E1',
  annotationText: '#9CA3AF',

  // Comparison/overlay charts (two distinct blues)
  scenarioA: '#3B6CF4',
  scenarioALight: '#6B9CF7',
  scenarioB: '#1E4FD0',
  scenarioBLight: '#5080E8',

  // Multi-series categorical palette — all blue shades
  series: [
    '#3B6CF4',
    '#1E4FD0',
    '#6B9CF7',
    '#5080E8',
    '#A3C1FA',
    '#8AB0F8',
  ] as const,

  // Bar chart fills — blue at different opacities
  barPositive: 'rgba(59, 108, 244, 0.55)',
  barNegative: 'rgba(163, 193, 250, 0.50)',
  barPrimary: 'rgba(59, 108, 244, 0.55)',
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
    },
    axisLine: false as const,
    tickLine: false as const,
  },

  yAxis: {
    tick: {
      fontSize: 12,
      fill: CHART_COLORS.axisText,
    },
    axisLine: false as const,
    tickLine: false as const,
    width: 55,
  },

  lineStrokeWidth: 2,
  lineStrokeWidthLight: 1.5,
  dashedPattern: '4 4',

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
} as const;

// =============================================================================
// CHART GRADIENTS
// =============================================================================

export const CHART_GRADIENTS = {
  primary: {
    startColor: '#3B6CF4',
    startOpacity: 0.08,
    endColor: '#3B6CF4',
    endOpacity: 0.01,
  },
  secondary: {
    startColor: '#6B9CF7',
    startOpacity: 0.06,
    endColor: '#6B9CF7',
    endOpacity: 0.01,
  },
  positive: {
    startColor: '#3B6CF4',
    startOpacity: 0.07,
    endColor: '#3B6CF4',
    endOpacity: 0.01,
  },
  negative: {
    startColor: '#A3C1FA',
    startOpacity: 0.05,
    endColor: '#A3C1FA',
    endOpacity: 0.01,
  },
} as const;
