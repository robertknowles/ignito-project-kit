import React from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { AlertTriangle, Check, X } from 'lucide-react';

interface AffordabilityAlertProps {
  children: React.ReactNode;
  depositTestPass: boolean;
  serviceabilityTestPass: boolean;
  borrowingCapacityRemaining: number;
  depositTestSurplus: number;
  serviceabilityTestSurplus: number;
  onDismiss: () => void;
}

const fmt = (v: number) => `$${Math.abs(Math.round(v / 1000))}k`;

const TestLine: React.FC<{ pass: boolean; label: string; surplus: number }> = ({ pass, label, surplus }) => (
  <div className="flex items-center gap-1.5 text-xs">
    {pass
      ? <Check size={12} className="text-green-500 shrink-0" />
      : <X size={12} className="text-red-500 shrink-0" />
    }
    <span className={pass ? 'text-neutral-500' : 'text-neutral-700 font-medium'}>
      {label}: {pass ? '+' : '-'}{fmt(surplus)}
    </span>
  </div>
);

export const AffordabilityAlert: React.FC<AffordabilityAlertProps> = ({
  children,
  depositTestPass,
  serviceabilityTestPass,
  borrowingCapacityRemaining,
  depositTestSurplus,
  serviceabilityTestSurplus,
  onDismiss,
}) => (
  <HoverCard openDelay={0} closeDelay={200}>
    <HoverCardTrigger asChild>
      {children}
    </HoverCardTrigger>
    <HoverCardContent side="bottom" align="start" className="w-56 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <AlertTriangle size={13} className="text-amber-500" />
        <span className="text-xs font-semibold text-neutral-700">Affordability Warning</span>
      </div>

      <div className="flex flex-col gap-1 mb-2">
        <TestLine pass={depositTestPass} label="Deposit" surplus={depositTestSurplus} />
        <TestLine pass={serviceabilityTestPass} label="Serviceability" surplus={serviceabilityTestSurplus} />
        <TestLine
          pass={borrowingCapacityRemaining >= 0}
          label="BC ceiling"
          surplus={borrowingCapacityRemaining}
        />
      </div>

      <p className="text-[10px] text-neutral-400 mb-2.5">
        Try a trust entity, lower price, or later purchase year.
      </p>

      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="w-full text-xs text-neutral-500 border border-neutral-200 rounded-md py-1 hover:bg-neutral-50 transition-colors cursor-pointer"
      >
        Dismiss
      </button>
    </HoverCardContent>
  </HoverCard>
);
