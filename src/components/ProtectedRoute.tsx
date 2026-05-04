import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/integrations/supabase/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireSubscription?: boolean;
}

// Subscriptions are disabled during the testing period: every signed-in user
// can reach protected routes regardless of plan status. Flip back to `true`
// when re-enabling Stripe.
const SUBSCRIPTION_GATE_ENABLED = false;

// Hard cap on how long we'll show "Loading..." before assuming the auth/profile
// fetch is wedged. Without this the user can sit on a blank loading screen
// indefinitely if Supabase hangs or the profile row is missing.
const LOADING_TIMEOUT_MS = 15_000;

const LoadingScreen: React.FC = () => {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);
  if (timedOut) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center">
        <div className="text-lg">This is taking longer than expected.</div>
        <div className="text-sm text-gray-500 max-w-md">
          Try refreshing the page. If it keeps loading, sign out and back in.
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg">Loading...</div>
    </div>
  );
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireSubscription = true // Default to requiring subscription
}) => {
  const { user, loading, role, subscriptionStatus } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Subscription gate is feature-flagged off during testing. When the flag is
  // on, redirect unpaid users to the upgrade page; if subscriptionStatus is
  // still null, profile data hasn't loaded yet — show the timeout-aware loader.
  if (SUBSCRIPTION_GATE_ENABLED && requireSubscription) {
    if (subscriptionStatus === null) {
      return <LoadingScreen />;
    }
    if (subscriptionStatus !== 'active') {
      return <Navigate to="/upgrade" replace />;
    }
  }

  // Check role restrictions - redirect unauthorized roles appropriately
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Clients go to portal, agents/owners go to home
    const fallback = role === 'client' ? '/portal' : '/home';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};