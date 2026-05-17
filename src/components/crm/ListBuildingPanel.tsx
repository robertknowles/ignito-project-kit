import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

interface Source {
  name: string;
  note: string;
  url?: string;
}

const DIRECTORIES: Source[] = [
  { name: 'REBAA member directory', note: 'Industry body — buyers agent association', url: 'https://rebaa.com.au/find-a-buyers-agent/' },
  { name: 'PIPA member directory', note: 'Investment-focused property professionals', url: 'https://pipa.asn.au/find-a-pipa-investment-professional/' },
  { name: 'HTAG directory', note: 'URL to confirm' },
];

const ONLINE_SOURCES: Source[] = [
  { name: 'Gameplans partners page', note: 'Competitor users; tech-forward, already in the category' },
  { name: 'Open BA testimonial page', note: 'Same logic' },
  { name: 'Reddit r/AusPropertyChat', note: 'BA names get mentioned by investors regularly' },
  { name: 'LinkedIn Sales Navigator', note: 'Filter: "buyers agent" + "investment" in Australia' },
];

function SourceRow({ source }: { source: Source }) {
  return (
    <li className="flex items-center gap-2 text-xs text-muted-foreground leading-relaxed">
      <span className="text-foreground font-medium">{source.name}</span>
      <span className="text-muted-foreground/70">—</span>
      <span className="flex-1">{source.note}</span>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-blue-400/60 hover:text-blue-400 transition-colors"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </li>
  );
}

export function ListBuildingPanel() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-card border border-border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors rounded-lg"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        List-building sources
      </button>
      {expanded && (
        <div className="px-5 pb-4 space-y-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Directories</p>
            <ul className="space-y-1.5">
              {DIRECTORIES.map((s) => <SourceRow key={s.name} source={s} />)}
            </ul>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Online sources</p>
            <ul className="space-y-1.5">
              {ONLINE_SOURCES.map((s) => <SourceRow key={s.name} source={s} />)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
