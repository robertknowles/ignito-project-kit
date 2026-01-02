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
        className="flex items-center px-4 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2.5"></div>
        <span className="text-[13px] text-gray-700 font-medium">
          {activeClient ? `${activeClient.name}'s Scenario` : 'Select Client'}
        </span>
        <ChevronDownIcon 
          size={16} 
          className={`ml-2 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {dropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-[9999] border border-gray-200">
          <div className="py-2">
            {clients.length > 0 ? (
              clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className={`flex items-center w-full px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                    activeClient?.id === client.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mr-3 ${activeClient?.id === client.id ? 'bg-gray-900' : 'bg-green-400'}`}></div>
                  <div className="text-left">
                    <div className="font-medium">{client.name}</div>
                    {client.email && (
                      <div className="text-xs text-gray-500">{client.email}</div>
                    )}
                  </div>
                </button>
              ))
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