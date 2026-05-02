/**
 * Property Cells — single source of truth for the 10-cell type×mode matrix.
 *
 * Replaces the 8-template model and the propertyTypeBuckets display layer.
 * Each cell is a research-defensible (Type × Mode) configuration with its
 * own assumption defaults. Strategy presets bias toward specific cells.
 *
 * See STRATEGY-PIVOT-PLAN.md for the canonical matrix and preset bias table.
 */

// ── Cell identity ──────────────────────────────────────────────────

export type CellId =
  | 'metro-house-growth'
  | 'metro-house-cashflow'
  | 'regional-house-growth'
  | 'regional-house-cashflow'
  | 'metro-unit-growth'
  | 'metro-unit-cashflow'
  | 'regional-unit-growth'
  | 'regional-unit-cashflow'
  | 'commercial-high-cost'
  | 'commercial-low-cost';

export const CELL_IDS: CellId[] = [
  'metro-house-growth',
  'metro-house-cashflow',
  'regional-house-growth',
  'regional-house-cashflow',
  'metro-unit-growth',
  'metro-unit-cashflow',
  'regional-unit-growth',
  'regional-unit-cashflow',
  'commercial-high-cost',
  'commercial-low-cost',
];

export type Mode = 'Growth' | 'Cashflow' | 'HighCost' | 'LowCost';

export type CellType =
  | 'Metro House'
  | 'Regional House'
  | 'Metro Unit'
  | 'Regional Unit'
  | 'Commercial';

interface CellMeta {
  type: CellType;
  mode: Mode;
}

const CELL_META: Record<CellId, CellMeta> = {
  'metro-house-growth':       { type: 'Metro House',    mode: 'Growth' },
  'metro-house-cashflow':     { type: 'Metro House',    mode: 'Cashflow' },
  'regional-house-growth':    { type: 'Regional House', mode: 'Growth' },
  'regional-house-cashflow':  { type: 'Regional House', mode: 'Cashflow' },
  'metro-unit-growth':        { type: 'Metro Unit',     mode: 'Growth' },
  'metro-unit-cashflow':      { type: 'Metro Unit',     mode: 'Cashflow' },
  'regional-unit-growth':     { type: 'Regional Unit',  mode: 'Growth' },
  'regional-unit-cashflow':   { type: 'Regional Unit',  mode: 'Cashflow' },
  'commercial-high-cost':     { type: 'Commercial',     mode: 'HighCost' },
  'commercial-low-cost':      { type: 'Commercial',     mode: 'LowCost' },
};

export const getCellType = (cellId: CellId): CellType => CELL_META[cellId].type;
export const getCellMode = (cellId: CellId): Mode => CELL_META[cellId].mode;

/**
 * Display label for a cell, e.g. "Metro House Growth" or "Commercial High Cost".
 * Used in property cards and chat references.
 */
export const getCellDisplayLabel = (cellId: CellId): string => {
  const { type, mode } = CELL_META[cellId];
  const modeLabel = mode === 'HighCost' ? 'High Cost' : mode === 'LowCost' ? 'Low Cost' : mode;
  return `${type} ${modeLabel}`;
};

export const isCellId = (value: string): value is CellId =>
  (CELL_IDS as string[]).includes(value);

// ── Strategy presets ───────────────────────────────────────────────

export type StrategyPresetId =
  | 'eg-low'
  | 'eg-high'
  | 'cf-low'
  | 'cf-high'
  | 'commercial-transition';

export type PacingMode = 'conservative' | 'moderate' | 'aggressive';

