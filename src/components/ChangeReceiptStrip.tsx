/**
 * Renders the latest change receipt beneath the table that produced it.
 * `source` must match the string the table passed to notifyEdit().
 */
import React from 'react';
import { useChangeReceipt } from '@/contexts/ChangeReceiptContext';

const MAX_ITEMS = 4;

export const ChangeReceiptStrip: React.FC<{ source: string; className?: string }> = ({ source, className }) => {
  const { receipt } = useChangeReceipt();
  if (!receipt || receipt.source !== source) return null;

  const shown = receipt.items.slice(0, MAX_ITEMS);
  const overflow = receipt.items.length - shown.length;

  return (
    <div
      key={receipt.id}
      className={`flex items-start gap-2 ${className ?? ''}`}
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        lineHeight: '17px',
        color: '#737373',
        background: '#FAFAFA',
        boxShadow: '#E5E5E5 0px 0px 0px 1px inset',
        borderRadius: 8,
        padding: '7px 12px',
        opacity: receipt.expiring ? 0 : 1,
        transition: 'opacity 0.5s ease',
        animation: 'receiptIn 0.25s ease-out',
      }}
    >
      <style>{'@keyframes receiptIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }'}</style>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0, marginTop: 5 }} />
      <span>
        {shown.map((item, i) => (
          <span key={i}>
            {i > 0 && <span style={{ color: '#A3A3A3' }}> · </span>}
            {item.text}
            {item.delta && (
              <> <span style={{ fontWeight: 600, color: item.positive ? '#16A34A' : '#DC2626' }}>{item.delta}</span></>
            )}
          </span>
        ))}
        {overflow > 0 && <span style={{ color: '#A3A3A3' }}> · +{overflow} more</span>}
      </span>
    </div>
  );
};
