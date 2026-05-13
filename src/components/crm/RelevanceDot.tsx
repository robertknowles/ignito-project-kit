import { cn } from '@/lib/utils';
import { RelevanceTier } from '@/lib/crmHelpers';

const dotColors: Record<RelevanceTier, string> = {
  high: 'bg-emerald-400',
  medium: 'bg-amber-400',
  low: 'bg-zinc-500',
};

export function RelevanceDot({ tier }: { tier: RelevanceTier }) {
  return <span className={cn('inline-block size-1.5 rounded-full flex-shrink-0', dotColors[tier])} />;
}
