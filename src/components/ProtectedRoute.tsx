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
  if (requireSubscription && subscriptionStatus !== 'active') {
    return <Navigate to="/upgrade" replace />;
  }

  // Check role restrictions - redirect unauthorized roles to dashboard
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};