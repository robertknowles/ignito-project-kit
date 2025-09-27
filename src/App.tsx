import React from 'react';
import { Dashboard } from './components/Dashboard';
import { Navbar } from './components/Navbar';
import { PropertySelectionProvider } from './contexts/PropertySelectionContext';
import { DataAssumptionsProvider } from './contexts/DataAssumptionsContext';

export function App() {
  return (
    <DataAssumptionsProvider>
      <PropertySelectionProvider>
        <div className="flex flex-col h-screen w-full bg-[#f9fafb] font-sans">
          <Navbar />
          <div className="flex-1 overflow-hidden pb-8 px-8">
            <div className="bg-white rounded-lg h-full overflow-auto shadow-sm">
              <Dashboard />
            </div>
          </div>
        </div>
      </PropertySelectionProvider>
    </DataAssumptionsProvider>
  );
}
