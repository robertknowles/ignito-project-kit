import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading, role } = useAuth();

  // Subscriptions are disabled during the testing period — drop any stale
  // pending-plan flag so it doesn't trigger checkout flows that no longer exist.
  useEffect(() => {
    if (user) {
      localStorage.removeItem('pending_subscription_plan');
    }
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If user is authenticated, redirect based on role.
  // (Previously new users were sent to /dashboard for an onboarding tour.
  // Tour is disabled and the home page is the new "build a property plan"
  // entry point, so all users — new or returning — land on /home.)
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
