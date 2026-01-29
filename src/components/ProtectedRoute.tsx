import { useAuth } from '@/hooks/useAuth';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackMessage?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  fallbackMessage = "You don't have the necessary permissions to access this page."
}: ProtectedRouteProps) {
  const { user, loading, role, roleLoading } = useAuth();

  // Wait for auth AND role loading - return null for seamless experience
  if (loading || roleLoading) {
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <AlertCircle className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-4">Login Required</h1>
          <p className="text-muted-foreground mb-8">
            You must be logged in to access this page.
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <AlertCircle className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-8">
            {fallbackMessage}
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Current role: {role || 'Not defined'} | Required roles: {allowedRoles.join(', ')}
          </p>
          <Button size="lg" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}