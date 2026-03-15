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
  // ── Core line colors (softened with ~70% opacity feel) ──────────────
  /** Primary line — portfolio value, main metric */
  primary: 'rgba(59, 108, 244, 0.75)',
  /** Secondary line — equity, second series */
  secondary: 'rgba(107, 156, 247, 0.75)',
  /** Tertiary line — debt, background series (dashed) */
  tertiary: 'rgba(163, 193, 250, 0.70)',

  // Semantic — same soft blue family
  positive: 'rgba(59, 108, 244, 0.75)',
  negative: 'rgba(163, 193, 250, 0.70)',
  net: 'rgba(59, 108, 244, 0.75)',

  // ── Multi-line palette (blue / purple / aqua at ~70%) ──────────────
  // Used by Net Worth + Equity Unlock for distinguishable multi-series
  lineBlue: 'rgba(59, 130, 246, 0.75)',     // #3B82F6 at 75%
  linePurple: 'rgba(139, 92, 246, 0.70)',    // #8B5CF6 at 70%
  lineAqua: 'rgba(34, 211, 238, 0.65)',      // #22D3EE at 65%

  // ── Goal & milestone markers ───────────────────────────────────────
  goal: 'rgba(107, 156, 247, 0.60)',
  goalMarker: 'rgba(59, 108, 244, 0.75)',
  goalMarkerStroke: '#FFFFFF',

  // ── Area fills & gradients (very low opacity) ──────────────────────
  primaryFillStart: 'rgba(59, 108, 244, 0.08)',
  primaryFillEnd: 'rgba(59, 108, 244, 0.01)',
  secondaryFillStart: 'rgba(107, 156, 247, 0.06)',
  secondaryFillEnd: 'rgba(107, 156, 247, 0.01)',
  positiveFillStart: 'rgba(59, 108, 244, 0.07)',
  positiveFillEnd: 'rgba(59, 108, 244, 0.01)',
  negativeFillStart: 'rgba(163, 193, 250, 0.06)',
  negativeFillEnd: 'rgba(163, 193, 250, 0.01)',

  // ── Grid, axes, chrome ─────────────────────────────────────────────
  grid: '#F1F3F5',
  axisText: '#9CA3AF',
  labelText: '#6B7280',
  tooltipBorder: '#F1F3F5',
  referenceLine: '#CBD5E1',
  annotationText: '#9CA3AF',

  // ── Comparison/overlay (two distinct blues, softened) ──────────────
  scenarioA: 'rgba(59, 108, 244, 0.75)',
  scenarioALight: 'rgba(107, 156, 247, 0.65)',
  scenarioB: 'rgba(30, 79, 208, 0.75)',
  scenarioBLight: 'rgba(80, 128, 232, 0.65)',

  // ── Multi-series categorical (softened blues for bars/fills) ───────
  series: [
    'rgba(59, 108, 244, 0.65)',
    'rgba(30, 79, 208, 0.65)',
    'rgba(107, 156, 247, 0.60)',
    'rgba(80, 128, 232, 0.60)',
    'rgba(163, 193, 250, 0.55)',
    'rgba(138, 176, 248, 0.55)',
  ] as const,

  // ── Bar chart fills (soft, matches cashflow benchmark) ─────────────
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
      fontSize: 11,
      fill: CHART_COLORS.axisText,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    axisLine: false as const,
    tickLine: false as const,
  },

  yAxis: {
    tick: {
      fontSize: 11,
      fill: CHART_COLORS.axisText,
      fontFamily: 'Inter, system-ui, sans-serif',
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
