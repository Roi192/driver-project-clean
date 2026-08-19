import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type AuthContext = ReturnType<typeof useAuth>;

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  guard?: (auth: AuthContext) => boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, guard }: ProtectedRouteProps) {
  const auth = useAuth();
  const { user, loading, isAdmin } = auth;
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (guard && !guard(auth)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
