import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDownIcon, MoreHorizontal as MoreHorizontalIcon, Pencil as PencilIcon, Trash2 as TrashIcon, Wrench as WrenchIcon, User as UserIcon } from 'lucide-react';
import { useClient, type Client } from '@/contexts/ClientContext';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
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

const AVATAR_BG = '#535862';
const AVATAR_TEXT = '#FFFFFF';

const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export const ClientSelector: React.FC = () => {
  const { clients, activeClient, setActiveClient, updateClient, deleteClient } = useClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Trigger-level inline rename (double-click on the title).
  const [triggerEditing, setTriggerEditing] = useState(false);
  const [triggerDraft, setTriggerDraft] = useState('');
  const [triggerSaving, setTriggerSaving] = useState(false);
  const triggerInputRef = useRef<HTMLInputElement>(null);

  // Per-row controls inside the dropdown: which row's three-dot menu is open,
  // and which row is in inline-rename mode.
  const [rowMenuId, setRowMenuId] = useState<number | null>(null);
  const [rowEditingId, setRowEditingId] = useState<number | null>(null);
  const [rowDraft, setRowDraft] = useState('');
  const [rowSaving, setRowSaving] = useState(false);
  const rowInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm dialog.
  const [pendingDeleteClient, setPendingDeleteClient] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Repair scenario confirm dialog (LAST-RESORT recovery — manual only).
  const [pendingRepairClient, setPendingRepairClient] = useState<Client | null>(null);
  const [repairDiagnosis, setRepairDiagnosis] = useState<{ needsRepair: boolean; reason: string; instanceCount: number; orderCount: number; selectionCount: number } | null>(null);
  const [repairing, setRepairing] = useState(false);
  const { loadClientScenario } = useScenarioSave();

  // Outside-click handling: only close the dropdown. In-progress renames
  // commit on blur, so we don't need to manually cancel them here.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setRowMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus the trigger input when entering edit mode.
  useEffect(() => {
    if (triggerEditing && triggerInputRef.current) {
      triggerInputRef.current.focus();
      triggerInputRef.current.select();
    }
  }, [triggerEditing]);

  // Same for row input.
  useEffect(() => {
    if (rowEditingId !== null && rowInputRef.current) {
      rowInputRef.current.focus();
      rowInputRef.current.select();
    }
  }, [rowEditingId]);

  const handleClientSelect = (client: typeof activeClient) => {
    setActiveClient(client);
    setDropdownOpen(false);
  };

  // ── Trigger inline rename ────────────────────────────────────────────────
  const startTriggerEdit = useCallback(() => {
    if (!activeClient) return;
    setTriggerDraft(activeClient.name ?? '');
    setTriggerEditing(true);
    setDropdownOpen(false);
  }, [activeClient]);

  const cancelTriggerEdit = useCallback(() => {
    setTriggerEditing(false);
    setTriggerDraft('');
  }, []);

  const commitTriggerEdit = useCallback(async () => {
    if (!activeClient) {
      cancelTriggerEdit();
      return;
    }
    const trimmed = triggerDraft.trim();
    if (!trimmed || trimmed === activeClient.name) {
      cancelTriggerEdit();
      return;
    }
    setTriggerSaving(true);
    await updateClient(activeClient.id, { name: trimmed });
    setTriggerSaving(false);
    setTriggerEditing(false);
    setTriggerDraft('');
  }, [activeClient, triggerDraft, updateClient, cancelTriggerEdit]);

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void commitTriggerEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelTriggerEdit();
      }
    },
    [commitTriggerEdit, cancelTriggerEdit]
  );

  // ── Per-row rename ───────────────────────────────────────────────────────
  const startRowEdit = useCallback((client: Client) => {
    setRowEditingId(client.id);
    setRowDraft(client.name ?? '');
    setRowMenuId(null);
  }, []);

  const cancelRowEdit = useCallback(() => {
    setRowEditingId(null);
    setRowDraft('');
  }, []);

  const commitRowEdit = useCallback(async () => {
    if (rowEditingId === null) return;
    const target = clients.find((c) => c.id === rowEditingId);
    if (!target) {
      cancelRowEdit();
      return;
    }
    const trimmed = rowDraft.trim();
    if (!trimmed || trimmed === target.name) {
      cancelRowEdit();
      return;
    }
    setRowSaving(true);
    await updateClient(target.id, { name: trimmed });
    setRowSaving(false);
    setRowEditingId(null);
    setRowDraft('');
  }, [rowEditingId, rowDraft, clients, updateClient, cancelRowEdit]);

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void commitRowEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelRowEdit();
      }
    },
    [commitRowEdit, cancelRowEdit]
  );

  const initials = activeClient ? getInitials(activeClient.name) : '?';

  return (
    <div id="client-selector" className="relative w-full" ref={dropdownRef}>
      <div className="flex items-center w-full">
        {triggerEditing ? (
          <input
            ref={triggerInputRef}
            type="text"
            value={triggerDraft}
            onChange={(e) => setTriggerDraft(e.target.value)}
            onKeyDown={handleTriggerKeyDown}
            onBlur={() => void commitTriggerEdit()}
            disabled={triggerSaving}
            className="w-full text-sm text-neutral-800 font-semibold bg-white border border-neutral-300 rounded-lg px-3 py-2 outline-none focus:border-neutral-400"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startTriggerEdit();
            }}
            className="flex items-center w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors duration-100 cursor-pointer"
            title="Double-click to rename"
          >
            <UserIcon size={16} className="mr-2.5 shrink-0 text-neutral-500" />
            <span className="flex-1 text-sm font-semibold text-neutral-800 select-none truncate text-left">
              {activeClient ? activeClient.name : 'Select client'}
            </span>
            <ChevronDownIcon
              size={16}
              className={`ml-1 shrink-0 text-neutral-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {dropdownOpen && !triggerEditing && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg z-[9999] border border-[#E9EAEB]">
          <div className="py-2">
            {clients.length > 0 ? (
              clients.map((client) => {
                const inits = getInitials(client.name);
                const isActive = activeClient?.id === client.id;
                const isEditingThisRow = rowEditingId === client.id;
                const isMenuOpenOnRow = rowMenuId === client.id;
                return (
                  <div
                    key={client.id}
                    className={`group relative flex items-center w-full px-4 py-2.5 text-sm transition-colors duration-100 ${
                      isActive ? 'bg-[#F5F5F6] text-[#181D27]' : 'text-[#414651] hover:bg-[#F5F5F6]'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold mr-3 flex-shrink-0"
                      style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
                    >
                      {inits}
                    </div>
                    {isEditingThisRow ? (
                      <input
                        ref={rowInputRef}
                        type="text"
                        value={rowDraft}
                        onChange={(e) => setRowDraft(e.target.value)}
                        onKeyDown={handleRowKeyDown}
                        onBlur={() => void commitRowEdit()}
                        disabled={rowSaving}
                        className="flex-1 text-[13px] text-[#181D27] font-medium bg-white border border-[#D5D7DA] rounded px-2 py-0.5 outline-none focus:border-[#A4A7AE]"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <button
                        onClick={() => handleClientSelect(client)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="font-medium truncate">{client.name}</div>
                        {client.email && (
                          <div className="text-xs text-[#717680] truncate">{client.email}</div>
                        )}
                      </button>
                    )}

                    {/* Three-dot menu trigger — visible on hover or while its
                        own menu is open. Stays out of edit-mode so renaming
                        is uncluttered. */}
                    {!isEditingThisRow && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRowMenuId(isMenuOpenOnRow ? null : client.id);
                        }}
                        className={`flex-shrink-0 ml-2 w-6 h-6 rounded flex items-center justify-center text-[#717680] hover:text-[#414651] hover:bg-[#E9EAEB] transition-opacity ${
                          isMenuOpenOnRow ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        aria-label="Client actions"
                      >
                        <MoreHorizontalIcon size={14} />
                      </button>
                    )}

                    {isMenuOpenOnRow && (
                      <div
                        className="absolute right-2 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-[#E9EAEB] z-[10000] py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => startRowEdit(client)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#414651] hover:bg-[#F5F5F6] transition-colors"
                        >
                          <PencilIcon size={13} />
                          Rename
                        </button>
                        <button
                          onClick={async () => {
                            setRowMenuId(null);
                            // Look up the latest scenario id for this client and run a
                            // diagnostic before opening the confirm dialog. We only
                            // want to repair if the corruption signature is present —
                            // otherwise warn the user to avoid clobbering an intact
                            // scenario.
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
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#414651] hover:bg-[#F5F5F6] transition-colors"
                          title="Last-resort recovery: rebuild propertyOrder from saved propertyInstances"
                        >
                          <WrenchIcon size={13} />
                          Repair scenario
                        </button>
                        <button
                          onClick={() => {
                            setRowMenuId(null);
                            setPendingDeleteClient(client);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#D92D20] hover:bg-[#FEF3F2] transition-colors"
                        >
                          <TrashIcon size={13} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-[#717680]">
                No scenarios found. Create a new client to get started.
              </div>
            )}
          </div>
        </div>
      )}

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
          empty). When intact, the dialog warns the user and disables the
          confirm button to avoid clobbering a healthy scenario. */}
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
