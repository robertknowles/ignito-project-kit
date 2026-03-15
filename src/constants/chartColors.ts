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
  // ── Core line colors (softened to match bar opacity) ────────────────
  /** Primary line — portfolio value, main metric */
  primary: 'rgba(59, 108, 244, 0.60)',
  /** Secondary line — equity, second series */
  secondary: 'rgba(107, 156, 247, 0.55)',
  /** Tertiary line — debt, background series (dashed) */
  tertiary: 'rgba(163, 193, 250, 0.50)',

  // Semantic — same soft blue family
  positive: 'rgba(59, 108, 244, 0.60)',
  negative: 'rgba(163, 193, 250, 0.50)',
  net: 'rgba(59, 108, 244, 0.60)',

  // ── Multi-line palette (all-blue family, different weights) ────────
  // Circle-style: same hue, differentiated by lightness/opacity
  lineBlue: 'rgba(37, 99, 235, 0.65)',      // strong primary blue
  linePurple: 'rgba(96, 165, 250, 0.55)',    // mid-blue
  lineAqua: 'rgba(147, 197, 253, 0.50)',     // light blue

  // ── Goal & milestone markers ───────────────────────────────────────
  goal: 'rgba(107, 156, 247, 0.50)',
  goalMarker: 'rgba(59, 108, 244, 0.60)',
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
  scenarioA: 'rgba(59, 108, 244, 0.60)',
  scenarioALight: 'rgba(107, 156, 247, 0.50)',
  scenarioB: 'rgba(30, 79, 208, 0.60)',
  scenarioBLight: 'rgba(80, 128, 232, 0.50)',

  // ── Multi-series categorical (soft blues for bars/fills) ──────────
  series: [
    'rgba(59, 108, 244, 0.50)',
    'rgba(37, 99, 235, 0.45)',
    'rgba(96, 165, 250, 0.50)',
    'rgba(80, 128, 232, 0.45)',
    'rgba(147, 197, 253, 0.50)',
    'rgba(138, 176, 248, 0.45)',
  ] as const,

  // ── Bar chart fills (soft, matches cashflow benchmark) ─────────────
  barPositive: 'rgba(59, 108, 244, 0.50)',
  barNegative: 'rgba(163, 193, 250, 0.45)',
  barPrimary: 'rgba(59, 108, 244, 0.50)',
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
