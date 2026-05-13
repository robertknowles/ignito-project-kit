import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CompanyWithContacts, RelevanceTier } from '@/lib/crmHelpers';
import { CompanyColumn } from './CompanyColumn';

interface Props {
  companies: CompanyWithContacts[];
  onToggleActive: (contactId: string, currentlyActive: boolean) => void;
  onOpenContact?: (contactId: string) => void;
}

const TIERS: { key: RelevanceTier; label: string; dot: string }[] = [
  { key: 'high', label: 'High', dot: 'bg-emerald-400' },
  { key: 'medium', label: 'Medium', dot: 'bg-amber-400' },
  { key: 'low', label: 'Low', dot: 'bg-zinc-500' },
];

export function IndustryMapView({ companies, onToggleActive, onOpenContact }: Props) {
  const [activeTiers, setActiveTiers] = useState<Set<RelevanceTier>>(
    new Set(['high', 'medium', 'low'])
  );

  const toggleTier = (tier: RelevanceTier) => {
    setActiveTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) {
        if (next.size > 1) next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  };

  const byTier: Record<RelevanceTier, CompanyWithContacts[]> = { high: [], medium: [], low: [] };
  for (const c of companies) {
    byTier[c.relevance_tier].push(c);
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Filter toggles */}
      <div className="flex items-center gap-1.5 mb-2">
        {TIERS.map(({ key, label, dot }) => {
          const active = activeTiers.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleTier(key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border',
                active
                  ? 'bg-card border-border text-foreground'
                  : 'bg-transparent border-transparent text-muted-foreground/50 hover:text-muted-foreground'
              )}
            >
              <span className={cn('size-1.5 rounded-full', active ? dot : 'bg-muted-foreground/30')} />
              {label}
              <span className="text-muted-foreground ml-0.5">{byTier[key].length}</span>
            </button>
          );
        })}
      </div>

      {/* Tier rows */}
      {TIERS.map(({ key }) => {
        if (!activeTiers.has(key)) return null;
        const tierCompanies = byTier[key];
        if (tierCompanies.length === 0) return null;

        return (
          <div key={key} className="overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {tierCompanies.map(company => (
                <CompanyColumn
                  key={company.id}
                  company={company}
                  onToggleActive={onToggleActive}
                  onOpenContact={onOpenContact}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
