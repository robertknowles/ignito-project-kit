import { cn } from '@/lib/utils';
import { ContactStatus } from '@/lib/crmHelpers';

const statusStyles: Record<ContactStatus, string> = {
  not_contacted: 'bg-zinc-500/15 text-zinc-400',
  connection_sent: 'bg-blue-500/15 text-blue-300',
  connected: 'bg-blue-500/15 text-blue-300',
  video_sent: 'bg-violet-500/15 text-violet-300',
  replied: 'bg-emerald-500/15 text-emerald-300',
  demo_booked: 'bg-amber-500/15 text-amber-300',
  beta_tester: 'bg-emerald-500/15 text-emerald-300',
  dead: 'bg-zinc-500/15 text-zinc-500',
};

const statusLabels: Record<ContactStatus, string> = {
  not_contacted: 'Not contacted',
  connection_sent: 'Connection sent',
  connected: 'Connected',
  video_sent: 'Video sent',
  replied: 'Replied',
  demo_booked: 'Demo booked',
  beta_tester: 'Beta tester',
  dead: 'Dead',
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return (
    <span className={cn('inline-block px-1.5 py-0.5 rounded text-xs font-medium', statusStyles[status])}>
      {statusLabels[status]}
    </span>
  );
}
