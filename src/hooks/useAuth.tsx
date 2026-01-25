import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: (intendedRole?: 'client' | 'creator') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  getUserRole: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Clean up auth state utility
export const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let initialSessionChecked = false;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        // Only update state if we've already checked the initial session
        // OR if this is a definitive auth event (not just TOKEN_REFRESHED on mount)
        if (initialSessionChecked || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log('Auth state change:', event, session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    // Check for existing session - this is the source of truth on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      console.log('Initial session check:', session?.user?.email || 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      initialSessionChecked = true;
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('SignUp called with:', { email, userData: { ...userData, password: '[HIDDEN]' } });
    
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Sign out during signup failed (expected):', err);
      }

      // Check if user already exists first
      const { data: existingUser } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (existingUser?.user) {
        toast({
          title: "Existing account found!",
          description: "You are now signed in."
        });
        return { error: null };
      }

      const redirectUrl = `${window.location.origin}/`;
      console.log('Using redirect URL:', redirectUrl);
      
      const signUpData = {
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role,
            store_name: userData.storeName,
            country: userData.country
          }
        }
      };
      
      console.log('Calling supabase.auth.signUp with:', { 
        ...signUpData, 
        password: '[HIDDEN]',
        options: { ...signUpData.options, emailRedirectTo: redirectUrl }
      });
      
      const { data, error } = await supabase.auth.signUp(signUpData);
      
      console.log('SignUp response:', { data: data?.user ? 'User created' : 'No user', error });

      if (error) {
        console.error('SignUp error details:', error);
        
        let errorMessage = "An error occurred during sign up.";
        
        if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
          // Try to sign in instead
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!signInError) {
            toast({
              title: "Sign in successful!",
              description: "Your account already exists. You are now signed in."
            });
            return { error: null };
          } else {
            errorMessage = "This account already exists. Check your password or use 'Forgot password'.";
          }
        } else if (error.message.includes('Password')) {
          errorMessage = "Password must be at least 6 characters.";
        } else if (error.message.includes('Email')) {
          errorMessage = "Invalid email address.";
        } else if (error.message.includes('role_audit') || error.message.includes('changed_by')) {
          errorMessage = "Configuration error. Please try again.";
        }
        
        toast({
          variant: "destructive",
          title: "Sign up error",
          description: errorMessage
        });
        return { error };
      }

      console.log('SignUp successful');
      
      toast({
        title: userData.role === 'creator' ? "Seller request sent!" : "Sign up successful!",
        description: userData.role === 'creator' 
          ? "Your seller account has been created. You can now sign in and access your dashboard."
          : "Welcome to VisuStock! You can now sign in and explore our marketplace."
      });

      return { error: null };
    } catch (error: any) {
      console.error('SignUp exception:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again."
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Sign in error",
          description: error.message === 'Invalid login credentials'
            ? "Incorrect email or password."
            : "An error occurred during sign in."
        });
        return { error };
      }

      if (data.user) {
        toast({
          title: "Sign in successful!",
          description: "Welcome to VisuStock."
        });
        // Force page reload for clean state
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }

      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred."
      });
      return { error };
    }
  };

  const signInWithGoogle = async (intendedRole?: 'client' | 'creator') => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      // Store intended role before OAuth redirect so we can use it after callback
      if (intendedRole) {
        localStorage.setItem('visustock_intended_role', intendedRole);
      }

      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      });

      if (error) {
        localStorage.removeItem('visustock_intended_role');
        toast({
          variant: "destructive",
          title: "Google Sign-In Error",
          description: "Unable to sign in with Google."
        });
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      localStorage.removeItem('visustock_intended_role');
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred."
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      toast({
        title: "Signed out successfully",
        description: "See you soon on VisuStock!"
      });
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred during sign out."
      });
    }
  };

  const getUserRole = async (): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      
      return data?.role || null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    getUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};