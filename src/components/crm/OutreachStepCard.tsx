import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { OutreachTemplateEditor } from './OutreachTemplateEditor';
import { OutreachStep } from '@/hooks/useOutreachSteps';

interface Props {
  step: OutreachStep;
  onUpdate: (stepId: string, patch: Partial<OutreachStep>) => Promise<void>;
}

export function OutreachStepCard({ step, onUpdate }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!step.template_body) return;
    await navigator.clipboard.writeText(step.template_body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-medium text-foreground">{step.step_title}</h3>
        <button
          type="button"
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          aria-label="Copy template to clipboard"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
        </button>
      </div>
      {step.description && (
        <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
          {step.description}
        </p>
      )}
      <OutreachTemplateEditor
        value={step.template_body ?? ''}
        onSave={async (val) => onUpdate(step.id, { template_body: val })}
        placeholder="Template body..."
      />
    </div>
  );
}
