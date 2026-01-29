import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  const { user, loading: authLoading, isAdmin, roleLoading } = useAuth();
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
          title: "Access Denied",
          description: "This area is reserved for the exclusive administrator."
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
          title: "Access Denied",
          description: "Administrator role not verified."
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

  // Wait for auth loading and admin verification, but don't show loading UI
  if (authLoading || verifying) {
    return null;
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
