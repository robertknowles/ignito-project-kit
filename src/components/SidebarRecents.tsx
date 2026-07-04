/**
 * SidebarRecents — ChatGPT-style flat list of recent client scenarios.
 *
 * Replaces the ClientSelector dropdown: every client is listed directly in
 * the sidebar, most recently touched first. Clicking a row makes that client
 * active and opens their dashboard. Row-level actions (rename / repair /
 * delete) are carried over from the old selector via a hover ⋯ menu.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MoreHorizontal as MoreHorizontalIcon,
  Pencil as PencilIcon,
  Trash2 as TrashIcon,
  Wrench as WrenchIcon,
} from 'lucide-react';
import { useClient, type Client } from '@/contexts/ClientContext';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { useLayout } from '@/contexts/LayoutContext';
import { diagnoseScenario, repairScenario } from '@/utils/scenarioRepair';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DAY_MS = 86_400_000;

/** ChatGPT-style time bucket for a recency timestamp. */
const bucketOf = (t: number, startOfToday: number): string => {
  if (t >= startOfToday) return 'Today';
  if (t >= startOfToday - DAY_MS) return 'Yesterday';
  if (t >= startOfToday - 7 * DAY_MS) return 'Previous 7 Days';
  if (t >= startOfToday - 30 * DAY_MS) return 'Previous 30 Days';
  return 'Older';
};

/**
 * Clients filtered by query, sorted most-recent-first and grouped into
 * ChatGPT-style time buckets. Recency comes from the scenario's updated_at
 * (max per client) so a client whose plan was edited this morning sits at
 * the top even if the client record itself wasn't touched.
 */
export function useBucketedRecents(query: string) {
  const { clients } = useClient();

  const [scenarioRecency, setScenarioRecency] = useState<Record<number, string>>({});
  useEffect(() => {
    let cancelled = false;
    const ids = clients.map((c) => c.id);
    if (!ids.length) return;
    (async () => {
      const { data, error } = await supabase
        .from('scenarios')
        .select('client_id, updated_at')
        .in('client_id', ids);
      if (cancelled || error || !data) return;
      const map: Record<number, string> = {};
      for (const row of data) {
        if (!row.client_id || !row.updated_at) continue;
        if (!map[row.client_id] || row.updated_at > map[row.client_id]) {
          map[row.client_id] = row.updated_at;
        }
      }
      setScenarioRecency(map);
    })();
    return () => { cancelled = true; };
  }, [clients]);

  const recencyOf = useCallback(
    (c: Client) =>
      new Date(
        scenarioRecency[c.id] || c.updated_at || c.last_active_at || c.created_at,
      ).getTime(),
    [scenarioRecency],
  );

  const buckets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sorted = [...clients]
      .filter(
        (c) =>
          !q ||
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q),
      )
      .sort((a, b) => recencyOf(b) - recencyOf(a));
    const groups: { label: string; clients: Client[] }[] = [];
    for (const client of sorted) {
      const label = bucketOf(recencyOf(client), startOfToday);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.clients.push(client);
      } else {
        groups.push({ label, clients: [client] });
      }
    }
    return groups;
  }, [clients, query, recencyOf]);

  return { buckets, hasClients: clients.length > 0 };
}

