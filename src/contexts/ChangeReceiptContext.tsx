/**
 * Change Receipt — transient feedback for dashboard table edits.
 *
 * Editable tables call notifyEdit(source) when the user changes a value. The
 * provider snapshots the headline plan metrics at that moment, waits for the
 * engine to recompute, diffs, and publishes a one-line receipt ("Equity 2045
 * +$240k · Cashflow +$3.3k/yr") that the edited table renders beneath itself
 * for a few seconds before it fades.
 *
 * Only explicit notifyEdit calls arm a receipt — scenario loads, client
 * switches, and chat-driven changes never trigger one.
 */
import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';

export interface ReceiptPropertyState {
  instanceId: string;
  /** Purchase year, or null when the property can't be placed */
  year: number | null;
  challenging: boolean;
}

export interface ReceiptMetrics {
  horizonYear: number;
  totalEquity: number;
  netCashflowAnnual: number;
  borrowingHeadroom: number;
  properties: ReceiptPropertyState[];
}

export interface ReceiptItem {
  text: string;
  /** Signed delta rendered emphasised next to the text, e.g. "+$240k" */
  delta?: string;
  positive?: boolean;
}

export interface ChangeReceipt {
  source: string;
  items: ReceiptItem[];
  id: number;
  expiring: boolean;
}

const fmtMoney = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}m`;
  if (abs >= 100_000) return `$${Math.round(abs / 1_000)}k`;
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(1)}k`;
  return `$${Math.round(abs)}`;
};
const fmtDelta = (v: number) => `${v >= 0 ? '+' : '−'}${fmtMoney(v)}`;

export function diffMetrics(before: ReceiptMetrics, after: ReceiptMetrics): ReceiptItem[] {
  const items: ReceiptItem[] = [];

  const dEquity = after.totalEquity - before.totalEquity;
  if (Math.abs(dEquity) >= 1_000) {
    items.push({ text: `Equity ${after.horizonYear}`, delta: fmtDelta(dEquity), positive: dEquity > 0 });
  }
  const dCf = after.netCashflowAnnual - before.netCashflowAnnual;
  if (Math.abs(dCf) >= 500) {
    items.push({ text: 'Cashflow', delta: `${fmtDelta(dCf)}/yr`, positive: dCf > 0 });
  }
  const dBc = after.borrowingHeadroom - before.borrowingHeadroom;
  if (Math.abs(dBc) >= 1_000) {
    items.push({ text: 'Borrowing headroom', delta: fmtDelta(dBc), positive: dBc > 0 });
  }

  // Discrete outcomes: purchase year moved, affordability alert flipped
  after.properties.forEach((p, i) => {
    const prev = before.properties.find(b => b.instanceId === p.instanceId);
    if (!prev) return;
    const label = `Property ${i + 1}`;
    if (prev.year !== p.year) {
      if (p.year === null) items.push({ text: `${label} no longer places within the timeline`, positive: false });
      else if (prev.year === null) items.push({ text: `${label} now buys in ${p.year}`, positive: true });
      else items.push({ text: `${label} buys in ${p.year} (was ${prev.year})`, positive: p.year < prev.year });
    }
    if (prev.challenging !== p.challenging) {
      items.push(
        p.challenging
          ? { text: `${label} now shows an affordability alert`, positive: false }
          : { text: `${label} affordability alert cleared`, positive: true }
      );
    }
  });

  return items;
}

interface ChangeReceiptContextValue {
  notifyEdit: (source: string) => void;
  receipt: ChangeReceipt | null;
}

const ChangeReceiptContext = createContext<ChangeReceiptContextValue | null>(null);

/** Safe everywhere — a no-op outside the provider */
export const useChangeReceipt = (): ChangeReceiptContextValue => {
  const ctx = useContext(ChangeReceiptContext);
  return ctx ?? { notifyEdit: () => {}, receipt: null };
};

/** How long an armed edit waits for the engine to produce a change */
const PENDING_WINDOW_MS = 4_000;
/** How long the receipt shows before fading out */
const SHOW_MS = 5_500;
const FADE_MS = 500;

export const ChangeReceiptProvider: React.FC<{ metrics: ReceiptMetrics; children: React.ReactNode }> = ({ metrics, children }) => {
  const metricsRef = useRef(metrics);
  const pendingRef = useRef<{ source: string; baseline: ReceiptMetrics; ts: number } | null>(null);
  const [receipt, setReceipt] = useState<ChangeReceipt | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Snapshot happens here: the handler fires before React re-renders, so
  // metricsRef still holds the pre-edit engine output.
  const notifyEdit = useCallback((source: string) => {
    pendingRef.current = { source, baseline: metricsRef.current, ts: Date.now() };
  }, []);

  useEffect(() => {
    metricsRef.current = metrics;
    const pending = pendingRef.current;
    if (!pending) return;
    if (Date.now() - pending.ts > PENDING_WINDOW_MS) {
      pendingRef.current = null;
      return;
    }
    const items = diffMetrics(pending.baseline, metrics);
    if (items.length === 0) return; // engine may not have recomputed yet — keep waiting
    pendingRef.current = null;
    timersRef.current.forEach(clearTimeout);
    setReceipt({ source: pending.source, items, id: Date.now(), expiring: false });
    timersRef.current = [
      setTimeout(() => setReceipt(r => (r ? { ...r, expiring: true } : r)), SHOW_MS),
      setTimeout(() => setReceipt(null), SHOW_MS + FADE_MS),
    ];
  }, [metrics]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  return (
    <ChangeReceiptContext.Provider value={{ notifyEdit, receipt }}>
      {children}
    </ChangeReceiptContext.Provider>
  );
};
