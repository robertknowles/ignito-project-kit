import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';

const AVATAR_COLORS = [
  '#2563EB', '#D97706', '#059669', '#DC2626', '#7C3AED', '#0891B2', '#EA580C', '#4F46E5',
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

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

  const avatarColor = activeClient ? getAvatarColor(activeClient.name) : '#9CA3AF';
  const initials = activeClient ? getInitials(activeClient.name) : '?';

  return (
    <div id="client-selector" className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-transparent hover:bg-gray-50 transition-colors"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>
        <span className="text-[13px] text-gray-700 font-medium">
          {activeClient ? activeClient.name : 'Select Client'}
        </span>
        <ChevronDownIcon
          size={15}
          className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {dropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-[9999] border border-gray-200">
          <div className="py-2">
            {clients.length > 0 ? (
              clients.map((client) => {
                const color = getAvatarColor(client.name);
                const inits = getInitials(client.name);
                return (
                  <button
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className={`flex items-center w-full px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                      activeClient?.id === client.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold mr-3 flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {inits}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{client.name}</div>
                      {client.email && (
                        <div className="text-xs text-gray-500">{client.email}</div>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">
                No scenarios found. Create a new client to get started.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};