export const SidebarRecents: React.FC<{ query?: string }> = ({ query = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clients, activeClient, setActiveClient, updateClient, deleteClient } = useClient();
  const { loadClientScenario, isChatRequestInFlight } = useScenarioSave();
  const { setDashboardTab } = useLayout();

  // Which row's ⋯ menu is open, and which row is in inline-rename mode.
  const [menuId, setMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Delete + repair confirm dialogs (ported from ClientSelector).
  const [pendingDeleteClient, setPendingDeleteClient] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingRepairClient, setPendingRepairClient] = useState<Client | null>(null);
  const [repairDiagnosis, setRepairDiagnosis] = useState<{ needsRepair: boolean; reason: string; instanceCount: number; orderCount: number; selectionCount: number } | null>(null);
  const [repairing, setRepairing] = useState(false);

  const { buckets } = useBucketedRecents(query);

  // Close any open row menu on outside click.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const openClient = (client: Client) => {
    setActiveClient(client);
    setDashboardTab('plan');
    navigate('/dashboard');
  };

  const startEdit = useCallback((client: Client) => {
    setEditingId(client.id);
    setDraft(client.name ?? '');
    setMenuId(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft('');
  }, []);

  const commitEdit = useCallback(async () => {
    if (editingId === null) return;
    const target = clients.find((c) => c.id === editingId);
    if (!target) {
      cancelEdit();
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed || trimmed === target.name) {
      cancelEdit();
      return;
    }
    setSaving(true);
    await updateClient(target.id, { name: trimmed });
    setSaving(false);
    setEditingId(null);
    setDraft('');
  }, [editingId, draft, clients, updateClient, cancelEdit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void commitEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    },
    [commitEdit, cancelEdit],
  );

  if (clients.length === 0) {
    return (
      <div className="px-2 py-1.5 text-[12px] text-[#A4A7AE]">
        No scenarios yet
      </div>
    );
  }
  if (buckets.length === 0) {
    return (
      <div className="px-2 py-1.5 text-[12px] text-[#A4A7AE]">
        No clients match
      </div>
    );
  }

  return (
    <div ref={listRef} className="flex flex-col">
      {buckets.map((bucket, bucketIndex) => (
        <React.Fragment key={bucket.label}>
          <div
            className={`px-2 pb-1 text-[11px] font-medium text-[#A4A7AE] ${
              bucketIndex === 0 ? 'pt-0.5' : 'pt-3'
            }`}
          >
            {bucket.label}
          </div>
          {bucket.clients.map((client) => {
        const isActive = activeClient?.id === client.id && location.pathname === '/dashboard';
        const isEditing = editingId === client.id;
        const isMenuOpen = menuId === client.id;
        // Match the nav lock: while a plan request is in flight, only the
        // already-active row stays clickable.
        const locked = isChatRequestInFlight && !isActive;

        return (
          <div
            key={client.id}
            className={`group/recent relative flex max-h-9 w-full items-center rounded-md transition duration-100 ease-linear select-none ${
              isActive ? 'bg-[#F5F5F6]' : 'hover:bg-[#F5F5F5]'
            } ${locked ? 'opacity-40' : ''}`}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => void commitEdit()}
                disabled={saving}
                className="m-1 w-full min-w-0 flex-1 text-[13px] font-medium text-[#181D27] bg-white border border-[#D5D7DA] rounded px-1.5 py-1 outline-none focus:border-[#A4A7AE]"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                onClick={() => !locked && openClient(client)}
                disabled={locked}
                title={locked ? 'Wait for the plan to finish generating' : client.name}
                className={`flex-1 min-w-0 p-2 bg-transparent border-none text-left cursor-pointer ${
                  locked ? 'cursor-not-allowed' : ''
                }`}
              >
                <span
                  className={`block text-[13px] font-medium truncate ${
                    isActive ? 'text-[#181D27]' : 'text-[#414651] group-hover/recent:text-[#181D27]'
                  }`}
                >
                  {client.name}
                </span>
              </button>
            )}

            {!isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuId(isMenuOpen ? null : client.id);
                }}
                className={`shrink-0 mr-1 w-6 h-6 rounded flex items-center justify-center bg-transparent border-none cursor-pointer text-[#717680] hover:text-[#414651] hover:bg-[#E9EAEB] transition-opacity ${
                  isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover/recent:opacity-100'
                }`}
                aria-label="Client actions"
              >
                <MoreHorizontalIcon size={14} />
              </button>
            )}

            {isMenuOpen && (
              <div
                className="absolute right-1 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-[#E9EAEB] z-[10000] py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => startEdit(client)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#414651] bg-transparent border-none cursor-pointer hover:bg-[#F5F5F6] transition-colors text-left"
                >
                  <PencilIcon size={13} />
                  Rename
                </button>
                <button
                  onClick={async () => {
                    setMenuId(null);
                    // Diagnose before opening the confirm dialog — only repair
                    // when the corruption signature is present.
                    const { data: row, error } = await supabase
                      .from('scenarios')
                      .select('id')
                      .eq('client_id', client.id)
                      .order('updated_at', { ascending: false })
                      .limit(1)
                      .maybeSingle();
                    if (error || !row?.id) {
                      toast.error(`Couldn't find a scenario row for ${client.name}.`);
                      return;
                    }
                    const diag = await diagnoseScenario(row.id);
                    if (!diag.ok) {
                      toast.error(diag.error);
                      return;
                    }
                    setRepairDiagnosis(diag.diagnosis);
                    setPendingRepairClient(client);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#414651] bg-transparent border-none cursor-pointer hover:bg-[#F5F5F6] transition-colors text-left"
                  title="Last-resort recovery: rebuild propertyOrder from saved propertyInstances"
                >
                  <WrenchIcon size={13} />
                  Repair scenario
                </button>
                <button
                  onClick={() => {
                    setMenuId(null);
                    setPendingDeleteClient(client);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#D92D20] bg-transparent border-none cursor-pointer hover:bg-[#FEF3F2] transition-colors text-left"
                >
                  <TrashIcon size={13} />
                  Delete
                </button>
              </div>
            )}
          </div>
        );
          })}
        </React.Fragment>
      ))}

      <Dialog
        open={!!pendingDeleteClient}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDeleteClient(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete client</DialogTitle>
            <DialogDescription>
              {pendingDeleteClient
                ? `Are you sure you want to delete ${pendingDeleteClient.name}? This action cannot be undone and will permanently remove the client along with all associated scenarios, properties and projections.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPendingDeleteClient(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!pendingDeleteClient) return;
                setDeleting(true);
                const ok = await deleteClient(pendingDeleteClient.id);
                setDeleting(false);
                if (ok) {
                  toast.success(`${pendingDeleteClient.name} deleted`);
                  setPendingDeleteClient(null);
                } else {
                  toast.error('Failed to delete client');
                }
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repair scenario — manual last-resort recovery. Only does anything
          if the diagnostic flagged the partial-write corruption signature
          (propertyInstances populated but propertyOrder/propertySelections
          empty). When intact, the dialog warns the user and flips the
          confirm button to destructive styling. */}
      <Dialog
        open={!!pendingRepairClient}
        onOpenChange={(open) => {
          if (!open && !repairing) {
            setPendingRepairClient(null);
            setRepairDiagnosis(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repair scenario</DialogTitle>
            <DialogDescription>
              {pendingRepairClient && repairDiagnosis ? (
                <>
                  <span className="block mb-2">
                    Last-resort recovery for {pendingRepairClient.name}.
                  </span>
                  <span className="block text-[12px] text-[#717680] mb-2">
                    {repairDiagnosis.reason}
                  </span>
                  {repairDiagnosis.needsRepair ? (
                    <span className="block text-[12px]">
                      Clicking Repair will rebuild the property timeline from
                      the {repairDiagnosis.instanceCount} property instances
                      that survived the corruption. Chat history, profile,
                      and marked-as-purchased state are not affected.
                    </span>
                  ) : (
                    <span className="block text-[12px] text-[#B54708]">
                      This scenario does not look corrupted. Repair would
                      just re-derive the order from instances and could
                      override your current state. Cancel and only run this
                      if a scenario is showing blank in dashboard/portfolio.
                    </span>
                  )}
                </>
              ) : (
                ''
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPendingRepairClient(null);
                setRepairDiagnosis(null);
              }}
              disabled={repairing}
            >
              Cancel
            </Button>
            <Button
              variant={repairDiagnosis?.needsRepair ? 'default' : 'destructive'}
              disabled={repairing}
              onClick={async () => {
                if (!pendingRepairClient) return;
                setRepairing(true);
                // Look up the scenario row again at confirm time so we
                // operate on the freshest id.
                const { data: row, error: fetchError } = await supabase
                  .from('scenarios')
                  .select('id')
                  .eq('client_id', pendingRepairClient.id)
                  .order('updated_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (fetchError || !row?.id) {
                  setRepairing(false);
                  toast.error(`Couldn't find a scenario row for ${pendingRepairClient.name}.`);
                  return;
                }
                const result = await repairScenario(row.id);
                setRepairing(false);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success(
                  `Repaired ${pendingRepairClient.name} — ${result.restoredOrder.length} properties restored`,
                );
                setPendingRepairClient(null);
                setRepairDiagnosis(null);
                // If the repaired client is the active one, reload its
                // scenario so the dashboard/portfolio re-render with the
                // restored data.
                if (activeClient?.id === pendingRepairClient.id) {
                  await loadClientScenario(pendingRepairClient.id);
                }
              }}
            >
              {repairing ? 'Repairing…' : repairDiagnosis?.needsRepair ? 'Repair' : 'Repair anyway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
