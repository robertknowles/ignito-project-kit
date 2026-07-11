/**
 * Centralized Chart Color Palette
 *
 * SINGLE SOURCE OF TRUTH for all chart and data visualization colors.
 * DO NOT define chart colors elsewhere - always import from this file.
 *
 * Design: PropPath design system - ONE violet accent (§1.1) over a four-step
 * grey ramp (§1.2). Violet `#7C3AED` (ink: text/interactive/markers) and
 * `#8B5CF6` (fill: chart lines/areas); tints `#F5F3FF` / `#EDE9FE` / `#D9D2F2`.
 * Grey = axis/scaffolding only; violet = data. Property series use violet
 * WEIGHTS (not foreign hues) so the accent stays honest (§3.8/§3.11).
 */

// =============================================================================
// SYSTEM TOKENS - the violet accent + grey ramp, defined once
// =============================================================================

/** Violet accent family (PropPath §1.1). */
const VIOLET = {
  ink: '#7C3AED',    // violet-600 - text / interactive / markers
  fill: '#8B5CF6',   // violet-500 - chart lines & area fills (hero)
  light: '#A78BFA',  // violet-400 - lighter / secondary series
  tint: '#D9D2F2',   // violet tint - "out"/secondary bars (§3.7/§3.10)
  tint100: '#EDE9FE',// violet-100
  tint50: '#F5F3FF', // violet-50 - surface tint, .editable hover pill (§2.7)
} as const;

/** RGB triplets for rgba() fills. */
const INK_RGB = '124, 58, 237';   // #7C3AED
const FILL_RGB = '139, 92, 246';  // #8B5CF6

/** Grey ramp - scaffolding only (§1.2, §3.x chart greys). */
const GREY = {
  axis: '#A1A1AA',      // chart axis / ticks (§3.5)
  gridline: '#F0F1F4',  // value gridlines (§3.9)
  baseline: '#E4E7EC',  // baseline / threshold, one step stronger (§3.9)
  zeroLine: '#D5D5DB',  // signed-fill zero line (§3.3)
  reference: '#C4C4CC', // dashed reference line / scrubber track (§3.4/§3.7)
  muted: '#98A2B3',     // least decision-relevant series, e.g. principal (§3.11)
  rule: '#D5D7DA',      // stronger rule above a total / Net (§2.2)
  border: '#E9EAEB',    // card / divider hairline (§1.6)
  axisText: '#717680',  // meta-grey axis labels where text (not ticks)
  labelText: '#535862', // secondary label text
} as const;

/** Semantic - financial SIGN only, never decorative (§1.3). */
const SEMANTIC = {
  positive: '#17B26A',
  negative: '#F04438',
} as const;

// =============================================================================
// PROPERTY COLOURS - violet weight ramp (one accent, no foreign hues)
// =============================================================================

export const PROPERTY_COLORS = [
  '#6D28D9', // P1: violet-700 (darkest)
  '#7C3AED', // P2: violet-600
  '#8B5CF6', // P3: violet-500
  '#A78BFA', // P4: violet-400 (lightest)
] as const;

// =============================================================================
// CHART COLORS
// =============================================================================

