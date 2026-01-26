import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  roleLoading: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  isClient: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: (intendedRole?: 'client' | 'creator') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  getUserRole: () => Promise<string | null>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Key for cross-tab role synchronization
const ROLE_STORAGE_KEY = 'visustock_user_role';
const ROLE_TIMESTAMP_KEY = 'visustock_role_timestamp';

// Clean up auth state utility
export const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  // Also clear role cache on cleanup
  localStorage.removeItem(ROLE_STORAGE_KEY);
  localStorage.removeItem(ROLE_TIMESTAMP_KEY);
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
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const { toast } = useToast();

  // Fetch role from database
  const fetchRole = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      
      const fetchedRole = data?.role || null;
      
      // Cache role in localStorage for cross-tab sync
      if (fetchedRole) {
        localStorage.setItem(ROLE_STORAGE_KEY, fetchedRole);
        localStorage.setItem(ROLE_TIMESTAMP_KEY, Date.now().toString());
      } else {
        localStorage.removeItem(ROLE_STORAGE_KEY);
        localStorage.removeItem(ROLE_TIMESTAMP_KEY);
      }
      
      return fetchedRole;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }, []);

  // Load cached role from localStorage (for new tabs)
  const loadCachedRole = useCallback((): string | null => {
    const cachedRole = localStorage.getItem(ROLE_STORAGE_KEY);
    const timestamp = localStorage.getItem(ROLE_TIMESTAMP_KEY);
    
    // Cache valid for 5 minutes
    if (cachedRole && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < 5 * 60 * 1000) {
        return cachedRole;
      }
    }
    return null;
  }, []);

  // Refresh role from database
  const refreshRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setRoleLoading(false);
      return;
    }
    
    setRoleLoading(true);
    const newRole = await fetchRole(user.id);
    setRole(newRole);
    setRoleLoading(false);
  }, [user, fetchRole]);

  // Handle user/session changes - fetch role
  useEffect(() => {
    if (user) {
      // First, try to load from cache for instant UI
      const cachedRole = loadCachedRole();
      if (cachedRole) {
        setRole(cachedRole);
        setRoleLoading(false);
        // Still refresh from DB in background to ensure freshness
        fetchRole(user.id).then((freshRole) => {
          if (freshRole !== cachedRole) {
            setRole(freshRole);
          }
        });
      } else {
        // No cache, fetch from DB
        setRoleLoading(true);
        fetchRole(user.id).then((fetchedRole) => {
          setRole(fetchedRole);
          setRoleLoading(false);
        });
      }
    } else {
      setRole(null);
      setRoleLoading(false);
      localStorage.removeItem(ROLE_STORAGE_KEY);
      localStorage.removeItem(ROLE_TIMESTAMP_KEY);
    }
  }, [user, fetchRole, loadCachedRole]);

  // Cross-tab synchronization via storage event
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ROLE_STORAGE_KEY) {
        const newRole = event.newValue;
        console.log('Role synced from another tab:', newRole);
        setRole(newRole);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let initialSessionChecked = false;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        // CRITICAL: Ignore TOKEN_REFRESHED events to prevent data loss during uploads
        // Token refresh happens in the background and shouldn't trigger re-renders
        // which would reset component state (like upload progress)
        if (event === 'TOKEN_REFRESHED') {
          console.log('Auth token refreshed silently (no re-render)');
          // Only update session reference silently without triggering state update
          // The session is already updated internally by Supabase client
          return;
        }
        
        // Only update state if we've already checked the initial session
        // OR if this is a definitive auth event (SIGNED_IN or SIGNED_OUT)
        if (initialSessionChecked || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log('Auth state change:', event, session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          
          // Clear role on sign out
          if (event === 'SIGNED_OUT') {
            setRole(null);
            setRoleLoading(false);
            localStorage.removeItem(ROLE_STORAGE_KEY);
            localStorage.removeItem(ROLE_TIMESTAMP_KEY);
          }
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

  // Legacy method for backward compatibility
  const getUserRole = async (): Promise<string | null> => {
    if (!user) return null;
    
    // Return cached role if available
    if (role) return role;
    
    // Otherwise fetch fresh
    return await fetchRole(user.id);
  };

  // Computed role flags
  const isAdmin = role === 'admin';
  const isCreator = role === 'creator';
  const isClient = role === 'client';

  const value = {
    user,
    session,
    loading,
    role,
    roleLoading,
    isAdmin,
    isCreator,
    isClient,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    getUserRole,
    refreshRole,
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
