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
  signInWithGoogle: () => Promise<{ error: any }>;
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
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
        
        let errorMessage = "Une erreur est survenue lors de l'inscription.";
        
        if (error.message.includes('User already registered')) {
          errorMessage = "Cet email est déjà utilisé. Essayez de vous connecter.";
        } else if (error.message.includes('Password')) {
          errorMessage = "Le mot de passe doit contenir au moins 6 caractères.";
        } else if (error.message.includes('Email')) {
          errorMessage = "L'adresse email n'est pas valide.";
        } else if (error.message.includes('role_audit') || error.message.includes('changed_by')) {
          errorMessage = "Erreur de configuration. Veuillez réessayer.";
        }
        
        toast({
          variant: "destructive",
          title: "Erreur d'inscription",
          description: errorMessage
        });
        return { error };
      }

      console.log('SignUp successful');
      
      // Different success messages based on user type
      if (userData.role === 'creator') {
        toast({
          title: "Demande de vendeur envoyée !",
          description: "Un email de confirmation a été envoyé. Après validation, vous pourrez accéder à votre dashboard vendeur."
        });
      } else {
        toast({
          title: "Inscription réussie !",
          description: "Un email de confirmation a été envoyé. Vérifiez votre boîte de réception."
        });
      }

      return { error: null };
    } catch (error: any) {
      console.error('SignUp exception:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur inattendue est survenue. Veuillez réessayer."
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
          title: "Erreur de connexion",
          description: error.message === 'Invalid login credentials'
            ? "Email ou mot de passe incorrect."
            : "Une erreur est survenue lors de la connexion."
        });
        return { error };
      }

      if (data.user) {
        toast({
          title: "Connexion réussie !",
          description: "Bienvenue sur VisuStock."
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
        title: "Erreur",
        description: "Une erreur inattendue est survenue."
      });
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur de connexion Google",
          description: "Impossible de se connecter avec Google."
        });
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur inattendue est survenue."
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
        title: "Déconnexion réussie",
        description: "À bientôt sur VisuStock !"
      });
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion."
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