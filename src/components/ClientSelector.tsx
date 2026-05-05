import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';

const AVATAR_BG = '#535862';
const AVATAR_TEXT = '#FFFFFF';

const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export const ClientSelector: React.FC = () => {
  const { clients, activeClient, setActiveClient, updateClient } = useClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        // Don't cancel an in-progress rename on outside click — let blur on the
        // input commit it. Outside clicks bubble through to blur first.
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus + select-all when entering edit mode so the user can immediately type.
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleClientSelect = (client: typeof activeClient) => {
    setActiveClient(client);
    setDropdownOpen(false);
  };

  const startEdit = useCallback(() => {
    if (!activeClient) return;
    setDraftName(activeClient.name ?? '');
    setIsEditing(true);
    setDropdownOpen(false);
  }, [activeClient]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setDraftName('');
  }, []);

  const commitEdit = useCallback(async () => {
    if (!activeClient) {
      cancelEdit();
      return;
    }
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === activeClient.name) {
      cancelEdit();
      return;
    }
    setSaving(true);
    const ok = await updateClient(activeClient.id, { name: trimmed });
    setSaving(false);
    setIsEditing(false);
    setDraftName('');
    if (!ok) {
      // updateClient returns false on failure; nothing else to do — the trigger
      // will keep showing the previous name (since context wasn't updated).
    }
  }, [activeClient, draftName, updateClient, cancelEdit]);

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
    [commitEdit, cancelEdit]
  );

  const initials = activeClient ? getInitials(activeClient.name) : '?';

  return (
    <div id="client-selector" className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-transparent hover:bg-[#F5F5F6] transition-colors duration-150">
        <button
          onClick={() => !isEditing && setDropdownOpen(!dropdownOpen)}
          aria-label="Open client menu"
          className="flex items-center justify-center"
          disabled={isEditing}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
          >
            {initials}
          </div>
        </button>

        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => void commitEdit()}
            disabled={saving}
            className="text-[13px] text-[#414651] font-medium bg-white border border-[#D5D7DA] rounded px-2 py-0.5 outline-none focus:border-[#A4A7AE] min-w-[120px] max-w-[260px]"
            // Stop clicks inside the input from bubbling up to the dropdown
            // outside-click handler closing things behind us.
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startEdit();
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

      {dropdownOpen && !isEditing && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg z-[9999] border border-[#E9EAEB]">
          <div className="py-2">
            {clients.length > 0 ? (
              clients.map((client) => {
                const inits = getInitials(client.name);
                return (
                  <button
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className={`flex items-center w-full px-4 py-2.5 text-sm hover:bg-[#F5F5F6] transition-colors duration-100 ${
                      activeClient?.id === client.id ? 'bg-[#F5F5F6] text-[#181D27]' : 'text-[#414651]'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold mr-3 flex-shrink-0"
                      style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
                    >
                      {inits}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{client.name}</div>
                      {client.email && (
                        <div className="text-xs text-[#717680]">{client.email}</div>
                      )}
                    </div>
                  </button>
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
    </div>
  );
};
