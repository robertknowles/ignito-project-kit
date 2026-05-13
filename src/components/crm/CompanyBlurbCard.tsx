import { useState } from 'react';
import { Info, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  blurb: string | null;
}

export function CompanyBlurbCard({ blurb }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!blurb) return null;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
      >
        <Info size={11} />
        <span className="text-[10px]">About</span>
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-md px-2.5 py-1.5">
      <div className="flex items-start justify-between gap-1">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {blurb}
        </p>
        <button
          onClick={() => setExpanded(false)}
          className="flex-shrink-0 mt-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <ChevronUp size={11} />
        </button>
      </div>
    </div>
  );
}
