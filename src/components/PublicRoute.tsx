import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PlanKey } from '@/config/stripe';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading, role } = useAuth();
  const [checkingCheckout, setCheckingCheckout] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  useEffect(() => {
    // Check for pending subscription plan when user is authenticated
    const handlePendingCheckout = async () => {
      const pendingPlan = localStorage.getItem('pending_subscription_plan') as PlanKey | null;

      if (!user || checkingCheckout || checkoutComplete) return;

      if (pendingPlan) {
        setCheckingCheckout(true);
        // Clear the pending plan immediately to prevent loops
        localStorage.removeItem('pending_subscription_plan');

        try {
          const { data, error } = await supabase.functions.invoke('create-checkout', {
            body: {
              plan: pendingPlan,
              userId: user.id
            }
          });

          if (!error && data?.url) {
            window.location.href = data.url;
            return;
          }
        } catch (err) {
          console.error('Checkout error:', err);
        }

        setCheckingCheckout(false);
        setCheckoutComplete(true);
      }
    };

    handlePendingCheckout();
  }, [user?.id, checkingCheckout, checkoutComplete]);

  if (loading || checkingCheckout) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">{checkingCheckout ? 'Redirecting to checkout...' : 'Loading...'}</div>
      </div>
    );
  }

  // If user is authenticated, redirect based on role and new user status
  if (user) {
    // Check if there's a pending checkout (handled by useEffect above)
    const pendingPlan = localStorage.getItem('pending_subscription_plan');
    if (pendingPlan) {
      // Wait for the useEffect to handle checkout
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Redirecting to checkout...</div>
        </div>
      );
    }
    
    // Check if this is a new user (just signed up)
    // New users should go to /dashboard to see the onboarding tour
    const isNewUser = localStorage.getItem('ignito_is_new_user') === 'true';
    
    if (isNewUser) {
      // Clear the flag so subsequent logins go to normal destination
      localStorage.removeItem('ignito_is_new_user');
      return <Navigate to="/dashboard" replace />;
    }
    
    // Existing users: Clients go to portal, agents/owners go to home page
    const redirectPath = role === 'client' ? '/portal' : '/home';
    return <Navigate to={redirectPath} replace />;
  }

  // If not authenticated, show the public page (landing page)
  return <>{children}</>;
};
