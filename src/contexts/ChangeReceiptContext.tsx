/**
 * Change Receipt - Pipedrive-style change log for dashboard edits.
 *
 * Editable tables call notifyEdit(source, detail) when the user changes a
 * value. The provider snapshots the headline plan metrics at that moment,
 * waits for the engine to recompute, diffs, and appends an entry ("Equity
 * 2045 +$240k · Cashflow +$3.3k/yr") to the change log. The TopBar bell turns
 * amber with a red unread counter; clicking it opens the right-side panel.
 *
 * Rapid edits to the SAME field (e.g. typing "350000" one keystroke at a
 * time) merge into a single entry: the diff re-runs against the baseline
 * captured before the FIRST keystroke, and the cause line shows the original
 * value → the final value. Typing back to the original removes the entry.
 *
 * Only explicit notifyEdit calls produce entries - scenario loads and client
 * switches never do.
 *
 * AI decisions (timing hints, dropped properties) from the plan-review brief
 * are logged via queueAiInsight: the brief renders OUTSIDE the provider (and
 * approving a plan remounts it), so insights sit in a module-level queue that
 * the provider drains on mount and on the 'pp-ai-insight' window event.
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
  /** Which headline metric this delta belongs to (for session totals) */
  kind?: 'equity' | 'cashflow' | 'headroom';
  /** Raw signed delta in dollars (for session totals) */
  value?: number;
}

/**
 * Structured description of a field edit. Passing this (rather than a
 * pre-composed string) lets consecutive edits to the same field merge.
 * Plain strings are accepted for non-field events ("Existing property
 * added") and never merge.
 */
export interface EditDetail {
  subject: string;
  fieldLabel: string;
  from?: unknown;
  to?: unknown;
}

export interface ChangeLogEntry {
  id: number;
  /** Which table produced the edit, e.g. 'purchases' | 'existing-portfolio' | 'brief' */
  source: string;
  /** Human cause line, e.g. "Marley St - Refi turned on" */
  summary?: string;
  items: ReceiptItem[];
  timestamp: number;
  /** Internal: original detail + pre-edit metrics, kept for burst merging */
  detail?: EditDetail | string;
  baseline: ReceiptMetrics;
}

const fmtMoney = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}m`;
  if (abs >= 100_000) return `$${Math.round(abs / 1_000)}k`;
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(1)}k`;
  return `$${Math.round(abs)}`;
};
export const formatDelta = (v: number) => `${v >= 0 ? '+' : '−'}${fmtMoney(v)}`;
const fmtDelta = formatDelta;

/**
 * Compose a cause line for a field edit, e.g.
 *   "Marley St - Refi turned on"
 *   "Property 3 - Rent/wk ($) 480 → 520"
 */
export function describeFieldEdit(subject: string, fieldLabel: string, from: unknown, to: unknown): string {
  if (typeof to === 'boolean') return `${subject} - ${fieldLabel} turned ${to ? 'on' : 'off'}`;
  // Years (2035) read wrong with separators - only localize genuinely big numbers
  const fmt = (v: unknown) =>
    v === null || v === undefined || v === '' ? '-'
      : typeof v === 'number' ? (Math.abs(v) >= 10_000 ? v.toLocaleString('en-AU') : String(v))
      : String(v);
  if (from === null || from === undefined || from === '' || from === to) {
    return `${subject} - ${fieldLabel} set to ${fmt(to)}`;
  }
  return `${subject} - ${fieldLabel} ${fmt(from)} → ${fmt(to)}`;
}

const summarize = (detail?: EditDetail | string): string | undefined => {
  if (!detail) return undefined;
  if (typeof detail === 'string') return detail;
  return describeFieldEdit(detail.subject, detail.fieldLabel, detail.from, detail.to);
};

// ── AI-insight queue ─────────────────────────────────────────────────────────
// The confirmation brief lives outside the provider, so its insights queue
// here until a mounted provider drains them into the log.

interface QueuedInsight {
  summary?: string;
  items: ReceiptItem[];
}

