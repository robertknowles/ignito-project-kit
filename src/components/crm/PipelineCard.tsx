import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { CrmContact, ContactStatus, isContactOverdue } from '@/lib/crmHelpers';
import { CompanyLogo } from './CompanyLogo';
import { Linkedin, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  contact: CrmContact;
  companyName: string;
  companyWebsite: string | null;
  onAssignedChange?: () => void;
  durationOverrides?: Partial<Record<ContactStatus, number | null>>;
}

const SENDER_CYCLE: Array<'rob' | 'james' | null> = [null, 'rob', 'james'];

const TIMELINE_STAGES: Array<{ key: keyof CrmContact; label: string }> = [
  { key: 'connection_sent_at', label: 'Connection sent' },
  { key: 'last_touch_at', label: 'Connected' },
  { key: 'video_sent_at', label: 'Video sent' },
  { key: 'replied_at', label: 'Replied' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export function PipelineCard({ contact, companyName, companyWebsite, onAssignedChange, durationOverrides }: Props) {
  const [showTimeline, setShowTimeline] = useState(false);

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

  const overdue = isContactOverdue(contact, new Date(), durationOverrides);

  async function cycleSender(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const currentIdx = SENDER_CYCLE.indexOf(contact.assigned_to ?? null);
    const next = SENDER_CYCLE[(currentIdx + 1) % SENDER_CYCLE.length];
    await supabase
      .from('crm_contacts')
      .update({ assigned_to: next })
      .eq('id', contact.id);
    onAssignedChange?.();
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-card border border-border rounded-md px-3 py-2 cursor-grab active:cursor-grabbing flex items-start gap-2 relative',
        isDragging && 'opacity-50'
      )}
    >
      {overdue && (
        <AlertCircle size={14} className="absolute top-1.5 right-1.5 text-red-500 flex-shrink-0" />
      )}
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
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[10px] text-blue-300/70 truncate">{companyName}</p>
          <button
            type="button"
            onClick={cycleSender}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'flex-shrink-0 w-4 h-4 rounded-full text-[9px] font-bold leading-none flex items-center justify-center transition-colors',
              contact.assigned_to === 'rob' && 'bg-indigo-500 text-white',
              contact.assigned_to === 'james' && 'bg-emerald-500 text-white',
              !contact.assigned_to && 'border border-muted-foreground/60 text-muted-foreground/60'
            )}
          >
            {contact.assigned_to === 'rob' ? 'R' : contact.assigned_to === 'james' ? 'J' : '·'}
          </button>
        </div>
        {lastTouchDisplay && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowTimeline(!showTimeline); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground mt-0.5 hover:text-foreground transition-colors"
          >
            {lastTouchDisplay}
            <ChevronDown size={8} className={cn('transition-transform', showTimeline && 'rotate-180')} />
          </button>
        )}
        {showTimeline && (
          <div className="mt-1 pl-1 border-l border-border space-y-0.5">
            {TIMELINE_STAGES.map(({ key, label }) => {
              const val = contact[key] as string | null;
              if (!val) return null;
              return (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-muted-foreground/70">{label}</span>
                  <span className="text-[9px] text-muted-foreground">{formatDate(val)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
