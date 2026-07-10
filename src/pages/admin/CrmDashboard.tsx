import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, LogOut, GripHorizontal, BarChart3, ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCrmCompanies } from '@/hooks/useCrmCompanies';
import { useUpdateContactStatus } from '@/hooks/useUpdateContactStatus';
import { isContactActive, CompanyWithContacts } from '@/lib/crmHelpers';
import { IndustryMapView } from '@/components/crm/IndustryMapView';
import { CrmKanban } from '@/components/crm/CrmKanban';
import { AddContactDialog } from '@/components/crm/AddContactDialog';
import { CrmMetrics } from '@/components/crm/CrmMetrics';
import { AddCompanyDialog } from '@/components/crm/AddCompanyDialog';

function totalActive(companies: CompanyWithContacts[]): number {
  let count = 0;
  for (const c of companies) {
    for (const contact of c.contacts) {
      if (isContactActive(contact.status)) count++;
    }
  }
  return count;
}

type Page = 'crm' | 'results';

export default function CrmDashboard() {
  const navigate = useNavigate();
  const { companies, loading, refetch } = useCrmCompanies();
  const updateStatus = useUpdateContactStatus();
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [page, setPage] = useState<Page>('crm');

  // Resizable split
  const [splitPercent, setSplitPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const pct = Math.max(15, Math.min(85, (y / rect.height) * 100));
      setSplitPercent(pct);
    };

    const handleMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const activeCount = totalActive(companies);

  return (
    <div className="crm-portal dark min-h-screen bg-background text-foreground">
      <main className="flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-4">
            {page === 'results' && (
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground" onClick={() => setPage('crm')}>
                <ArrowLeft size={12} className="mr-1" /> Back
              </Button>
            )}
            <h1 className="text-sm font-semibold tracking-tight">PropPath CRM</h1>
            <span className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : `${companies.length} companies · ${activeCount} active`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {page === 'crm' && (
              <>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => setPage('results')}>
                  <BarChart3 size={12} className="mr-1" /> Results
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => navigate('/admin/crm/playbook')}>
                  <BookOpen size={12} className="mr-1" /> Playbook
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => setAddContactOpen(true)}>
                  <Plus size={12} className="mr-1" /> Contact
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => setAddCompanyOpen(true)}>
                  <Plus size={12} className="mr-1" /> Company
                </Button>
              </>
            )}
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5 text-muted-foreground" onClick={handleLogout}>
              <LogOut size={12} className="mr-1" /> Sign out
            </Button>
          </div>
        </header>

        {page === 'crm' ? (
          /* CRM views */
          <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
            {/* Top pane - Industry map */}
            <section
              className="px-6 py-4 overflow-x-auto overflow-y-auto flex-shrink-0"
              style={{ height: `${splitPercent}%` }}
            >
              <p className="text-xs text-muted-foreground mb-3">
                View 1 - industry map (one column per company, ranked left to right by relevance)
              </p>
              <IndustryMapView
                companies={companies}
                onToggleActive={async (id, active) => {
                  await updateStatus(id, active ? 'not_contacted' : 'connection_sent');
                  refetch();
                }}
              />
            </section>

            {/* Drag handle */}
            <div
              onMouseDown={handleMouseDown}
              className="flex-shrink-0 h-2 border-y border-border cursor-row-resize flex items-center justify-center hover:bg-muted/50 transition-colors group"
            >
              <GripHorizontal size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground/70" />
            </div>

            {/* Bottom pane - Pipeline */}
            <section
              className="px-6 py-4 overflow-x-auto overflow-y-auto"
              style={{ height: `${100 - splitPercent}%` }}
            >
              <p className="text-xs text-muted-foreground mb-3">
                View 2 - pipeline (kanban by stage, same {activeCount} active people from above)
              </p>
              <CrmKanban
                companies={companies}
                onStatusChange={async (contactId, newStatus) => {
                  await updateStatus(contactId, newStatus);
                  refetch();
                }}
                onAssignedChange={refetch}
              />
            </section>
          </div>
        ) : (
          /* Results page */
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <p className="text-xs text-muted-foreground mb-4">
              Weekly metrics - tracking outreach activity and conversion goals
            </p>
            <CrmMetrics companies={companies} />
          </div>
        )}
      </main>

      <AddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        companies={companies}
        onCreated={refetch}
      />
      <AddCompanyDialog
        open={addCompanyOpen}
        onOpenChange={setAddCompanyOpen}
        onCreated={refetch}
      />
    </div>
  );
}
