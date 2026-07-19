import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { track, EVENTS } from '@/lib/analytics';
import { useAuth } from './AuthContext';
import type { ClientStage, PortalStatus, RoadmapStatus } from '@/integrations/supabase/types';

export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  company_id?: string;
  // Lifecycle & workflow
  stage: ClientStage;
  portal_status: PortalStatus;
  roadmap_status: RoadmapStatus;
  next_review_date?: string;
  last_active_at?: string;
  strategy_type?: string;
  // Set when a portal client edits their own figures/portfolio; cleared when the
  // BA next saves/regenerates. Drives the "Details updated" badge in the client list.
  pending_client_update_at?: string;
  pending_client_update_note?: string;
  // Personal details
  date_of_birth?: string;
  address?: string;
  marital_status?: string;
  dependants?: number;
  // Financial snapshot
  employment?: string;
  annual_income?: number;
  partner_income?: number;
  available_savings?: number;
  borrowing_capacity?: number;
  pre_approval_status?: string;
  pre_approval_expiry?: string;
  // Investment preferences
  risk_tolerance?: string;
  primary_goal?: string;
  preferred_property_type?: string;
  preferred_locations?: string;
  purchase_timeline?: string;
}

interface ClientContextType {
  clients: Client[];
  activeClient: Client | null;
  loading: boolean;
  // Seat usage - based on client count
  activeSeats: number;
  seatLimit: number;
  canAddClient: boolean;
  setActiveClient: (client: Client | null) => void;
  createClient: (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<Client | null>;
  updateClient: (clientId: number, updates: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at' | 'user_id'>>) => Promise<boolean>;
  deleteClient: (clientId: number) => Promise<boolean>;
  fetchClients: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const useClient = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
};

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [seatLimit, setSeatLimit] = useState(1);
  const { user, loading: authLoading, role, companyId } = useAuth();

  // Calculate seat usage based on client count
  const activeSeats = clients.length;
  const canAddClient = activeSeats < seatLimit;

  const fetchClients = async () => {
    if (!user || authLoading) {
      return;
    }
    setLoading(true);
    try {
      // Fetch seat limit from company if we have a companyId
      if (companyId) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('seat_limit')
          .eq('id', companyId)
          .single();

        if (!companyError && companyData) {
          setSeatLimit(companyData.seat_limit ?? 1);
        }
      }

      let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      // Role-based filtering:
      // - Owner: sees all clients in their company
      // - Agent: sees only clients they created
      // - Client: handled by RLS (they see their own scenarios, not other clients)
      if (role === 'owner' && companyId) {
        // Owner sees all clients in their company
        query = query.eq('company_id', companyId);
      } else if (role === 'agent') {
        // Agent sees only clients they created
        query = query.eq('user_id', user.id);
      }
      // For 'client' role, RLS handles access - they shouldn't see client list anyway

      const { data, error } = await query;

      if (error) throw error;
      
      setClients(data || []);

      // On page load, always start with no active client (New Client view).
      // User selects a client from the sidebar to load their scenario.
      // activeClient is only set during the SPA session, never restored from localStorage.
    } catch (error) {
      // Failed to fetch clients
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Client | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            ...clientData,
            user_id: user.id,
            company_id: companyId, // Associate client with the agent's company
          }
        ])
        .select()
        .single();

      if (error) throw error;

      const newClient = data as Client;
      setClients(prev => [newClient, ...prev]);
      setActiveClient(newClient);
      track(EVENTS.clientCreated, { has_company: !!companyId });

      return newClient;
    } catch (error) {
      return null;
    }
  };

  const updateClient = async (clientId: number, updates: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<boolean> => {
    if (!user) return false;

    try {
      // RLS policies handle access control - no need to filter by user_id
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId);

      if (error) throw error;

      // Update local state
      setClients(prev => prev.map(client =>
        client.id === clientId ? { ...client, ...updates } : client
      ));

      // Update active client if it's the one being updated. Use the
      // functional updater so the check fires against the latest
      // activeClient - the closure value is stale when updateClient is
      // called shortly after setActiveClient (e.g. AI plan response
      // landing right after a fresh client was made active).
      setActiveClient(prev => (prev?.id === clientId ? { ...prev, ...updates } : prev));

      return true;
    } catch (error) {
      return false;
    }
  };

  const deleteClient = async (clientId: number): Promise<boolean> => {
    if (!user) return false;

    try {
      // First delete all related scenarios
      const { error: scenariosError } = await supabase
        .from('scenarios')
        .delete()
        .eq('client_id', clientId);

      if (scenariosError) {
        throw scenariosError;
      }

      // Then delete the client - RLS policies handle access control
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      // Update local state
      setClients(prev => prev.filter(client => client.id !== clientId));

      // If the deleted client was active, set a new active client
      if (activeClient?.id === clientId) {
        const remainingClients = clients.filter(c => c.id !== clientId);
        setActiveClient(remainingClients.length > 0 ? remainingClients[0] : null);
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    if (user && !authLoading && role) {
      fetchClients();
    }
  }, [user, authLoading, role, companyId]);

  // No longer persisting activeClient - reload always goes to New Client view.

  const value = {
    clients,
    activeClient,
    loading,
    activeSeats,
    seatLimit,
    canAddClient,
    setActiveClient,
    createClient,
    updateClient,
    deleteClient,
    fetchClients,
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
};