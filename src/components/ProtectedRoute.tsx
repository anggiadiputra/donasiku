import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  // Optimistic check: assume authenticated if session token exists in localStorage
  const [authenticated, setAuthenticated] = useState(() => {
    try {
      // Supabase stores session in localStorage with key pattern: sb-{project-ref}-auth-token
      const keys = Object.keys(localStorage);
      const hasAuthToken = keys.some(key => key.includes('sb-') && key.includes('-auth-token'));
      return hasAuthToken;
    } catch {
      return false;
    }
  });
  const location = useLocation();

  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);
    } catch (error) {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated && !loading) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