export const CHART_COLORS = {
  // ── Core line colors ───────────────────────────────────────────────
  /** Primary line - portfolio value, main metric (hero violet) */
  primary: VIOLET.fill,
  /** Secondary line - equity, second series */
  secondary: VIOLET.light,
  /** Tertiary line - debt, background series (dashed grey) */
  tertiary: GREY.reference,

  // Semantic (chart series; sign lives on figures, lines stay accent/grey)
  positive: VIOLET.fill,
  negative: GREY.muted,
  net: VIOLET.fill,

  // ── Property lines (violet weight ramp) ───────────────────────────
  // One accent - differentiated by weight, not hue
  property1: '#6D28D9',  // violet-700
  property2: '#7C3AED',  // violet-600
  property3: '#8B5CF6',  // violet-500
  property4: '#A78BFA',  // violet-400

  // Legacy aliases - map to the violet family
  lineBlue: VIOLET.ink,
  linePurple: VIOLET.fill,
  lineAqua: VIOLET.light,

  // ── Goal & milestone markers ───────────────────────────────────────
  goal: `rgba(${INK_RGB}, 0.50)`,
  goalMarker: `rgba(${INK_RGB}, 0.60)`,
  goalMarkerStroke: '#FFFFFF',

  // ── Area fills & gradients (very low opacity, violet) ──────────────
  primaryFillStart: `rgba(${FILL_RGB}, 0.12)`,
  primaryFillEnd: `rgba(${FILL_RGB}, 0.01)`,
  secondaryFillStart: `rgba(${FILL_RGB}, 0.06)`,
  secondaryFillEnd: `rgba(${FILL_RGB}, 0.01)`,
  positiveFillStart: `rgba(${FILL_RGB}, 0.07)`,
  positiveFillEnd: `rgba(${FILL_RGB}, 0.01)`,
  negativeFillStart: `rgba(152, 162, 179, 0.06)`,  // #98A2B3 muted grey
  negativeFillEnd: `rgba(152, 162, 179, 0.01)`,

  // ── Grid, axes, chrome (grey ramp) ─────────────────────────────────
  grid: GREY.gridline,
  axisText: GREY.axis,
  labelText: GREY.labelText,
  tooltipBorder: GREY.border,
  referenceLine: GREY.reference,
  annotationText: GREY.axisText,

  // ── Comparison/overlay (violet weights) ────────────────────────────
  scenarioA: `rgba(${FILL_RGB}, 0.70)`,
  scenarioALight: `rgba(${FILL_RGB}, 0.40)`,
  scenarioB: `rgba(${INK_RGB}, 0.65)`,
  scenarioBLight: `rgba(${INK_RGB}, 0.40)`,

  // ── Multi-series categorical (property palette) ────────────────────
  series: PROPERTY_COLORS as unknown as readonly string[],

  // ── Bar chart fills (violet primary / violet tint secondary, §3.10) ─
  barPositive: VIOLET.fill,
  barNegative: VIOLET.tint,
  barPrimary: VIOLET.fill,

  // ── Named system tokens (for charts that need exact spec greys) ────
  zeroLine: GREY.zeroLine,
  gridline: GREY.gridline,
  baseline: GREY.baseline,
  mutedSeries: GREY.muted,
  strongRule: GREY.rule,
  semanticPositive: SEMANTIC.positive,
  semanticNegative: SEMANTIC.negative,
  violetInk: VIOLET.ink,
  violetFill: VIOLET.fill,
  violetTint: VIOLET.tint,
  violetTint50: VIOLET.tint50,
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
    strokeDasharray: '5 5',
    strokeWidth: 1,
  },

  goalLine: {
    stroke: CHART_COLORS.goal,
    strokeDasharray: '5 5',
    strokeWidth: 1.5,
  },

  milestoneLine: {
    stroke: `rgba(${INK_RGB}, 0.35)`,
    strokeDasharray: '4 4',
    strokeWidth: 1.2,
  },
} as const;

// =============================================================================
// CHART GRADIENTS
// =============================================================================

export const CHART_GRADIENTS = {
  primary: {
    startColor: VIOLET.fill,
    startOpacity: 0.12,
    endColor: VIOLET.fill,
    endOpacity: 0.01,
  },
  secondary: {
    startColor: VIOLET.fill,
    startOpacity: 0.06,
    endColor: VIOLET.fill,
    endOpacity: 0.01,
  },
  positive: {
    startColor: VIOLET.fill,
    startOpacity: 0.07,
    endColor: VIOLET.fill,
    endOpacity: 0.01,
  },
  negative: {
    startColor: GREY.muted,
    startOpacity: 0.08,
    endColor: GREY.muted,
    endOpacity: 0.01,
  },
} as const;
