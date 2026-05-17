import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ContactStatus } from '@/lib/crmHelpers';
import { PipelineCard } from './PipelineCard';
import type { PipelineContact } from './CrmKanban';

const DAY_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'Off', value: null },
  { label: '1d', value: 1 },
  { label: '3d', value: 3 },
  { label: '5d', value: 5 },
  { label: '7d', value: 7 },
  { label: '10d', value: 10 },
  { label: '14d', value: 14 },
  { label: '21d', value: 21 },
  { label: '30d', value: 30 },
];

interface Props {
  status: ContactStatus;
  label: string;
  contacts: PipelineContact[];
  onAssignedChange?: () => void;
  durationDays: number | null;
  onDurationChange: (days: number | null) => void;
  durationOverrides: Partial<Record<ContactStatus, number | null>>;
}

export function PipelineColumn({ status, label, contacts, onAssignedChange, durationDays, onDurationChange, durationOverrides }: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: `stage-${status}`,
  });

  const isDead = status === 'dead';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-[220px] flex flex-col rounded-md',
        isOver && 'ring-1 ring-blue-500/40',
        isDead && 'opacity-50'
      )}
    >
      <div className="px-3 py-2 mb-1 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-foreground/90">
            {label}
          </span>
          <span className="text-xs text-muted-foreground ml-1">
            · {contacts.length}
          </span>
        </div>
        <select
          value={durationDays === null ? 'off' : String(durationDays)}
          onChange={(e) => {
            const val = e.target.value;
            onDurationChange(val === 'off' ? null : Number(val));
          }}
          className="bg-transparent border border-border rounded text-[10px] text-muted-foreground px-1 py-0.5 cursor-pointer hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30"
        >
          {DAY_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value === null ? 'off' : String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 min-h-[60px] overflow-y-auto max-h-[calc(100vh-320px)]">
        {contacts.map(({ contact, companyName, companyWebsite }) => (
          <PipelineCard
            key={contact.id}
            contact={contact}
            companyName={companyName}
            companyWebsite={companyWebsite}
            onAssignedChange={onAssignedChange}
            durationOverrides={durationOverrides}
          />
        ))}
      </div>
    </div>
  );
}
