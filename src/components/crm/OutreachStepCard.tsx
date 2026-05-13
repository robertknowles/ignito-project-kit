import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OutreachTemplateEditor } from './OutreachTemplateEditor';
import { OutreachStep } from '@/hooks/useOutreachSteps';

interface Props {
  step: OutreachStep;
  onUpdate: (stepId: string, patch: Partial<OutreachStep>) => Promise<void>;
}

export function OutreachStepCard({ step, onUpdate }: Props) {
  const isBlankInvite = step.template_male === null && step.template_female === null;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      {/* Header row */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xs font-medium text-foreground">
          Step {step.step_order}
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{step.day_label}</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs font-medium text-foreground">{step.step_title}</span>
      </div>

      {/* Description */}
      {step.description && (
        <p className="text-[11px] text-muted-foreground mt-1 mb-4 leading-relaxed">
          {step.description}
        </p>
      )}

      {/* Template editors */}
      {isBlankInvite ? (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground italic">
            (no message — blank invite)
          </p>
        </div>
      ) : (
        <Tabs defaultValue="male" className="mb-4">
          <TabsList className="bg-background border border-border h-7">
            <TabsTrigger value="male" className="text-[11px] h-6 px-3 data-[state=active]:bg-card">
              Male — "Hey mate"
            </TabsTrigger>
            <TabsTrigger value="female" className="text-[11px] h-6 px-3 data-[state=active]:bg-card">
              Female — "Hey [Name]"
            </TabsTrigger>
          </TabsList>
          <TabsContent value="male" className="mt-2">
            <OutreachTemplateEditor
              value={step.template_male ?? ''}
              onSave={async (val) => onUpdate(step.id, { template_male: val })}
              placeholder="Male template..."
            />
          </TabsContent>
          <TabsContent value="female" className="mt-2">
            <OutreachTemplateEditor
              value={step.template_female ?? ''}
              onSave={async (val) => onUpdate(step.id, { template_female: val })}
              placeholder="Female template..."
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Notes */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Notes</p>
        <OutreachTemplateEditor
          value={step.notes ?? ''}
          rows={3}
          onSave={async (val) => onUpdate(step.id, { notes: val })}
          placeholder="Notes..."
        />
      </div>
    </div>
  );
}
