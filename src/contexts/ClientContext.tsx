import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
}

interface ClientContextType {
  clients: Client[];
  activeClient: Client | null;
  loading: boolean;
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
  const { user, loading: authLoading } = useAuth();

  const fetchClients = async () => {
    if (!user || authLoading) {
      console.log('ClientContext - fetchClients skipped:', { user: !!user, authLoading });
      return;
    }
    
    console.log('ClientContext - Fetching clients for user:', user.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('ClientContext - Fetched clients:', data);
      setClients(data || []);
      
      // Set first client as active if none is selected
      if (!activeClient && data && data.length > 0) {
        console.log('ClientContext - Setting active client:', data[0]);
        setActiveClient(data[0]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
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
          }
        ])
        .select()
        .single();

      if (error) throw error;

      const newClient = data as Client;
      setClients(prev => [newClient, ...prev]);
      setActiveClient(newClient);
      
      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      return null;
    }
  };

  const updateClient = async (clientId: number, updates: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setClients(prev => prev.map(client => 
        client.id === clientId ? { ...client, ...updates } : client
      ));

      // Update active client if it's the one being updated
      if (activeClient?.id === clientId) {
        setActiveClient({ ...activeClient, ...updates });
      }

      return true;
    } catch (error) {
      console.error('Error updating client:', error);
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
        console.error('Error deleting scenarios:', scenariosError);
        throw scenariosError;
      }

      // Then delete the client
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user.id);

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
      console.error('Error deleting client:', error);
      return false;
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      fetchClients();
    }
  }, [user, authLoading]);

  const value = {
    clients,
    activeClient,
    loading,
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