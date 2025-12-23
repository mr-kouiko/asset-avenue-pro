import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";

// SECURITY: Only this email can access admin features
const AUTHORIZED_ADMIN_EMAIL = "info@visitenow.ma";

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

export const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verifyAdminAccess = async () => {
      if (authLoading || roleLoading) return;

      if (!user) {
        setVerifying(false);
        return;
      }

      // CRITICAL SECURITY CHECK: Verify email matches authorized admin
      if (user.email !== AUTHORIZED_ADMIN_EMAIL) {
        toast({
          variant: "destructive",
          title: "Accès refusé",
          description: "Cette zone est réservée à l'administrateur exclusif."
        });
        setVerifying(false);
        return;
      }

      // Double-check role in database
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || roleData?.role !== 'admin') {
        toast({
          variant: "destructive",
          title: "Accès refusé",
          description: "Rôle administrateur non vérifié."
        });
        setVerifying(false);
        return;
      }

      // Log admin access for security audit
      await supabase.rpc('log_security_event', {
        event_type_param: 'admin_dashboard_access',
        details_param: {
          user_id: user.id,
          email: user.email,
          timestamp: new Date().toISOString()
        }
      });

      setIsVerified(true);
      setVerifying(false);
    };

    verifyAdminAccess();
  }, [user, authLoading, roleLoading, toast]);

  // Show loading while checking authentication and roles
  if (authLoading || roleLoading || verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification des autorisations administrateur...</p>
        </div>
      </div>
    );
  }

  // Redirect to home if not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Redirect if email doesn't match or not admin role
  if (!isVerified || user.email !== AUTHORIZED_ADMIN_EMAIL || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
