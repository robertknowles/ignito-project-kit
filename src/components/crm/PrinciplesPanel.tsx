import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const PRINCIPLES = [
  { bold: 'Lower the ask, not the touches.', rest: 'Push the product (free login, low friction), not your calendar.' },
  { bold: 'DM text is hospitality, not sales.', rest: 'Let the video do the work. Two sentences max.' },
  { bold: 'Branch on signal, not on calendar.', rest: 'Reply state is the only signal that drives the flow.' },
  { bold: 'Wait longer than feels right.', rest: 'Minimum 4 days between touches. In small markets, follow-up urgency reads as desperation.' },
  { bold: 'One person per agency at a time.', rest: 'Never message two people at the same firm in parallel.' },
  { bold: "Don't burn whales early.", rest: 'Within each relevance tier, work smallest agencies first.' },
  { bold: 'Real reasons only on follow-ups.', rest: 'Never "just checking in."' },
  { bold: 'Mark Dead and stop.', rest: 'Eight unanswered touches makes you the founder no one returns calls from.' },
  { bold: 'Warm intro > 20 cold messages.', rest: 'Engineer them via Joshua, beta testers, and mutual connections.' },
];

export function PrinciplesPanel() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-card border border-border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors rounded-lg"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Principles
      </button>
      {expanded && (
        <ul className="px-5 pb-4 space-y-2">
          {PRINCIPLES.map((p, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">{p.bold}</span>{' '}
              {p.rest}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
