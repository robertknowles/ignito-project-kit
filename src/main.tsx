import React from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './AppRouter';

/**
 * One-time wipe of legacy scenario-state localStorage keys.
 *
 * The app no longer auto-persists scenario state to localStorage; persistence
 * happens only when the BA explicitly saves a scenario (which writes to
 * Supabase). Old sessions may have orphaned keys like `property_selections_14`,
 * `property_order_14`, `pause_blocks_14`, `timeline_loan_types_14`, etc.
 * Clear them once on app startup so they don't sit around indefinitely.
 *
 * The flag below stops the wipe from running on every reload. After a single
 * successful run it short-circuits.
 */
const LEGACY_WIPE_FLAG = 'proppath_legacy_scenario_wipe_v1';
if (typeof window !== 'undefined' && !localStorage.getItem(LEGACY_WIPE_FLAG)) {
  const legacyPrefixes = [
    'property_selections_',
    'property_order_',
    'pause_blocks_',
    'custom_blocks_',
    'event_blocks_',
    'timeline_loan_types_',
  ];
  Object.keys(localStorage).forEach((key) => {
    if (legacyPrefixes.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  });
  localStorage.setItem(LEGACY_WIPE_FLAG, '1');
}

const root = createRoot(document.getElementById('root')!);
root.render(<AppRouter />);
