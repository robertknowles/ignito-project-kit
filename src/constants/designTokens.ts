/**
 * DESIGN TOKENS — Single Source of Truth
 *
 * Values sourced from Untitled UI's official theme.css (installed via npx untitledui init)
 * and verified via live Chrome DevTools inspection (May 2026).
 *
 * Brand: Purple-only palette (no blue). Primary = brand-600 (#7F56D9).
 * Chrome: Tailwind neutral gray scale (via UUI semantic mappings).
 * Font: Inter with cv01, cv03, cv04 features.
 *
 * UUI semantic mapping reference (from src/styles/theme.css):
 *   --color-text-primary:          neutral-900
 *   --color-text-secondary:        neutral-700
 *   --color-text-tertiary:         neutral-600
 *   --color-text-quaternary:       neutral-500
 *   --color-text-placeholder:      neutral-500
 *   --color-fg-brand-primary:      brand-600
 *   --color-bg-brand-solid:        brand-600
 *   --color-bg-brand-solid_hover:  brand-700
 *   --color-bg-active:             neutral-50
 *   --color-bg-primary_hover:      neutral-50
 *   --color-border-secondary:      neutral-200
 *   --color-border-primary:        neutral-300
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const COLORS = {
  // ── Brand (purple-only, from UUI theme.css lines 124-134) ─────────
  brand: {
    950: '#2C1C5F',   // rgb(44 28 95) — deepest
    900: '#42307D',   // rgb(66 48 125)
    800: '#53389E',   // rgb(83 56 158) — gradient stops
    700: '#6941C6',   // rgb(105 65 198) — hover state, links
    600: '#7F56D9',   // rgb(127 86 217) — ★ PRIMARY — buttons, solid bg
    500: '#9E77ED',   // rgb(158 119 237) — lighter accent, chart line 2
    400: '#B692F6',   // rgb(182 146 246) — chart line 3, badges
    300: '#D6BBFB',   // rgb(214 187 251) — on-brand quaternary text
    200: '#E9D7FE',   // rgb(233 215 254) — tag backgrounds, on-brand secondary
    100: '#F4EBFF',   // rgb(244 235 255) — brand secondary bg
    50:  '#F9F5FF',   // rgb(249 245 255) — brand primary bg, surface tint
  },

  // ── Neutral (Tailwind default scale, used by UUI semantics) ───────
  neutral: {
    950: '#0A0A0A',   // overlay bg
    900: '#171717',   // text-primary — headings, stat values (verified)
    800: '#262626',   // text-primary-alt
    700: '#404040',   // text-secondary — names, breadcrumb active (verified)
    600: '#525252',   // text-tertiary — subtitles, timestamps (verified)
    500: '#737373',   // text-quaternary — breadcrumbs, icons, placeholders (verified)
    400: '#A3A3A3',   // disabled, fg-quaternary
    300: '#D4D4D4',   // border-primary (stronger)
    200: '#E5E5E5',   // border-secondary (default) — sidebar divider, card ring (verified)
    100: '#F5F5F5',   // bg-tertiary — pill tab container bg, hover bg (verified)
    50:  '#FAFAFA',   // bg-secondary, bg-active — active sidebar item (verified)
    0:   '#FFFFFF',   // bg-primary — card backgrounds, content area
  },

  // ── Semantic (from UUI theme.css fg/text mappings) ────────────────
  // UUI maps success/error/warning to their respective -600 slots
  success: '#00A63E',  // verified via live inspection (green-600 as rendered)
  error:   '#F04438',  // UUI error, also in index.css --destructive
  warning: '#F79009',  // UUI warning-600
  info:    '#7F56D9',  // use brand-600 instead of blue

  // ── Chart-specific (purple shades for data viz) ───────────────────
  chart: {
    line1:     '#7F56D9',                  // primary series
    line2:     '#9E77ED',                  // secondary series
    line3:     '#B692F6',                  // tertiary series
    line4:     '#D6BBFB',                  // quaternary
    area1:     'rgba(127, 86, 217, 0.12)', // primary area fill
    area1End:  'rgba(127, 86, 217, 0.01)', // primary area gradient end
    area2:     'rgba(127, 86, 217, 0.06)', // secondary area fill
    area2End:  'rgba(127, 86, 217, 0.01)',
    grid:      '#EEEEEE',                  // lighter than current
    axisText:  '#737373',                  // neutral-500
    reference: '#D4D4D4',                  // neutral-300
    negative:  'rgba(163, 163, 163, 0.50)', // neutral-400 at 50%
    negFill:   'rgba(163, 163, 163, 0.06)',
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const TYPOGRAPHY = {
  /** Font stack — Inter with UUI OpenType features */
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFeatures: "'cv01', 'cv03', 'cv04'",

  // ── Scale (matches UUI exactly) ───────────────────────────────────
  /** Page title: "Dashboard", "Portfolio" — 24px/32px semibold */
  pageTitle: {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: '32px',
    color: COLORS.neutral[900],
  },

  /** Page heading: "Welcome back, Olivia" — 20px/30px semibold */
  pageHeading: {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: '30px',
    color: COLORS.neutral[900],
  },

  /** Page subtext: "Your current sales summary" — 16px/24px regular */
  pageSubtext: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: '24px',
    color: COLORS.neutral[600],
  },

  /** Section heading: card titles, table headers — 16px/24px semibold */
  sectionHeading: {
    fontSize: 16,
    fontWeight: 600,
    lineHeight: '24px',
    color: COLORS.neutral[900],
  },

  /** Stat number: KPI values "$11.01M" — 30px/38px semibold */
  statNumber: {
    fontSize: 30,
    fontWeight: 600,
    lineHeight: '38px',
    letterSpacing: '-0.025em',
    color: COLORS.neutral[900],
  },

  /** Stat label: "Portfolio Value" — 14px/20px medium */
  statLabel: {
    fontSize: 14,
    fontWeight: 500,
    lineHeight: '20px',
    color: COLORS.neutral[600],
  },

  /** Body: primary table text, names — 14px/20px regular */
  body: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: '20px',
    color: COLORS.neutral[700],
  },

  /** Body secondary: descriptions, timestamps — 14px/20px regular */
  bodySecondary: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: '20px',
    color: COLORS.neutral[600],
  },

  /** Small/meta: axis labels, footnotes — 12px/18px regular */
  meta: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: '18px',
    color: COLORS.neutral[500],
  },

  /** Nav item: sidebar labels — 16px/24px regular (active: semibold) */
  navItem: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: '24px',
    color: COLORS.neutral[700],
    activeWeight: 600,
  },

  /** Breadcrumb — 14px/20px semibold */
  breadcrumb: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '20px',
    color: COLORS.neutral[500],
    activeColor: COLORS.neutral[700],
  },

  /** Button — 14px/20px semibold */
  button: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '20px',
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const SPACING = {
  /** Gap between major content sections */
  sectionGap: 32,
  /** Gap between cards in a grid row */
  cardGap: 16,
  /** Padding inside cards */
  cardPadding: 20,
  /** Main content area padding (horizontal) */
  contentPaddingX: 32,
  /** Main content area padding (top) */
  contentPaddingTop: 32,
  /** Sidebar internal padding (horizontal) */
  sidebarPaddingX: 16,
  /** Gap between sidebar nav items */
  navItemGap: 4,
} as const;