export interface StrategyPresetMeta {
  id: StrategyPresetId;
  shortLabel: string;
  fullLabel: string;
  description: string;
  /** Cells preferred when synthesising this preset's portfolio. */
  primary: CellId[];
  /** Fallback cells when primary cells don't fit (e.g. for serviceability). */
  secondary: CellId[];
  /** Two-phase presets (Commercial Transition) split bias by phase. */
  phase1?: CellId[];
  phase2?: CellId[];
  /**
   * LVR target at acquisition for this preset (architectural — preset-driven,
   * not cell-driven). Cell defaults remain as fallbacks for the rare path
   * where no preset is selected. Per BA-research consensus: 80% across
   * residential presets; commercial-transition splits 80% Phase 1 / 70% Phase 2.
   */
  lvrTarget: number;
  /** Phase-2 LVR target for two-phase presets (commercial-transition). */
  phase2LvrTarget?: number;
  /**
   * Default Pacing Mode for this preset. Most presets default 'aggressive'
   * (sales tool: ambitious-but-achievable plans, infeasibility flagged honestly).
   * cf-high defaults 'moderate' — Property Couch retire-on-yield is a
   * fundamentally conservative thesis. BA can override via chat hint.
   */
  defaultPacing: PacingMode;
}

export const STRATEGY_PRESETS: Record<StrategyPresetId, StrategyPresetMeta> = {
  'eg-low': {
    id: 'eg-low',
    shortLabel: 'Equity Growth, Low Price',
    fullLabel: 'Equity Growth, Low Price Point',
    description: 'Scale through volume. Multiple growth-mode assets at lower entry per property.',
    primary: ['regional-house-growth', 'metro-unit-growth'],
    secondary: ['regional-unit-growth'],
    lvrTarget: 80,
    defaultPacing: 'aggressive',
  },
  'eg-high': {
    id: 'eg-high',
    shortLabel: 'Equity Growth, High Price',
    fullLabel: 'Equity Growth, High Price Point',
    description: 'Concentrate in fewer larger assets. Stronger land content, larger equity per asset.',
    primary: ['metro-house-growth'],
    secondary: ['metro-unit-growth'],
    lvrTarget: 80,
    defaultPacing: 'aggressive',
  },
  'cf-high': {
    id: 'cf-high',
    shortLabel: 'Cash Flow, High Price',
    fullLabel: 'Cash Flow, High Price Point',
    description: 'Strong yield at scale. Premium tenants, improves DSR.',
    primary: ['metro-house-cashflow', 'commercial-high-cost'],
    secondary: ['regional-house-cashflow'],
    lvrTarget: 80,
    defaultPacing: 'moderate',
  },
  'cf-low': {
    id: 'cf-low',
    shortLabel: 'Cash Flow, Low Price',
    fullLabel: 'Cash Flow, Low Price Point',
    description: 'Minimise cash flow gap. Yield-focused, accept higher property count.',
    primary: ['regional-unit-cashflow', 'regional-house-cashflow'],
    secondary: ['commercial-low-cost'],
    lvrTarget: 80,
    defaultPacing: 'aggressive',
  },
  'commercial-transition': {
    id: 'commercial-transition',
    shortLabel: 'Commercial Transition',
    fullLabel: 'Commercial Transition',
    description: 'Two-phase. Phase 1: build equity in residential. Phase 2: pivot to commercial yield.',
    primary: [],
    secondary: [],
    phase1: ['metro-house-growth', 'regional-house-growth'],
    phase2: ['commercial-high-cost', 'commercial-low-cost'],
    lvrTarget: 80,
    phase2LvrTarget: 70,
    defaultPacing: 'aggressive',
  },
};

/**
 * Get the LVR target for a preset (preset-driven, not cell-driven).
 * For two-phase presets, phase 1 uses lvrTarget, phase 2 uses phase2LvrTarget.
 */
export const getPresetLvrTarget = (
  presetId: StrategyPresetId,
  phase: 1 | 2 = 1
): number => {
  const meta = STRATEGY_PRESETS[presetId];
  if (phase === 2 && meta.phase2LvrTarget !== undefined) return meta.phase2LvrTarget;
  return meta.lvrTarget;
};

/**
 * Get the default Pacing Mode for a preset. Used to seed profile.pacingMode
 * when a BA selects (or switches to) a preset.
 */
export const getPresetDefaultPacing = (presetId: StrategyPresetId): PacingMode =>
  STRATEGY_PRESETS[presetId].defaultPacing;

