import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { CrmContact } from '@/lib/crmHelpers';
import { CompanyLogo } from './CompanyLogo';
import { Linkedin } from 'lucide-react';

interface Props {
  contact: CrmContact;
  companyName: string;
  companyWebsite: string | null;
}

export function PipelineCard({ contact, companyName, companyWebsite }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contact.id,
    data: {
      id: contact.id,
      full_name: contact.full_name,
      company_name: companyName,
      currentStatus: contact.status,
    },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const lastTouchDisplay = contact.last_touch_at
    ? new Date(contact.last_touch_at).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-card border border-border rounded-md px-3 py-2 cursor-grab active:cursor-grabbing flex items-start gap-2',
        isDragging && 'opacity-50'
      )}
    >
      <CompanyLogo website={companyWebsite} name={companyName} size={18} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-xs font-semibold text-foreground truncate flex-1">{contact.full_name}</p>
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-shrink-0 text-blue-400/60 hover:text-blue-400 transition-colors"
              aria-label={`${contact.full_name} LinkedIn profile`}
            >
              <Linkedin size={12} />
            </a>
          )}
        </div>
        <p className="text-[10px] text-blue-300/70 truncate">{companyName}</p>
        {lastTouchDisplay && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{lastTouchDisplay}</p>
        )}
      </div>
    </div>
  );
}
