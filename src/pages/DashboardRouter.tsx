import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useSEO } from "@/hooks/useSEO";

const DashboardRouter = () => {
  useSEO({ title: "Dashboard", description: "Your VisuStock dashboard.", noindex: true });
  const { user, loading, role, roleLoading, isAdmin, isCreator, isClient } = useAuth();

  // Wait for auth AND role loading to prevent false "no role" state
  if (loading || roleLoading) {
    return null;
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