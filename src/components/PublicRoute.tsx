import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If user is authenticated, redirect based on role and new user status
  if (user) {
    // Check if this is a new user (just signed up)
    // New users should go to /dashboard to see the onboarding tour
    const isNewUser = localStorage.getItem('ignito_is_new_user') === 'true';
    
    if (isNewUser) {
      // Clear the flag so subsequent logins go to normal destination
      localStorage.removeItem('ignito_is_new_user');
      return <Navigate to="/dashboard" replace />;
    }
    
    // Existing users: Clients go to dashboard, agents/owners go to clients page
    const redirectPath = role === 'client' ? '/dashboard' : '/clients';
    return <Navigate to={redirectPath} replace />;
  }

  // If not authenticated, show the public page (landing page)
  return <>{children}</>;
};
