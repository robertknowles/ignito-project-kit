/**
 * Change log bell + panel (Pipedrive-style).
 *
 * ChangeLogBell sits in the TopBar: amber with a red unread counter while
 * there are unseen changes, neutral otherwise. Clicking toggles
 * ChangeLogPanel - a thin right-side panel listing what each table edit did
 * to the plan (equity / cashflow / headroom deltas + outcome changes).
 */
import React from 'react';
import { Bell, X } from 'lucide-react';
import { useChangeReceipt, formatDelta, type ChangeLogEntry } from '@/contexts/ChangeReceiptContext';

const SOURCE_LABELS: Record<string, string> = {
  purchases: 'Purchases',
  'existing-portfolio': 'Existing portfolio',
  brief: 'Next purchase brief',
  ai: 'AI insight',
};

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Net continuous deltas across every entry in the log */
const sessionTotals = (history: ChangeLogEntry[]) => {
  const sums = { equity: 0, cashflow: 0, headroom: 0 };
  history.forEach(e => e.items.forEach(item => {
    if (item.kind && typeof item.value === 'number') sums[item.kind] += item.value;
  }));
  const parts: { label: string; sum: number; suffix?: string }[] = [
    { label: 'Equity', sum: sums.equity },
    { label: 'Cashflow', sum: sums.cashflow, suffix: '/yr' },
    { label: 'Headroom', sum: sums.headroom },
  ];
  return parts.filter(p => Math.abs(p.sum) >= 500);
};

export const ChangeLogBell: React.FC = () => {
  const { unreadCount, panelOpen, togglePanel } = useChangeReceipt();
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={togglePanel}
      title="Recent changes"
      className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition-colors shadow-sm ${
        hasUnread
          ? 'bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100'
          : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
      } ${panelOpen ? 'ring-1 ring-neutral-300' : ''}`}
    >
      <Bell size={15} />
      {/* Shimmer sweep while unread - same attention pattern as the Retirement
          sell button. Inner clipped layer so the badge (outside the button
          bounds) isn't cut off. */}
      {hasUnread && <span className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none bell-shimmer" />}
      {hasUnread && (
        <span
          key={unreadCount}
          className="absolute flex items-center justify-center rounded-full bg-red-500 text-white font-semibold"
          style={{ top: -5, right: -5, minWidth: 15, height: 15, padding: '0 3px', fontSize: 9, lineHeight: '15px', animation: 'bellPop 0.25s ease-out' }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
      <style>{`
        @keyframes bellPop { from { transform: scale(0.4); } to { transform: scale(1); } }
        .bell-shimmer::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 45%;
          left: -50%;
          background: linear-gradient(105deg, transparent, rgba(245, 158, 11, 0.22), transparent);
          animation: bellShimmer 7s ease-in-out infinite;
        }
        @keyframes bellShimmer {
          0% { left: -50%; }
          14% { left: 110%; }
          100% { left: 110%; }
        }
      `}</style>
    </button>
  );
};

export const ChangeLogPanel: React.FC = () => {
  const { history, panelOpen, closePanel, clearHistory } = useChangeReceipt();

  // Docked, not overlaid: the panel is a flex sibling of the dashboard's
  // scroll area, so opening it gives the content its own narrower lane
  // instead of covering it. Width animates; the inner column stays at full
  // width so text doesn't reflow during the slide.
  return (
    <div
      className="h-full flex-shrink-0"
      style={{
        width: panelOpen ? 340 : 0,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        background: '#FFFFFF',
        borderLeft: panelOpen ? '1px solid #E5E5E5' : 'none',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div className="h-full flex flex-col" style={{ width: 340 }}>

      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F5F5F5' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#404040' }}>Recent changes</span>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="hover:text-neutral-600 transition-colors"
              style={{ fontSize: 11, color: '#A3A3A3' }}
            >
              Clear
            </button>
          )}
          <button onClick={closePanel} className="text-neutral-400 hover:text-neutral-600 transition-colors" title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      {history.length > 0 && (() => {
        const totals = sessionTotals(history);
        return (
          <div className="px-4 py-2.5" style={{ background: '#FAFAFA', borderBottom: '1px solid #F5F5F5' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#A3A3A3', marginBottom: totals.length > 0 ? 3 : 0 }}>
              This session · {history.length} {history.length === 1 ? 'edit' : 'edits'}
            </div>
            {totals.length > 0 && (
              <div style={{ fontSize: 12, color: '#717680', lineHeight: '17px' }}>
                {totals.map((t, i) => (
                  <span key={t.label}>
                    {i > 0 && <span style={{ color: '#A3A3A3' }}> · </span>}
                    {t.label} <span style={{ fontWeight: 600, color: t.sum > 0 ? '#16A34A' : '#DC2626' }}>{formatDelta(t.sum)}{t.suffix ?? ''}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div style={{ fontSize: 12, color: '#A3A3A3', padding: '28px 16px', textAlign: 'center', lineHeight: '18px' }}>
            Edits that change the plan - and AI decisions about it - will appear here.
          </div>
        ) : (
          history.map(entry => (
            <div key={entry.id} className="px-4 py-3" style={{ borderBottom: '1px solid #F5F5F5' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#A3A3A3' }}>
                  {SOURCE_LABELS[entry.source] ?? entry.source}
                </span>
                <span style={{ fontSize: 10, color: '#A3A3A3' }}>{formatTime(entry.timestamp)}</span>
              </div>
              {entry.summary && (
                <div style={{ fontSize: 12, fontWeight: 500, color: '#404040', lineHeight: '17px', marginBottom: 4 }}>
                  {entry.summary}
                </div>
              )}
              {entry.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2" style={{ fontSize: 12, color: '#717680', lineHeight: '18px' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: item.positive === false ? '#F87171' : '#22C55E', flexShrink: 0, marginTop: 6 }} />
                  <span>
                    {item.text}
                    {item.delta && (
                      <> <span style={{ fontWeight: 600, color: item.positive ? '#16A34A' : '#DC2626' }}>{item.delta}</span></>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      </div>
    </div>
  );
};