let aiInsightQueue: QueuedInsight[] = [];
const AI_INSIGHT_EVENT = 'pp-ai-insight';

/** Log an AI decision (e.g. "Property 2 could buy in 2027") to the change bell. */
export function queueAiInsight(summary: string | undefined, items: ReceiptItem[]) {
  if (items.length === 0) return;
  aiInsightQueue.push({ summary, items });
  window.dispatchEvent(new Event(AI_INSIGHT_EVENT));
}

/** Same source + subject + field ⇒ candidates for burst merging */
const mergeKeyOf = (source: string, detail?: EditDetail | string): string | null =>
  detail && typeof detail === 'object' ? `${source}|${detail.subject}|${detail.fieldLabel}` : null;

export function diffMetrics(before: ReceiptMetrics, after: ReceiptMetrics): ReceiptItem[] {
  const items: ReceiptItem[] = [];

  const dEquity = after.totalEquity - before.totalEquity;
  if (Math.abs(dEquity) >= 1_000) {
    items.push({ text: `Equity ${after.horizonYear}`, delta: fmtDelta(dEquity), positive: dEquity > 0, kind: 'equity', value: dEquity });
  }
  const dCf = after.netCashflowAnnual - before.netCashflowAnnual;
  if (Math.abs(dCf) >= 500) {
    items.push({ text: 'Cashflow', delta: `${fmtDelta(dCf)}/yr`, positive: dCf > 0, kind: 'cashflow', value: dCf });
  }
  const dBc = after.borrowingHeadroom - before.borrowingHeadroom;
  if (Math.abs(dBc) >= 1_000) {
    items.push({ text: 'Borrowing headroom', delta: fmtDelta(dBc), positive: dBc > 0, kind: 'headroom', value: dBc });
  }

  // Discrete outcomes: purchase timing moved, affordability alert flipped
  after.properties.forEach((p, i) => {
    const prev = before.properties.find(b => b.instanceId === p.instanceId);
    if (!prev) return;
    const label = `Property ${i + 1}`;
    if (prev.year !== p.year) {
      if (p.year === null) items.push({ text: `${label} no longer fits within the timeline`, positive: false });
      else if (prev.year === null) items.push({ text: `${label} now fits - buys in ${p.year}`, positive: true });
      else if (p.year < prev.year) items.push({ text: `${label} can be purchased earlier - ${p.year} (was ${prev.year})`, positive: true });
      else items.push({ text: `${label} must be purchased later - ${p.year} (was ${prev.year})`, positive: false });
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
  notifyEdit: (source: string, detail?: EditDetail | string) => void;
  history: ChangeLogEntry[];
  unreadCount: number;
  panelOpen: boolean;
  togglePanel: () => void;
  closePanel: () => void;
  clearHistory: () => void;
}

const NOOP_VALUE: ChangeReceiptContextValue = {
  notifyEdit: () => {},
  history: [],
  unreadCount: 0,
  panelOpen: false,
  togglePanel: () => {},
  closePanel: () => {},
  clearHistory: () => {},
};

const ChangeReceiptContext = createContext<ChangeReceiptContextValue | null>(null);

/** Safe everywhere - a no-op outside the provider */
export const useChangeReceipt = (): ChangeReceiptContextValue => {
  const ctx = useContext(ChangeReceiptContext);
  return ctx ?? NOOP_VALUE;
};

/** How long an armed edit waits for the engine to produce a change */
const PENDING_WINDOW_MS = 4_000;
/** Edits to the same field within this rolling window merge into one entry */
const MERGE_WINDOW_MS = 10_000;
/** Most recent entries kept in the log */
const MAX_ENTRIES = 50;

export const ChangeReceiptProvider: React.FC<{ metrics: ReceiptMetrics; children: React.ReactNode }> = ({ metrics, children }) => {
  const metricsRef = useRef(metrics);
  const pendingRef = useRef<{ source: string; detail?: EditDetail | string; baseline: ReceiptMetrics; ts: number } | null>(null);
  const [history, setHistory] = useState<ChangeLogEntry[]>([]);
  const historyRef = useRef(history);
  historyRef.current = history;
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;

  // Snapshot happens here: the handler fires before React re-renders, so
  // metricsRef still holds the pre-edit engine output. If this edit continues
  // a burst on the same field, keep the burst's original baseline and "from"
  // value so the eventual entry reads first-value → final-value.
  const notifyEdit = useCallback((source: string, detail?: EditDetail | string) => {
    const key = mergeKeyOf(source, detail);
    const prev = pendingRef.current;
    if (prev && key && mergeKeyOf(prev.source, prev.detail) === key && Date.now() - prev.ts < MERGE_WINDOW_MS) {
      pendingRef.current = {
        source,
        detail: { ...(detail as EditDetail), from: (prev.detail as EditDetail).from },
        baseline: prev.baseline,
        ts: Date.now(),
      };
      return;
    }
    pendingRef.current = { source, detail, baseline: metricsRef.current, ts: Date.now() };
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
    if (items.length === 0) return; // engine may not have recomputed yet - keep waiting
    pendingRef.current = null;

    const now = Date.now();
    const current = historyRef.current;
    const top = current[0];
    const key = mergeKeyOf(pending.source, pending.detail);

    // Burst continuation: the previous entry was the same field moments ago -
    // replace it, re-diffing against ITS pre-burst baseline.
    if (top && key && mergeKeyOf(top.source, top.detail) === key && now - top.timestamp < MERGE_WINDOW_MS) {
      const mergedDetail: EditDetail = {
        ...(pending.detail as EditDetail),
        from: (top.detail as EditDetail).from,
      };
      const mergedItems = diffMetrics(top.baseline, metrics);
      const rest = current.slice(1);
      // Typed back to the original value - net zero, drop the entry entirely
      const next = mergedItems.length === 0
        ? rest
        : [{ id: top.id, source: pending.source, summary: summarize(mergedDetail), items: mergedItems, timestamp: now, detail: mergedDetail, baseline: top.baseline }, ...rest];
      historyRef.current = next;
      setHistory(next);
      return; // merged updates never re-increment unread
    }

    const next = [
      { id: now, source: pending.source, summary: summarize(pending.detail), items, timestamp: now, detail: pending.detail, baseline: pending.baseline },
      ...current,
    ].slice(0, MAX_ENTRIES);
    historyRef.current = next;
    setHistory(next);
    if (!panelOpenRef.current) setUnreadCount(c => c + 1);
  }, [metrics]);

  // Drain queued AI insights - on mount (the brief unmounts the provider, so
  // approve-time insights land here) and whenever a new one is queued live.
  useEffect(() => {
    const drain = () => {
      if (aiInsightQueue.length === 0) return;
      const drained = aiInsightQueue;
      aiInsightQueue = [];
      const now = Date.now();
      const entries: ChangeLogEntry[] = drained.map((q, i) => ({
        id: now + i,
        source: 'ai',
        summary: q.summary,
        items: q.items,
        timestamp: now,
        baseline: metricsRef.current,
      }));
      const next = [...entries.reverse(), ...historyRef.current].slice(0, MAX_ENTRIES);
      historyRef.current = next;
      setHistory(next);
      if (!panelOpenRef.current) setUnreadCount(c => c + entries.length);
    };
    drain();
    window.addEventListener(AI_INSIGHT_EVENT, drain);
    return () => window.removeEventListener(AI_INSIGHT_EVENT, drain);
  }, []);

  const togglePanel = useCallback(() => {
    setPanelOpen(open => {
      if (!open) setUnreadCount(0); // opening marks everything read
      return !open;
    });
  }, []);

  const closePanel = useCallback(() => setPanelOpen(false), []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    historyRef.current = [];
    setUnreadCount(0);
  }, []);

  return (
    <ChangeReceiptContext.Provider value={{ notifyEdit, history, unreadCount, panelOpen, togglePanel, closePanel, clearHistory }}>
      {children}
    </ChangeReceiptContext.Provider>
  );
};
