import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const PRINCIPLES = [
  { bold: 'One person per agency at a time.', rest: 'Never message two people at the same firm in parallel.' },
  { bold: "Don't burn whales early.", rest: 'Within each relevance tier, work smallest agencies first. Exception: a warm intro overrides size-first.' },
  { bold: 'Mark Dead and stop.', rest: "If they haven't replied across the cadence, silence is the answer." },
  { bold: 'Warm intro > 20 cold messages.', rest: 'Engineer them via Joshua, beta testers, and mutual connections.' },
  { bold: 'One voice, one sender.', rest: "James's account = James's voice. Rob's account = Rob's voice. No \"we built\" - slips into cofounder framing that doesn't match the profile photo." },
  { bold: 'Every touch carries a specific hook.', rest: 'Reference their firm, a recent post, or a named event in the market this week. Generic openers are dead touches.' },
  { bold: 'Profile visits plant a flag.', rest: "View every prospect's LinkedIn profile the day before the invite goes. They get notified - name recognition before the first touch." },
  { bold: 'The video does the heavy lifting.', rest: 'The DM only earns the click. Always fill the [hook] slot with something specific.' },
  { bold: 'Personalised Looms are for whales only.', rest: 'Reserved for high-value prospects, content creators, and named warm-list contacts. Reciprocity-heavy - even uninterested prospects often respond because you put in real effort.' },
  { bold: 'Case studies need a real name.', rest: 'Only deploy when you have a specific, attributable quote. Generic case-study framing without a name kills credibility.' },
  { bold: 'The [specific recent event] slot is non-negotiable.', rest: "Update to the most relevant news of the sending week. Generic \"recent changes\" reads as mail-merge and kills the message." },
  { bold: 'Charge from day one.', rest: 'Money-back guarantee, not free trials. Payment signals real value and self-selects serious users. Beta access is the exception - but anchor to the paid tier after.' },
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
