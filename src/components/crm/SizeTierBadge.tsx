import { cn } from '@/lib/utils';
import { SizeTier } from '@/lib/crmHelpers';

const badgeStyles: Record<SizeTier, string> = {
  small: 'bg-zinc-500/15 text-zinc-300',
  mid: 'bg-blue-500/15 text-blue-300',
  whale: 'bg-rose-500/15 text-rose-300',
};

const labels: Record<SizeTier, string> = {
  small: 'Small',
  mid: 'Mid',
  whale: 'Whale',
};

export function SizeTierBadge({ tier }: { tier: SizeTier }) {
  return (
    <span className={cn('inline-block px-1.5 py-0.5 rounded text-xs font-medium', badgeStyles[tier])}>
      {labels[tier]}
    </span>
  );
}