// =============================================================================
// LAYOUT
// =============================================================================

export const LAYOUT = {
  /** Sidebar width (expanded with labels) */
  sidebarWidth: 280,
  /** Sidebar width (collapsed, icon-only) — not used in redesign */
  sidebarCollapsed: 68,
  /** Floating chat widget width */
  chatWidgetWidth: 400,
  /** Floating chat widget height (max) */
  chatWidgetMaxHeight: 600,
  /** Floating action buttons offset from top-right */
  floatingActionsTop: 24,
  floatingActionsRight: 32,
} as const;

// =============================================================================
// COMPONENT TOKENS
// =============================================================================

export const COMPONENTS = {
  // ── Cards ─────────────────────────────────────────────────────────
  card: {
    borderRadius: 12,
    background: COLORS.neutral[0],
    border: `1px solid ${COLORS.neutral[200]}`,
    shadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
  },

  // ── Buttons ───────────────────────────────────────────────────────
  buttonPrimary: {
    background: COLORS.brand[600],
    hoverBackground: COLORS.brand[700],
    color: '#FFFFFF',
    borderRadius: 8,
    paddingX: 12,
    paddingY: 8,
    shadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
  },
  buttonSecondary: {
    background: COLORS.neutral[0],
    hoverBackground: COLORS.neutral[50],
    color: COLORS.neutral[700],
    border: `1px solid ${COLORS.neutral[200]}`,
    borderRadius: 8,
    paddingX: 12,
    paddingY: 8,
    shadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
  },

  // ── Pill Tabs ─────────────────────────────────────────────────────
  pillTabContainer: {
    background: COLORS.neutral[100],
    borderRadius: 10,
    border: `1px solid ${COLORS.neutral[200]}`,
    padding: 4,
    gap: 4,
  },
  pillTabActive: {
    background: COLORS.neutral[0],
    borderRadius: 6,
    paddingX: 10,
    paddingY: 6,
    shadow: '0px 1px 2px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.10)',
    fontWeight: 600,
    color: COLORS.neutral[900],
  },
  pillTabInactive: {
    background: 'transparent',
    paddingX: 10,
    paddingY: 6,
    fontWeight: 600,
    color: COLORS.neutral[600],
  },

  // ── Sidebar ───────────────────────────────────────────────────────
  sidebar: {
    width: LAYOUT.sidebarWidth,
    background: COLORS.neutral[0],
    borderRight: `1px solid ${COLORS.neutral[200]}`,
    paddingTop: 20,
    sectionPaddingX: 16,
    sectionPaddingY: 20,
  },
  sidebarItem: {
    padding: 8,
    borderRadius: 6,
    iconSize: 20,
    iconColor: COLORS.neutral[500],
    activeBackground: COLORS.neutral[50],
    activeIconColor: COLORS.brand[600],
    hoverBackground: COLORS.neutral[50],
    gap: 8,
  },
  sidebarBrand: {
    fontSize: 21,
    fontWeight: 700,
    color: COLORS.neutral[900],
  },
  sidebarProfile: {
    nameFontSize: 14,
    nameWeight: 600,
    nameColor: COLORS.neutral[700],
    emailFontSize: 14,
    emailWeight: 400,
    emailColor: COLORS.neutral[500],
  },

  // ── Search Input ──────────────────────────────────────────────────
  searchInput: {
    borderRadius: 8,
    border: `1px solid ${COLORS.neutral[200]}`,
    padding: '8px 12px 8px 40px',
    fontSize: 16,
    background: COLORS.neutral[0],
    placeholderColor: COLORS.neutral[400],
  },

  // ── Floating Chat Widget ──────────────────────────────────────────
  chatWidget: {
    triggerSize: 56,
    triggerBorderRadius: 28,
    triggerBackground: COLORS.brand[600],
    triggerIconColor: '#FFFFFF',
    panelWidth: LAYOUT.chatWidgetWidth,
    panelMaxHeight: LAYOUT.chatWidgetMaxHeight,
    panelBorderRadius: 16,
    panelShadow: '0px 20px 24px -4px rgba(0, 0, 0, 0.08), 0px 8px 8px -4px rgba(0, 0, 0, 0.03)',
    panelBorder: `1px solid ${COLORS.neutral[200]}`,
    headerBackground: COLORS.neutral[0],
    sentBubbleBackground: COLORS.brand[600],
    sentBubbleColor: '#FFFFFF',
    receivedBubbleBackground: COLORS.neutral[100],
    receivedBubbleColor: COLORS.neutral[900],
    bubbleBorderRadius: 12,
    inputBackground: COLORS.neutral[0],
    inputBorder: `1px solid ${COLORS.neutral[200]}`,
  },

  // ── Floating Actions (Save/Reset/Share) ───────────────────────────
  floatingActions: {
    gap: 8,
    position: 'fixed' as const,
    top: LAYOUT.floatingActionsTop,
    right: LAYOUT.floatingActionsRight,
    zIndex: 40,
  },

  // ── Stat Badge (percentage change) ────────────────────────────────
  statBadge: {
    positiveColor: COLORS.success,
    negativeColor: COLORS.error,
    fontSize: 14,
    fontWeight: 500,
  },
} as const;

