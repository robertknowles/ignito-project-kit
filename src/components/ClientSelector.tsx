import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';

export const ClientSelector: React.FC = () => {
  const { clients, activeClient, setActiveClient } = useClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debugging logs
  useEffect(() => {
    console.log('ClientSelector - clients:', clients);
    console.log('ClientSelector - dropdownOpen:', dropdownOpen);
    console.log('ClientSelector - activeClient:', activeClient);
  }, [clients, dropdownOpen, activeClient]);

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center px-3 py-1.5 border border-[#f3f4f6] rounded-full bg-white hover:bg-[#f9fafb] transition-colors"
      >
        <div className="w-1.5 h-1.5 bg-[#10b981] bg-opacity-50 rounded-full mr-2"></div>
        <span className="text-sm text-[#374151] font-light">
          {activeClient ? `${activeClient.name}'s Scenario` : 'Select Client'}
        </span>
        <ChevronDownIcon 
          size={14} 
          className={`ml-2 text-[#6b7280] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {dropdownOpen && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-white rounded-lg shadow-lg z-[9999] border border-[#f3f4f6]">
          <div className="py-2">
            {clients.length > 0 ? (
              clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className={`flex items-center w-full px-4 py-2 text-sm hover:bg-[#f9fafb] ${
                    activeClient?.id === client.id ? 'bg-[#f0f9ff] text-[#0369a1]' : 'text-[#374151]'
                  }`}
                >
                  <div className="w-1.5 h-1.5 bg-[#10b981] bg-opacity-50 rounded-full mr-3"></div>
                  <div className="text-left">
                    <div className="font-medium">{client.name}</div>
                    {client.email && (
                      <div className="text-xs text-[#6b7280]">{client.email}</div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-[#6b7280]">
                No scenarios found. Create a new client to get started.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};