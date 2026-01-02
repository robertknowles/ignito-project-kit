import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { LeftRail } from './components/LeftRail';
import { TopBar } from './components/TopBar';
import { InputDrawer } from './components/InputDrawer';
import { useClient } from './contexts/ClientContext';

export function App() {
  const { activeClient } = useClient();
  const [drawerOpen, setDrawerOpen] = useState(true);
  
  return (
    <div className="main-app flex h-screen w-full bg-[#f9fafb]">
      <LeftRail />
      <InputDrawer isOpen={drawerOpen} onToggle={() => setDrawerOpen(!drawerOpen)} />
      
      {/* Main Content Area - margin adjusts based on drawer state */}
      <div 
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          drawerOpen ? 'ml-96' : 'ml-16'
        }`}
      >
        <TopBar />
        <div className="flex-1 overflow-hidden p-4">
          {/* Force Dashboard to remount when client changes by using key prop */}
          <Dashboard key={activeClient?.id || 'no-client'} />
        </div>
      </div>
    </div>
  );
}
