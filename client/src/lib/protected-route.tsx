import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Redirect, Route, RouteComponentProps } from 'wouter';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log(`ProtectedRoute (${path}): Not authenticated, redirecting to /auth`);
    // We use window.location.href here to force a page refresh, which will
    // reset all the React state and fetch data fresh from the server
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
      return null;
    }
    
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  console.log(`ProtectedRoute (${path}): User authenticated, rendering component`);
  

  return (
    <Route path={path}>
      {(params) => <Component {...params} />}
    </Route>
  );
}