import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Lock, User, Store, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface AuthProps {
  userType?: "client" | "seller";
}

const Auth = ({ userType: defaultUserType }: AuthProps = {}) => {
  const [userType, setUserType] = useState<"client" | "seller">(defaultUserType || "client");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Login form
    email: "",
    password: "",
    rememberMe: false,
    // Register form
    firstName: "",
    lastName: "",
    registerEmail: "",
    registerPassword: "",
    confirmPassword: "",
    storeName: "",
    country: "",
    acceptTerms: false
  });
  
  const { user, signUp, signIn, signInWithGoogle, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      // Redirect based on user type for seller registration
      if (defaultUserType === "seller") {
        navigate('/dashboard'); // Will redirect to appropriate dashboard via DashboardRouter
      } else {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate, defaultUserType]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      return;
    }

    setLoading(true);
    await signIn(formData.email, formData.password);
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Detailed validation with specific error messages
    if (!formData.firstName) {
      console.error('Registration error: First name is required');
      return;
    }
    
    if (!formData.lastName) {
      console.error('Registration error: Last name is required');
      return;
    }
    
    if (!formData.registerEmail) {
      console.error('Registration error: Email is required');
      return;
    }
    
    if (!formData.registerPassword) {
      console.error('Registration error: Password is required');
      return;
    }
    
    if (formData.registerPassword.length < 6) {
      console.error('Registration error: Password must be at least 6 characters');
      return;
    }
    
    if (!formData.country) {
      console.error('Registration error: Country is required');
      return;
    }
    
    if (!formData.acceptTerms) {
      console.error('Registration error: Terms must be accepted');
      return;
    }

    if (formData.registerPassword !== formData.confirmPassword) {
      console.error('Registration error: Passwords do not match');
      return;
    }

    if (userType === "seller" && !formData.storeName) {
      console.error('Registration error: Store name is required for sellers');
      return;
    }

    console.log('Starting registration process for:', {
      email: formData.registerEmail,
      userType,
      role: userType === "seller" ? "creator" : "client"
    });

    setLoading(true);
    try {
      const result = await signUp(formData.registerEmail, formData.registerPassword, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: userType === "seller" ? "creator" : "client",
        storeName: formData.storeName,
        country: formData.country
      });
      
      if (result.error) {
        console.error('Registration failed:', result.error);
      } else {
        console.log('Registration successful');
      }
    } catch (error) {
      console.error('Registration exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-glow/5 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-glow/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <div className="mb-6">
          <Link to="/" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Link>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <img 
            src="/lovable-uploads/d9197b59-e998-47b4-9d0f-604b4a1002ba.png" 
            alt="VisuStock" 
            className="h-12 w-auto mb-2"
          />
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Se connecter</TabsTrigger>
            <TabsTrigger value="register">S'inscrire</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Connexion</CardTitle>
                <CardDescription>
                  Connectez-vous à votre compte VisuStock
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember" 
                        checked={formData.rememberMe}
                        onCheckedChange={(checked) => handleInputChange('rememberMe', checked as boolean)}
                      />
                      <Label htmlFor="remember" className="text-sm">
                        Se souvenir de moi
                      </Label>
                    </div>
                    <Button variant="link" className="p-0 text-sm">
                      Mot de passe oublié ?
                    </Button>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou continuer avec
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    type="button"
                  >
                    {loading ? "Connexion..." : "Se connecter avec Google"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>{defaultUserType === "seller" ? "Devenir vendeur" : "Créer un compte"}</CardTitle>
                <CardDescription>
                  {defaultUserType === "seller" 
                    ? "Rejoignez notre communauté de créateurs et vendez vos œuvres"
                    : "Rejoignez la communauté VisuStock"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* User Type Selection - Only show if not predefined */}
                  {!defaultUserType && (
                    <div className="space-y-2">
                      <Label>Type de compte</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={userType === "client" ? "default" : "outline"}
                          onClick={() => setUserType("client")}
                          className="flex items-center justify-center gap-2"
                        >
                          <User className="h-4 w-4" />
                          Client
                        </Button>
                        <Button
                          type="button"
                          variant={userType === "seller" ? "default" : "outline"}
                          onClick={() => setUserType("seller")}
                          className="flex items-center justify-center gap-2"
                        >
                          <Store className="h-4 w-4" />
                          Vendeur
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Show selected type for predefined flows */}
                  {defaultUserType && (
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                        {defaultUserType === "seller" ? (
                          <>
                            <Store className="h-5 w-5" />
                            Inscription vendeur
                          </>
                        ) : (
                          <>
                            <User className="h-5 w-5" />
                            Inscription client
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input 
                        id="firstName" 
                        placeholder="John" 
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Doe" 
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerEmail">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="registerEmail"
                        type="email"
                        placeholder="votre@email.com"
                        className="pl-10"
                        value={formData.registerEmail}
                        onChange={(e) => handleInputChange('registerEmail', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {userType === "seller" && (
                    <div className="space-y-2">
                      <Label htmlFor="storeName">Nom de votre boutique</Label>
                      <Input
                        id="storeName"
                        placeholder="Ma boutique créative"
                        value={formData.storeName}
                        onChange={(e) => handleInputChange('storeName', e.target.value)}
                        required={userType === "seller"}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">Mot de passe (min. 6 caractères)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="registerPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={formData.registerPassword}
                        onChange={(e) => handleInputChange('registerPassword', e.target.value)}
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        required
                      />
                    </div>
                    {formData.confirmPassword && formData.registerPassword !== formData.confirmPassword && (
                      <p className="text-sm text-destructive">Les mots de passe ne correspondent pas</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Select 
                      value={formData.country} 
                      onValueChange={(value) => handleInputChange('country', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez votre pays" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">France</SelectItem>
                        <SelectItem value="ma">Maroc</SelectItem>
                        <SelectItem value="dz">Algérie</SelectItem>
                        <SelectItem value="tn">Tunisie</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={formData.acceptTerms}
                      onCheckedChange={(checked) => handleInputChange('acceptTerms', checked as boolean)}
                      required
                    />
                    <Label htmlFor="terms" className="text-sm">
                      J'accepte les{" "}
                      <Button variant="link" className="p-0 h-auto text-sm">
                        conditions d'utilisation
                      </Button>{" "}
                      et la{" "}
                      <Button variant="link" className="p-0 h-auto text-sm">
                        politique de confidentialité
                      </Button>
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg" 
                    disabled={loading || formData.registerPassword !== formData.confirmPassword}
                  >
                    {loading 
                      ? "Création en cours..." 
                      : defaultUserType === "seller" 
                        ? "Devenir vendeur VisuStock" 
                        : "Créer mon compte"
                    }
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          En créant un compte, vous acceptez nos conditions d'utilisation
          <br />
          {defaultUserType === "seller" ? (
            <Link to="/auth" className="text-primary hover:underline mt-2 inline-block">
              Vous êtes client ? Inscrivez-vous ici
            </Link>
          ) : defaultUserType === "client" ? (
            <Link to="/auth/seller" className="text-primary hover:underline mt-2 inline-block">
              Vous voulez vendre ? Devenez vendeur
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Auth;