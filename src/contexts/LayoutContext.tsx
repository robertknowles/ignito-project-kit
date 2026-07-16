import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, MutableRefObject } from 'react';
import type { NLParseResponse } from '@/types/nlParse';

export interface HighlightPeriod {
  startYear: number;
  endYear: number;
}

export type DashboardTab = 'plan' | 'brief' | 'portfolio' | 'inputs';

interface LayoutContextType {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  planGenerating: boolean;
  setPlanGenerating: (generating: boolean) => void;
  highlightPeriod: HighlightPeriod | null;
  setHighlightPeriod: (period: HighlightPeriod | null) => void;
  chatPanelWidth: number;
  setChatPanelWidth: (width: number) => void;
  dashboardTab: DashboardTab;
  setDashboardTab: (tab: DashboardTab) => void;
  pendingPlanResponse: NLParseResponse | null;
  setPendingPlanResponse: (response: NLParseResponse | null) => void;
  confirmPlanHandler: MutableRefObject<((r: NLParseResponse) => void) | null>;
  /** Regenerate the pending plan with a different strategy preset. Set by
   *  ChatPanel, called from the confirmation screen's strategy dropdown. */
  replanPlanHandler: MutableRefObject<((preset: string, response: NLParseResponse) => void) | null>;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  // Docked AI chat column visibility. Starts closed so the dashboard has focus;
  // the purple launcher opens it. Persisted so it survives reloads.
  const [drawerOpen, setDrawerOpenState] = useState<boolean>(
    () => localStorage.getItem('proppath-chat-open') === '1',
  );
  const setDrawerOpen = useCallback((open: boolean) => {
    setDrawerOpenState(open);
    localStorage.setItem('proppath-chat-open', open ? '1' : '0');
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem('proppath-sidebar-collapsed') === '1',
  );
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('proppath-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  }, []);
  const [planGenerating, setPlanGenerating] = useState(false);
  const [highlightPeriod, setHighlightPeriodState] = useState<HighlightPeriod | null>(null);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('plan');
  const [pendingPlanResponse, setPendingPlanResponse] = useState<NLParseResponse | null>(null);
  const confirmPlanHandler = useRef<((r: NLParseResponse) => void) | null>(null);
  const replanPlanHandler = useRef<((preset: string, response: NLParseResponse) => void) | null>(null);
  const DEFAULT_CHAT_WIDTH = 360;
  const [chatPanelWidth, setChatPanelWidthState] = useState<number>(() => {
    const saved = localStorage.getItem('proppath-chat-width');
    return saved ? parseInt(saved, 10) : DEFAULT_CHAT_WIDTH;
  });
  const setChatPanelWidth = useCallback((width: number) => {
    const clamped = Math.max(280, Math.min(600, width));
    setChatPanelWidthState(clamped);
    localStorage.setItem('proppath-chat-width', String(clamped));
  }, []);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const setHighlightPeriod = useCallback((period: HighlightPeriod | null) => {
    // Clear any existing auto-clear timer
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightPeriodState(period);
    // Auto-clear after 8 seconds
    if (period) {
      highlightTimerRef.current = setTimeout(() => setHighlightPeriodState(null), 8000);
    }
  }, []);

  const toggleDrawer = useCallback(() => setDrawerOpen(!drawerOpen), [drawerOpen, setDrawerOpen]);

  return (
    <LayoutContext.Provider value={{ drawerOpen, setDrawerOpen, toggleDrawer, sidebarCollapsed, toggleSidebar, planGenerating, setPlanGenerating, highlightPeriod, setHighlightPeriod, chatPanelWidth, setChatPanelWidth, dashboardTab, setDashboardTab, pendingPlanResponse, setPendingPlanResponse, confirmPlanHandler, replanPlanHandler }}>
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
