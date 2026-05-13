import { cn } from '@/lib/utils';
import { CrmContact, isContactActive } from '@/lib/crmHelpers';
import { Linkedin } from 'lucide-react';

interface Props {
  contact: CrmContact;
  onToggleActive: (contactId: string, currentlyActive: boolean) => void;
  onOpenContact?: (contactId: string) => void;
}

export function ContactRow({ contact, onToggleActive, onOpenContact }: Props) {
  const active = isContactActive(contact.status);

  return (
    <div
      onClick={() => onToggleActive(contact.id, active)}
      className={cn(
        'px-2.5 py-2 rounded-md border cursor-pointer transition-colors group',
        active
          ? 'bg-blue-900/25 border-blue-500/20 text-blue-200'
          : 'bg-card border-border text-foreground/70 hover:text-foreground hover:border-border/80'
      )}
    >
      <div className="flex items-center gap-1">
        <p className={cn(
          'text-xs font-medium truncate flex-1',
          active ? 'text-blue-200' : 'text-foreground/80'
        )}>
          {contact.full_name}
        </p>
        {contact.linkedin_url && (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 text-blue-400/70 hover:text-blue-300 transition-colors"
          >
            <Linkedin size={11} />
          </a>
        )}
      </div>
      {contact.title && (
        <p className={cn(
          'text-[10px] truncate mt-0.5',
          active ? 'text-blue-300/50' : 'text-muted-foreground'
        )}>
          {contact.title}
        </p>
      )}
    </div>
  );
}
