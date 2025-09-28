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
  const { user } = useAuth();

  const fetchClients = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setClients(data || []);
      
      // Set first client as active if none is selected
      if (!activeClient && data && data.length > 0) {
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

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const value = {
    clients,
    activeClient,
    loading,
    setActiveClient,
    createClient,
    fetchClients,
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
};