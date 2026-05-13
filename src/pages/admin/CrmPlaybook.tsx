import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useOutreachSteps } from '@/hooks/useOutreachSteps';
import { useUpdateOutreachStep } from '@/hooks/useUpdateOutreachStep';
import OutreachFlowDiagram from '@/components/crm/OutreachFlowDiagram';
import { PrinciplesPanel } from '@/components/crm/PrinciplesPanel';
import { PacingPanel } from '@/components/crm/PacingPanel';
import { OutreachStepCard } from '@/components/crm/OutreachStepCard';
import { supabase } from '@/integrations/supabase/client';
import { LogOut } from 'lucide-react';

export default function CrmPlaybook() {
  const { steps, loading, refetch } = useOutreachSteps();
  const updateStep = useUpdateOutreachStep();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Most recent updated_at across all steps
  const lastUpdated = steps.length > 0
    ? new Date(
        Math.max(...steps.map((s) => new Date(s.updated_at).getTime()))
      ).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  async function handleUpdate(stepId: string, patch: Partial<(typeof steps)[0]>) {
    await updateStep(stepId, patch);
    refetch();
  }

  return (
    <div className="crm-portal dark min-h-screen bg-background text-foreground">
      <main className="flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-muted-foreground"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft size={12} className="mr-1" /> CRM
            </Button>
            <h1 className="text-sm font-semibold tracking-tight">Outreach playbook</h1>
            <span className="text-xs text-muted-foreground">
              {loading
                ? 'Loading...'
                : `Editable templates${lastUpdated ? ` · last updated ${lastUpdated}` : ''}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2.5 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut size={12} className="mr-1" /> Sign out
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Outreach flow</h3>
              <OutreachFlowDiagram />
            </div>
            <PrinciplesPanel />
            <PacingPanel />

            {/* Steps section */}
            <div>
              <h2 className="text-sm font-medium text-foreground mb-3">Templates</h2>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-xs text-muted-foreground">Loading steps...</p>
                ) : steps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No outreach steps found. Run the migration to seed data.
                  </p>
                ) : (
                  steps.map((step) => (
                    <OutreachStepCard
                      key={step.id}
                      step={step}
                      onUpdate={handleUpdate}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