export const getCellsForPreset = (
  presetId: StrategyPresetId
): { primary: CellId[]; secondary: CellId[]; phase1?: CellId[]; phase2?: CellId[] } => {
  const meta = STRATEGY_PRESETS[presetId];
  return {
    primary: meta.primary,
    secondary: meta.secondary,
    phase1: meta.phase1,
    phase2: meta.phase2,
  };
};

// ── Legacy migration ───────────────────────────────────────────────

/**
 * Maps old property-defaults.json keys (the 8-template model) to new cell IDs.
 * Used at scenario-load time to translate saved data without rewriting the
 * database. Drop `larger-blocks-10-20-units` to `commercial-high-cost` per D1.
 */
export const LEGACY_TYPE_KEY_MAP: Record<string, CellId> = {
  'units-apartments':           'metro-unit-cashflow',
  'villas-townhouses':          'metro-unit-growth',
  'houses-regional':            'regional-house-growth',
  'duplexes':                   'regional-house-cashflow',
  'small-blocks-3-4-units':     'metro-unit-cashflow',
  'metro-houses':               'metro-house-growth',
  'larger-blocks-10-20-units':  'commercial-high-cost',
  'commercial-property':        'commercial-low-cost',
};

/**
 * Maps the old positional engine IDs (`property_0` ... `property_7`) to new
 * cell IDs, preserving the JSON key order from the pre-pivot
 * property-defaults.json. Used to translate saved instance IDs of the form
 * `property_N_instance_M` → `<cellId>_instance_M`.
 */
export const LEGACY_POSITIONAL_MAP: Record<string, CellId> = {
  property_0: 'metro-unit-cashflow',     // units-apartments
  property_1: 'metro-unit-growth',       // villas-townhouses
  property_2: 'regional-house-growth',   // houses-regional
  property_3: 'regional-house-cashflow', // duplexes
  property_4: 'metro-unit-cashflow',     // small-blocks-3-4-units
  property_5: 'metro-house-growth',      // metro-houses
  property_6: 'commercial-high-cost',    // larger-blocks-10-20-units
  property_7: 'commercial-low-cost',     // commercial-property
};

interface LegacyTranslation {
  newCellId: CellId;
  inferredMode: Mode;
}

/**
 * Translate an old property type key to its new cell ID + mode.
 * Returns null if the key is already a new cell ID (no translation needed).
 */
export const translateLegacyTypeKey = (oldKey: string): LegacyTranslation | null => {
  if (isCellId(oldKey)) return null;
  const newCellId = LEGACY_TYPE_KEY_MAP[oldKey];
  if (!newCellId) return null;
  return { newCellId, inferredMode: getCellMode(newCellId) };
};

/**
 * Translate an old positional engine ID (property_N) to its new cell ID.
 * Returns null if the input is already a new cell ID.
 */
export const translateLegacyEngineId = (oldEngineId: string): CellId | null => {
  if (isCellId(oldEngineId)) return null;
  return LEGACY_POSITIONAL_MAP[oldEngineId] ?? null;
};

/**
 * Translate an old instance ID (`property_N_instance_M` or `<oldKey>_instance_M`)
 * to its new form (`<cellId>_instance_M`). Returns the input unchanged if it's
 * already in the new form.
 */
export const translateLegacyInstanceId = (oldInstanceId: string): string => {
  // Match pattern: <type>_instance_<index>
  const match = oldInstanceId.match(/^(.+)_instance_(\d+)$/);
  if (!match) return oldInstanceId;

  const [, typePart, indexPart] = match;

  // Already a new cell ID — no translation needed
  if (isCellId(typePart)) return oldInstanceId;

  // Try positional map first (property_N), then legacy key map (e.g. duplexes)
  const newCellId = LEGACY_POSITIONAL_MAP[typePart] ?? LEGACY_TYPE_KEY_MAP[typePart];
  if (!newCellId) return oldInstanceId;

  return `${newCellId}_instance_${indexPart}`;
};
