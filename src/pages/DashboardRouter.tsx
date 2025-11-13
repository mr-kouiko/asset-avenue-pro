import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';

const DashboardRouter = () => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isAdmin, isCreator, isClient } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <div className="animate-spin h-12 w-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Route based on user role
  if (isCreator || isAdmin) {
    return <Navigate to="/seller-dashboard" replace />;
  }
  
  if (isClient) {
    return <Navigate to="/buyer-dashboard" replace />;
  }

  // If no role is defined, show error
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16 text-center">
        <AlertCircle className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-4">Role Not Defined</h1>
        <p className="text-muted-foreground mb-8">
          Your user role could not be determined. Please contact support.
        </p>
        <p className="text-sm text-muted-foreground">
          Detected role: {role || 'None'}
        </p>
      </div>
    </div>
  );
};

export default DashboardRouter;