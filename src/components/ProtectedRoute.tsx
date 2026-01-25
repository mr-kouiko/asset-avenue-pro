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
  fallbackMessage = "Vous n'avez pas les permissions nécessaires pour accéder à cette page."
}: ProtectedRouteProps) {
  const { user, loading, role, roleLoading } = useAuth();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <div className="animate-spin h-12 w-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <AlertCircle className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-4">Connexion requise</h1>
          <p className="text-muted-foreground mb-8">
            Vous devez être connecté pour accéder à cette page.
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">Se connecter</Link>
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
          <h1 className="text-3xl font-bold mb-4">Accès refusé</h1>
          <p className="text-muted-foreground mb-8">
            {fallbackMessage}
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Rôle actuel: {role || 'Non défini'} | Rôles requis: {allowedRoles.join(', ')}
          </p>
          <Button size="lg" asChild>
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}