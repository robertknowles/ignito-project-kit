import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LayoutContextType {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  // NL pivot: signals that a plan is being generated (shows skeleton UI on Dashboard)
  planGenerating: boolean;
  setPlanGenerating: (generating: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [planGenerating, setPlanGenerating] = useState(false);

  const toggleDrawer = () => setDrawerOpen(prev => !prev);

  return (
    <LayoutContext.Provider value={{ drawerOpen, setDrawerOpen, toggleDrawer, planGenerating, setPlanGenerating }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
