import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/integrations/supabase/types';
import { SubscriptionTier, SubscriptionStatus } from '@/config/stripe';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  companyId: string | null;
  subscriptionTier: SubscriptionTier | null;
  subscriptionStatus: SubscriptionStatus | null;
  clientRoadmapsLimit: number;
  clientRoadmapsUsed: number;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [clientRoadmapsLimit, setClientRoadmapsLimit] = useState<number>(0);
  const [clientRoadmapsUsed, setClientRoadmapsUsed] = useState<number>(0);

  // Fetch user profile data (role, company_id, and subscription info)
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, company_id, subscription_tier, subscription_status, client_roadmaps_limit, client_roadmaps_used')
        .eq('id', userId)
        .single();

      if (error) {
        return;
      }

      if (data) {
        setRole(data.role as UserRole | null);
        setCompanyId(data.company_id);
        setSubscriptionTier((data.subscription_tier as SubscriptionTier) || 'free');
        setSubscriptionStatus((data.subscription_status as SubscriptionStatus) || 'inactive');
        setClientRoadmapsLimit(data.client_roadmaps_limit || 0);
        setClientRoadmapsUsed(data.client_roadmaps_used || 0);
      }
    } catch (error) {
      // Profile fetch failed - user will need to re-authenticate
    }
  };

  // Refresh subscription data (useful after checkout success)
  const refreshSubscription = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id);
    }
  };

  // Clear profile data on sign out
  const clearProfileData = () => {
    setRole(null);
    setCompanyId(null);
    setSubscriptionTier(null);
    setSubscriptionStatus(null);
    setClientRoadmapsLimit(0);
    setClientRoadmapsUsed(0);
  };

  useEffect(() => {
    let isMounted = true;
    // Track whether the initial session has been handled by getSession()
    // so onAuthStateChange doesn't duplicate the profile fetch on mount
    let initialLoadDone = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Skip profile fetch on initial mount — getSession() handles that below
        if (!initialLoadDone) return;

        // Handle subsequent auth changes (sign-in, sign-out, token refresh)
        if (session?.user) {
          // Defer profile fetch to avoid Supabase client deadlock
          setTimeout(async () => {
            if (!isMounted) return;
            await fetchUserProfile(session.user.id);
          }, 0);
        } else {
          clearProfileData();
        }
      }
    );

    // Handle initial session load (runs once on mount)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }

      initialLoadDone = true;
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // Fetch profile immediately so subscription status is ready
    // before the caller navigates to a protected route
    if (!error && data.user) {
      await fetchUserProfile(data.user.id);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    // Redirect to email-confirmed page after verification (not auto-login)
    const redirectUrl = `${window.location.origin}/email-confirmed`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { 
          name: name || undefined,
          role: 'owner',  // New users from sign-up are always owners
        },
      }
    });
    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      clearProfileData();
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    role,
    companyId,
    subscriptionTier,
    subscriptionStatus,
    clientRoadmapsLimit,
    clientRoadmapsUsed,
    signIn,
    signUp,
    signOut,
    refreshSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
