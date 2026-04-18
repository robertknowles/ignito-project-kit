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

export const CHART_COLORS = {
  // ── Core line colors ───────────────────────────────────────────────
  // Lightened to sit in the same tonal range as PROPERTY_COLORS so all
  // charts read as a single palette family.
  /** Primary line — portfolio value, main metric. */
  primary: SLATE[500],
  /** Secondary line — equity, second series. */
  secondary: SLATE[400],
  /** Tertiary line — debt / baseline (dashed). */
  tertiary: SLATE[300],
  /** Dedicated baseline colour for "do nothing" / "savings only" dashed
   *  reference lines. Lighter than primary/secondary so it stays subordinate. */
  baseline: SLATE[300],

  // Semantic roles collapsed to neutral slate — signalling now done via
  // +/- values, labels, and stroke pattern (solid vs dashed), not hue.
  positive: SLATE[500],
  negative: SLATE[400],
  net: SLATE[500],

  // ── Property lines (equal-weight shade scale) ─────────────────────
  property1: SLATE[900],
  property2: SLATE[700],
  property3: SLATE[500],
  property4: SLATE[400],

  // Legacy aliases — mapped to slate so old references don't break
  lineBlue: SLATE[900],
  linePurple: SLATE[700],
  lineAqua: SLATE[500],

  // ── Goal & milestone markers ───────────────────────────────────────
  goal: SLATE[700],
  goalMarker: SLATE[700],
  goalMarkerStroke: '#FFFFFF',

  // ── Area fills & gradients (very low opacity slate) ────────────────
  primaryFillStart: 'rgba(100, 116, 139, 0.10)',
  primaryFillEnd: 'rgba(100, 116, 139, 0.01)',
  secondaryFillStart: 'rgba(148, 163, 184, 0.08)',
  secondaryFillEnd: 'rgba(148, 163, 184, 0.01)',
  positiveFillStart: 'rgba(100, 116, 139, 0.07)',
  positiveFillEnd: 'rgba(100, 116, 139, 0.01)',
  negativeFillStart: 'rgba(148, 163, 184, 0.06)',
  negativeFillEnd: 'rgba(148, 163, 184, 0.01)',

  // ── Phase backgrounds (barely-there slate tints) ───────────────────
  phaseAccumulation: 'rgba(100, 116, 139, 0.025)',
  phaseConsolidation: 'rgba(148, 163, 184, 0.03)',

  // ── Grid, axes, chrome ─────────────────────────────────────────────
  grid: '#E9EAEB',
  axisText: '#717680',
  labelText: '#535862',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E9EAEB',
  tooltipShadow: '0px 12px 16px -4px rgba(0, 0, 0, 0.08)',
  referenceLine: '#D5D7DA',
  annotationText: '#717680',

  // ── Comparison/overlay (two scenarios differentiated by shade) ─────
  scenarioA: SLATE[500],
  scenarioALight: 'rgba(100, 116, 139, 0.5)',
  scenarioB: SLATE[400],
  scenarioBLight: 'rgba(148, 163, 184, 0.5)',

  // ── Multi-series categorical (property palette) ────────────────────
  series: PROPERTY_COLORS as unknown as readonly string[],

  // ── Bar chart fills ────────────────────────────────────────────────
  barPositive: 'rgba(100, 116, 139, 0.70)',
  barNegative: 'rgba(148, 163, 184, 0.50)',
  barPrimary: 'rgba(100, 116, 139, 0.70)',
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
    stroke: 'rgba(100, 116, 139, 0.45)',
    strokeDasharray: '4 4',
    strokeWidth: 1.2,
  },
} as const;

// =============================================================================
// CHART GRADIENTS
// =============================================================================

export const CHART_GRADIENTS = {
  primary: {
    startColor: SLATE[500],
    startOpacity: 0.12,
    endColor: SLATE[500],
    endOpacity: 0.01,
  },
  secondary: {
    startColor: SLATE[400],
    startOpacity: 0.08,
    endColor: SLATE[400],
    endOpacity: 0.01,
  },
  positive: {
    startColor: SLATE[500],
    startOpacity: 0.08,
    endColor: SLATE[500],
    endOpacity: 0.01,
  },
  negative: {
    startColor: SLATE[400],
    startOpacity: 0.08,
    endColor: SLATE[400],
    endOpacity: 0.01,
  },
} as const;
