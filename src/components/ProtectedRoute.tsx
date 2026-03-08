import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/integrations/supabase/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireSubscription?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  requireSubscription = true // Default to requiring subscription
}) => {
  const { user, loading, role, subscriptionStatus } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check subscription status - redirect unpaid users to upgrade page
  // If subscriptionStatus is still null, profile data hasn't loaded yet — show loading
  if (requireSubscription) {
    if (subscriptionStatus === null) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      );
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