import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from URL hash (Supabase OAuth callback)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          toast.error("Authentication failed. Please try again.");
          setTimeout(() => navigate('/auth'), 2000);
          return;
        }

        if (!session) {
          // No session yet, wait for it
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
              if (event === 'SIGNED_IN' && newSession) {
                await handlePostAuth(newSession.user.id);
                subscription.unsubscribe();
              }
            }
          );
          return;
        }

        await handlePostAuth(session.user.id);
      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('error');
        toast.error("An error occurred during sign-in.");
        setTimeout(() => navigate('/auth'), 2000);
      }
    };

    const handlePostAuth = async (userId: string) => {
      // Check if there was an intended role stored before OAuth
      const intendedRole = localStorage.getItem('visustock_intended_role');
      localStorage.removeItem('visustock_intended_role');

      console.log('OAuth callback - intended role:', intendedRole);

      if (intendedRole === 'creator') {
        // User signed up with Google intending to be a seller
        // Check if they're already a creator
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (roleData?.role === 'creator' || roleData?.role === 'admin') {
          // Already a seller/admin, go to dashboard
          setStatus('success');
          toast.success("Welcome back! Redirecting to your dashboard...");
          setTimeout(() => navigate('/seller-dashboard'), 1000);
        } else {
          // Not a seller yet, redirect to become-seller to complete payment
          setStatus('success');
          toast.success("Account created! Complete your seller registration.");
          setTimeout(() => navigate('/become-seller'), 1000);
        }
      } else {
        // Regular buyer flow
        setStatus('success');
        toast.success("Welcome to VisuStock!");
        setTimeout(() => navigate('/'), 1000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-glow/5 flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Completing sign-in...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-muted-foreground">Success! Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-destructive">Authentication failed. Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
