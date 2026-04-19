import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';

const AVATAR_BG = '#535862';
const AVATAR_TEXT = '#FFFFFF';

const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export const ClientSelector: React.FC = () => {
  const { clients, activeClient, setActiveClient } = useClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClientSelect = (client: typeof activeClient) => {
    setActiveClient(client);
    setDropdownOpen(false);
  };

  const initials = activeClient ? getInitials(activeClient.name) : '?';

  return (
    <div id="client-selector" className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-transparent hover:bg-[#F5F5F6] transition-colors duration-150"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
          style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
        >
          {initials}
        </div>
        <span className="text-[13px] text-[#414651] font-medium">
          {activeClient ? activeClient.name : 'Select Client'}
        </span>
        <ChevronDownIcon
          size={15}
          className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {dropdownOpen && (
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