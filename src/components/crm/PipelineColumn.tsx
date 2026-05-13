import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ContactStatus } from '@/lib/crmHelpers';
import { PipelineCard } from './PipelineCard';
import type { PipelineContact } from './CrmKanban';

interface Props {
  status: ContactStatus;
  label: string;
  contacts: PipelineContact[];
}

export function PipelineColumn({ status, label, contacts }: Props) {
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
      <div className="px-3 py-2 mb-1">
        <span className="text-xs font-semibold text-foreground/90">
          {label}
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          · {contacts.length}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 min-h-[60px] overflow-y-auto max-h-[calc(100vh-320px)]">
        {contacts.map(({ contact, companyName, companyWebsite }) => (
          <PipelineCard
            key={contact.id}
            contact={contact}
            companyName={companyName}
            companyWebsite={companyWebsite}
          />
        ))}
      </div>
    </div>
  );
}
