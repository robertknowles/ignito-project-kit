/**
 * ClientSearchModal — ChatGPT-style command palette for finding a client.
 *
 * Opens centrally over whatever page the user is on (triggered from the
 * sidebar's "Search Clients" item or ⌘K). Type to filter, click a client to
 * load their scenario; "New Scenario" sits at the top like ChatGPT's
 * "New chat" row.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, PlusIcon, XIcon } from 'lucide-react';
import { useClient, type Client } from '@/contexts/ClientContext';
import { useLayout } from '@/contexts/LayoutContext';
import { useBucketedRecents } from './SidebarRecents';

export const ClientSearchModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const navigate = useNavigate();
  const { setActiveClient } = useClient();
  const { setDashboardTab } = useLayout();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { buckets, hasClients } = useBucketedRecents(query);

  // Reset + focus on every open.
  useEffect(() => {
    if (open) {
      setQuery('');
      // Focus after the panel mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const openClient = (client: Client) => {
    setActiveClient(client);
    setDashboardTab('plan');
    navigate('/dashboard');
    onClose();
  };

  const startNewScenario = () => {
    setActiveClient(null);
    setDashboardTab('plan');
    navigate('/dashboard');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 flex justify-center"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-[560px] mt-[14vh] self-start bg-white rounded-2xl shadow-2xl border border-[#E9EAEB] overflow-hidden flex flex-col max-h-[62vh]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search input row */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEB]">
          <SearchIcon size={17} className="shrink-0 text-[#A4A7AE]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients..."
            className="flex-1 min-w-0 text-[15px] text-[#181D27] placeholder:text-[#A4A7AE] bg-transparent border-none outline-none"
          />
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-[#717680] hover:text-[#414651] hover:bg-[#F5F5F6] transition-colors"
            aria-label="Close search"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          <button
            onClick={startNewScenario}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-transparent border-none cursor-pointer text-left hover:bg-[#F5F5F6] transition-colors"
          >
            <PlusIcon size={16} className="shrink-0 text-[#717680]" />
            <span className="text-[14px] font-medium text-[#181D27]">New Scenario</span>
          </button>

          {buckets.map((bucket) => (
            <React.Fragment key={bucket.label}>
              <div className="px-3 pt-3 pb-1 text-[11px] font-medium text-[#A4A7AE]">
                {bucket.label}
              </div>
              {bucket.clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => openClient(client)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-transparent border-none cursor-pointer text-left hover:bg-[#F5F5F6] transition-colors"
                >
                  <span className="flex-1 min-w-0 text-[14px] font-medium text-[#414651] truncate">
                    {client.name}
                  </span>
                  {client.email && (
                    <span className="shrink-0 max-w-[200px] text-[12px] text-[#A4A7AE] truncate">
                      {client.email}
                    </span>
                  )}
                </button>
              ))}
            </React.Fragment>
          ))}

          {hasClients && buckets.length === 0 && (
            <div className="px-3 py-6 text-center text-[13px] text-[#A4A7AE]">
              No clients match
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
