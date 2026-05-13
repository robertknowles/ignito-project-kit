import { useState } from 'react';
import { CompanyWithContacts, isContactActive } from '@/lib/crmHelpers';
import { RelevanceDot } from './RelevanceDot';
import { CompanyLogo } from './CompanyLogo';
import { ContactRow } from './ContactRow';
import { ExternalLink, Info, ChevronUp } from 'lucide-react';

interface Props {
  company: CompanyWithContacts;
  onToggleActive: (contactId: string, currentlyActive: boolean) => void;
  onOpenContact?: (contactId: string) => void;
}

export function CompanyColumn({ company, onToggleActive, onOpenContact }: Props) {
  const [blurbOpen, setBlurbOpen] = useState(false);
  const activeContacts = company.contacts.filter(c => isContactActive(c.status));
  const totalContacts = company.contacts.length;

  const sortedContacts = [...company.contacts].sort((a, b) => {
    const aActive = isContactActive(a.status);
    const bActive = isContactActive(b.status);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    if (aActive && bActive) {
      const aTime = a.last_touch_at ? new Date(a.last_touch_at).getTime() : 0;
      const bTime = b.last_touch_at ? new Date(b.last_touch_at).getTime() : 0;
      return bTime - aTime;
    }
    return a.full_name.localeCompare(b.full_name);
  });

  const employeesDisplay = company.employees != null
    ? `${Intl.NumberFormat().format(company.employees)} staff`
    : null;

  // Normalise state to shorthand
  const stateDisplay = company.state
    ? company.state
        .replace(/national/i, 'NTL')
        .replace(/new south wales/i, 'NSW')
        .replace(/victoria/i, 'VIC')
        .replace(/queensland/i, 'QLD')
        .replace(/south australia/i, 'SA')
        .replace(/western australia/i, 'WA')
        .replace(/tasmania/i, 'TAS')
        .replace(/northern territory/i, 'NT')
        .replace(/australian capital territory/i, 'ACT')
        .replace(/^Nat\.?$/i, 'NTL')
    : null;

  return (
    <div className="flex-shrink-0 w-[220px] max-h-[340px] bg-card border border-border rounded-md flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border flex-shrink-0">
        {/* Row 1: Logo + name */}
        <div className="flex items-center gap-2 mb-1.5">
          <CompanyLogo website={company.website} name={company.name} size={28} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <RelevanceDot tier={company.relevance_tier} />
              <span className="text-xs font-bold text-foreground truncate">{company.name}</span>
            </div>
          </div>
        </div>

        {/* Row 2: Meta — state, staff, tier */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
          {stateDisplay && <span>{stateDisplay}</span>}
          {stateDisplay && employeesDisplay && <span>·</span>}
          {employeesDisplay && <span>{employeesDisplay}</span>}
          <span>·</span>
          <span>{activeContacts.length}/{totalContacts} active</span>
        </div>

        {/* Row 3: Links — website + about toggle */}
        <div className="flex items-center gap-2">
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-400/80 hover:text-blue-300 transition-colors"
            >
              <ExternalLink size={10} />
              <span>Website</span>
            </a>
          )}
          {company.blurb && (
            <button
              onClick={() => setBlurbOpen(!blurbOpen)}
              className="flex items-center gap-1 text-[10px] text-blue-400/80 hover:text-blue-300 transition-colors"
            >
              {blurbOpen ? <ChevronUp size={10} /> : <Info size={10} />}
              <span>About</span>
            </button>
          )}
        </div>

        {/* Expandable blurb */}
        {blurbOpen && company.blurb && (
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-1.5 border-t border-border pt-1.5">
            {company.blurb}
          </p>
        )}
      </div>

      {/* Scrollable contacts */}
      <div className="flex flex-col gap-1 p-1.5 overflow-y-auto min-h-0">
        {sortedContacts.map(contact => (
          <ContactRow
            key={contact.id}
            contact={contact}
            onToggleActive={onToggleActive}
            onOpenContact={onOpenContact}
          />
        ))}
      </div>
    </div>
  );
}
