import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading, role } = useAuth();
  const [resumingCheckout, setResumingCheckout] = useState(false);

  // Resume a checkout the visitor started from the landing pricing section
  // before they had an account: the chosen plan is parked in localStorage,
  // and once they're signed in (post email-confirmation) we send them
  // straight to Stripe instead of the dashboard.
  useEffect(() => {
    if (!user) return;

    const pendingPlan = localStorage.getItem('pending_subscription_plan');
    if (!pendingPlan) return;
    localStorage.removeItem('pending_subscription_plan');

    if (role === 'client') return;

    setResumingCheckout(true);
    supabase.functions
      .invoke('create-checkout', { body: { plan: pendingPlan } })
      .then(({ data, error }) => {
        if (!error && data?.url) {
          window.location.href = data.url;
        } else {
          // Already subscribed/comped or checkout unavailable — fall through
          // to the normal in-app redirect.
          setResumingCheckout(false);
        }
      })
      .catch(() => setResumingCheckout(false));
  }, [user?.id, role]);

  if (loading || resumingCheckout) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">{resumingCheckout ? 'Taking you to checkout...' : 'Loading...'}</div>
      </div>
    );
  }

  // If user is authenticated, redirect based on role.
  // (Previously new users were sent to /dashboard for an onboarding tour.
  // Tour is disabled and the home page is the new "build a property plan"
  // entry point, so all users - new or returning - land on /home.)
  if (user) {
    // Clear any leftover new-user flag so we don't trip old code paths.
    if (localStorage.getItem('ignito_is_new_user') === 'true') {
      localStorage.removeItem('ignito_is_new_user');
    }

    // Clients go to the portal; agents/owners go to the home page.
    const redirectPath = role === 'client' ? '/portal' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // If not authenticated, show the public page (landing page)
  return <>{children}</>;
};
