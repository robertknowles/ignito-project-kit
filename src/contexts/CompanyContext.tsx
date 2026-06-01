import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface TeamMember {
  id: string;
  full_name: string | null;
  role: 'owner' | 'agent' | 'other';
  created_at: string;
  email?: string;
}

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  owner_id: string | null;
  seat_limit: number;
  is_client_interactive_enabled: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CompanyBrandingUpdate {
  name?: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  is_client_interactive_enabled?: boolean;
}

interface CompanyContextType {
  company: Company | null;
  teamMembers: TeamMember[];
  seatLimit: number;
  activeSeats: number;
  canAddStaff: boolean;
  loading: boolean;
  error: string | null;
  fetchCompanyData: () => Promise<void>;
  inviteAgent: (email: string, name: string) => Promise<{ success: boolean; error?: string }>;
  updateCompanyBranding: (updates: CompanyBrandingUpdate) => Promise<{ success: boolean; error?: string }>;
  updateMemberRole: (memberId: string, newRole: 'owner' | 'agent' | 'other') => Promise<{ success: boolean; error?: string }>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, companyId, role, loading: authLoading } = useAuth();

  // Calculate seat usage - only count owner and agent roles
  const activeSeats = teamMembers.filter(
    (member) => member.role === 'owner' || member.role === 'agent'
  ).length;

  const seatLimit = company?.seat_limit ?? 1;
  const canAddStaff = activeSeats < seatLimit;

  const fetchCompanyData = useCallback(async () => {
    if (!user || !companyId || authLoading) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) {
        setError('Failed to fetch company data');
        setLoading(false);
        return;
      }

      setCompany(companyData as Company);

      // Fetch team members via RPC (joins profiles with auth.users for email)
      if (role === 'owner' || role === 'agent') {
        const { data: membersData, error: membersError } = await supabase
          .rpc('get_team_members', { p_company_id: companyId });

        if (membersError) {
          // Don't treat this as a fatal error - permissions issue or user may not have access yet
        } else {
          const members: TeamMember[] = (membersData || []).map((m: any) => ({
            id: m.id,
            full_name: m.full_name,
            email: m.email,
            role: m.role as 'owner' | 'agent' | 'other',
            created_at: m.created_at,
          }));

          setTeamMembers(members);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, companyId, role, authLoading]);

  const inviteAgent = async (
    email: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!canAddStaff) {
      return {
        success: false,
        error: 'Seat limit reached. Please upgrade your plan to add more staff.',
      };
    }

    if (!companyId || role !== 'owner') {
      return {
        success: false,
        error: 'Only company owners can invite agents.',
      };
    }

    try {
      // Create a new user via Supabase Auth
      // Note: In production, you'd typically use an invite flow
      // For now, we'll create the user with a temporary password
      // and they would reset it on first login
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: { name },
        },
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user' };
      }

      // Update the profile with company_id and role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_id: companyId,
          role: 'agent',
          full_name: name,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        return { success: false, error: 'Failed to set up agent profile' };
      }

      // Refresh team data
      await fetchCompanyData();

      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const updateCompanyBranding = async (
    updates: CompanyBrandingUpdate
  ): Promise<{ success: boolean; error?: string }> => {
    if (!companyId) {
      return { success: false, error: 'No company ID available' };
    }

    if (role !== 'owner') {
      return { success: false, error: 'Only company owners can update branding' };
    }

    try {
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Update local company state
      if (company) {
        setCompany({
          ...company,
          ...updates,
        });
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const updateMemberRole = async (
    memberId: string,
    newRole: 'owner' | 'agent' | 'other'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!companyId) {
      return { success: false, error: 'No company ID available' };
    }

    if (role !== 'owner') {
      return { success: false, error: 'Only company owners can update member roles' };
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('company_id', companyId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Update local team members state
      setTeamMembers((prev) =>
        prev.map((member) =>
          member.id === memberId ? { ...member, role: newRole } : member
        )
      );

      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  useEffect(() => {
    // Only proceed once auth is done loading
    if (authLoading) {
      return;
    }
    
    // If user is logged in with a company, fetch data
    if (user && companyId) {
      fetchCompanyData();
    } else {
      // No user or no company - stop loading and show appropriate state
      setLoading(false);
    }
  }, [user, companyId, authLoading, fetchCompanyData]);

  const value = {
    company,
    teamMembers,
    seatLimit,
    activeSeats,
    canAddStaff,
    loading,
    error,
    fetchCompanyData,
    inviteAgent,
    updateCompanyBranding,
    updateMemberRole,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