// =============================================================================
// CHART TOKENS (replaces CHART_STYLE partially)
// =============================================================================

export const CHART_TOKENS = {
  /** Reduced axis ticks — show bookends + a few midpoints */
  xAxis: {
    tick: {
      fontSize: 12,
      fill: COLORS.neutral[500],
      fontFamily: TYPOGRAPHY.fontFamily,
    },
    axisLine: false as const,
    tickLine: false as const,
    /** For 20-year timelines: show every 5th year */
    interval: 'preserveStartEnd' as const,
  },
  yAxis: {
    tick: {
      fontSize: 12,
      fill: COLORS.neutral[500],
      fontFamily: TYPOGRAPHY.fontFamily,
    },
    axisLine: false as const,
    tickLine: false as const,
    width: 55,
    /** Show 3-4 reference ticks max */
    tickCount: 4,
  },
  grid: {
    strokeDasharray: '0',
    stroke: COLORS.chart.grid,
    strokeOpacity: 0.6,
    vertical: false as const,
  },
  lineStrokeWidth: 2,
  lineStrokeWidthLight: 1.5,
  dashedPattern: '6 3',
  /** Tooltip card styling */
  tooltip: {
    background: COLORS.neutral[0],
    border: `1px solid ${COLORS.neutral[200]}`,
    borderRadius: 8,
    shadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.06)',
    padding: '12px 16px',
    labelColor: COLORS.neutral[600],
    valueColor: COLORS.neutral[900],
    valueFontWeight: 600,
  },
} as const;
