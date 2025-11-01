import React from 'react';
import { Dashboard } from './components/Dashboard';
import { Navbar } from './components/Navbar';
import { useClient } from './contexts/ClientContext';

export function App() {
  const { activeClient } = useClient();
  
  return (
    <div className="main-app flex flex-col h-screen w-full bg-[#f9fafb]">
      <Navbar />
      <div className="flex-1 overflow-hidden pb-8 px-8">
        <div className="bg-white rounded-lg h-full overflow-auto shadow-sm">
          {/* Force Dashboard to remount when client changes by using key prop */}
          <Dashboard key={activeClient?.id || 'no-client'} />
        </div>
      </div>
    </div>
  );
}
