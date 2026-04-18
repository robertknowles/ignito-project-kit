/**
 * Centralized Chart Color Palette
 *
 * SINGLE SOURCE OF TRUTH for all chart and data visualization colors.
 * DO NOT define chart colors elsewhere — always import from this file.
 *
 * Design: Monochromatic slate scale. Property series use four shades of
 * slate at equal stroke weight — distinguishable by shade only, no colour
 * hierarchy and no non-grey accents. Semantic colour is reserved for the
 * chat UI (e.g. amber for missing inputs) and does not appear on charts.
 */

// =============================================================================
// SLATE SCALE — single base palette the charts are built from
// =============================================================================

const SLATE = {
  900: '#0F172A',
  700: '#334155',
  600: '#475569',
  500: '#64748B',
  400: '#94A3B8',
  300: '#CBD5E1',
  200: '#E2E8F0',
  100: '#F1F5F9',
} as const;

// =============================================================================
// PROPERTY SERIES — four distinct slate shades, widely spread
// =============================================================================
// All lines are solid at the same stroke weight. Differentiation comes from
// shade alone. Adjacent entries alternate dark/light so neighbours have the
// strongest possible contrast — avoids the "looks black and one grey" effect
// you get when stepping evenly through a tight shade range.

export const PROPERTY_COLORS = [
  '#94A3B8', // P1 — darkest (was mid grey — slate-400)
  '#B0BCCD', // P2 — new mid, interpolated between slate-400 and slate-300
  '#CBD5E1', // P3 — light grey (slate-300)
  '#A8A29E', // P4 — warm light-mid grey (stone-400) — tonal shift, the "something else"
] as const;

/** Parallel to PROPERTY_COLORS. '0' means solid. Retained as a data channel
 *  so charts can opt into dashed differentiation later without re-plumbing. */
export const PROPERTY_DASH_PATTERNS = [
  '0',
  '0',
  '0',
  '0',
] as const;

// =============================================================================
// CHART COLORS
// =============================================================================
// Every token below draws from PROPERTY_COLORS (C1–C4). The only exception is
// `baseline`, which is the dashed "do nothing" reference line and sits outside
// the four-shade system by design. All primary series get C1, secondary series
// get C2, and subordinate/overlay elements get C3 or C4 so they never compete
// with the main series.

const C1 = PROPERTY_COLORS[0]; // #94A3B8 — darkest: Portfolio Value, primary series
const C2 = PROPERTY_COLORS[1]; // #B0BCCD — second-darkest: Total Equity, secondary series
const C3 = PROPERTY_COLORS[2]; // #CBD5E1 — subordinate: overlays, tertiary
const C4 = PROPERTY_COLORS[3]; // #A8A29E — subordinate warm tone

// rgba equivalents for fills & tints
const C1_RGBA = '148, 163, 184'; // #94A3B8
const C2_RGBA = '176, 188, 205'; // #B0BCCD
const C3_RGBA = '203, 213, 225'; // #CBD5E1
const C4_RGBA = '168, 162, 158'; // #A8A29E — retained for parity with C4

export const CHART_COLORS = {
  // ── Core line colors ───────────────────────────────────────────────
  /** Primary line — portfolio value, main metric. */
  primary: C1,
  /** Secondary line — equity, second series. */
  secondary: C2,
  /** Tertiary line — debt / subordinate. */
  tertiary: C3,
  /** Dedicated baseline colour for "do nothing" / "savings only" dashed
   *  reference lines. Kept on slate-300 — outside the four-shade palette
   *  by design so it reads as a neutral reference, not a series. */
  baseline: SLATE[300],

  // Semantic roles: primary = C1, counterpart = C2.
  positive: C1,
  negative: C2,
  net: C1,

  // ── Property lines (the four-shade palette) ───────────────────────
  property1: C1,
  property2: C2,
  property3: C3,
  property4: C4,

  // Legacy aliases — map to the four-shade palette so old references don't break
  lineBlue: C1,
  linePurple: C2,
  lineAqua: C3,

  // ── Goal & milestone markers — subordinate, do not compete ────────
  goal: C3,
  goalMarker: C3,
  goalMarkerStroke: '#FFFFFF',

  // ── Area fills & gradients (very low opacity from C1/C2) ──────────
  primaryFillStart: `rgba(${C1_RGBA}, 0.10)`,
  primaryFillEnd: `rgba(${C1_RGBA}, 0.01)`,
  secondaryFillStart: `rgba(${C2_RGBA}, 0.08)`,
  secondaryFillEnd: `rgba(${C2_RGBA}, 0.01)`,
  positiveFillStart: `rgba(${C1_RGBA}, 0.07)`,
  positiveFillEnd: `rgba(${C1_RGBA}, 0.01)`,
  negativeFillStart: `rgba(${C2_RGBA}, 0.06)`,
  negativeFillEnd: `rgba(${C2_RGBA}, 0.01)`,

  // ── Phase backgrounds (barely-there tints from C1/C2) ─────────────
  phaseAccumulation: `rgba(${C1_RGBA}, 0.025)`,
  phaseConsolidation: `rgba(${C2_RGBA}, 0.03)`,

  // ── Grid, axes, chrome ─────────────────────────────────────────────
  grid: '#E9EAEB',
  axisText: '#717680',
  labelText: '#535862',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E9EAEB',
  tooltipShadow: '0px 12px 16px -4px rgba(0, 0, 0, 0.08)',
  referenceLine: '#D5D7DA',
  annotationText: '#717680',

  // ── Comparison/overlay — subordinate so primary series stay dominant
  scenarioA: C3,
  scenarioALight: `rgba(${C3_RGBA}, 0.5)`,
  scenarioB: C4,
  scenarioBLight: `rgba(${C4_RGBA}, 0.5)`,

  // ── Multi-series categorical (property palette) ────────────────────
  series: PROPERTY_COLORS as unknown as readonly string[],

  // ── Bar chart fills ────────────────────────────────────────────────
  barPositive: `rgba(${C1_RGBA}, 0.70)`,
  barNegative: `rgba(${C2_RGBA}, 0.50)`,
  barPrimary: `rgba(${C1_RGBA}, 0.70)`,
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
    width: 60,
  },

  lineStrokeWidth: 1.5,
  lineStrokeWidthLight: 1.2,
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
    stroke: `rgba(${C3_RGBA}, 0.9)`,
    strokeDasharray: '4 4',
    strokeWidth: 1.2,
  },
} as const;

// =============================================================================
// CHART GRADIENTS
// =============================================================================

export const CHART_GRADIENTS = {
  primary: {
    startColor: C1,
    startOpacity: 0.12,
    endColor: C1,
    endOpacity: 0.01,
  },
  secondary: {
    startColor: C2,
    startOpacity: 0.08,
    endColor: C2,
    endOpacity: 0.01,
  },
  positive: {
    startColor: C1,
    startOpacity: 0.08,
    endColor: C1,
    endOpacity: 0.01,
  },
  negative: {
    startColor: C2,
    startOpacity: 0.08,
    endColor: C2,
    endOpacity: 0.01,
  },
} as const;
