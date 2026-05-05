import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDownIcon, MoreHorizontal as MoreHorizontalIcon, Pencil as PencilIcon, Trash2 as TrashIcon } from 'lucide-react';
import { useClient, type Client } from '@/contexts/ClientContext';
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
    <div id="client-selector" className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-transparent hover:bg-[#F5F5F6] transition-colors duration-150">
        <button
          onClick={() => !triggerEditing && setDropdownOpen(!dropdownOpen)}
          aria-label="Open client menu"
          className="flex items-center justify-center"
          disabled={triggerEditing}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
          >
            {initials}
          </div>
        </button>

        {triggerEditing ? (
          <input
            ref={triggerInputRef}
            type="text"
            value={triggerDraft}
            onChange={(e) => setTriggerDraft(e.target.value)}
            onKeyDown={handleTriggerKeyDown}
            onBlur={() => void commitTriggerEdit()}
            disabled={triggerSaving}
            className="text-[13px] text-[#414651] font-medium bg-white border border-[#D5D7DA] rounded px-2 py-0.5 outline-none focus:border-[#A4A7AE] min-w-[120px] max-w-[260px]"
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
            className="flex items-center gap-2"
            title="Double-click to rename"
          >
            <span className="text-[13px] text-[#414651] font-medium select-none">
              {activeClient ? activeClient.name : 'Select Client'}
            </span>
            <ChevronDownIcon
              size={15}
              className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
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
                        className="absolute right-2 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-[#E9EAEB] z-[10000] py-1"
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
    </div>
  );
};
