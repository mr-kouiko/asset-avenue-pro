import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Lock, User, Store, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

interface AuthProps {
  userType?: "client" | "seller";
}

const Auth = ({ userType: defaultUserType }: AuthProps = {}) => {
  useSEO({ title: "Sign In", description: "Sign in or create your VisuStock account.", noindex: true });
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
  const [searchParams] = useSearchParams();

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      // Check for redirect parameter
      const redirectPath = searchParams.get('redirect');
      
      if (redirectPath) {
        navigate(redirectPath);
      } else if (defaultUserType === "seller") {
        navigate('/dashboard'); // Will redirect to appropriate dashboard via DashboardRouter
      } else {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate, defaultUserType, searchParams]);

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
        
        // Send welcome email for buyer registrations (seller emails handled by register-free-seller)
        if (userType === "client") {
          try {
            const displayName = `${formData.firstName} ${formData.lastName}`.trim();
            await supabase.functions.invoke("send-vendor-emails", {
              body: {
                userId: "new-user",
                email: formData.registerEmail,
                displayName,
                emailType: "welcome",
              },
            });
            console.log("Buyer welcome email sent");
          } catch (emailErr) {
            console.warn("Failed to send welcome email (non-blocking):", emailErr);
          }
        }
      }
    } catch (error) {
      console.error('Registration exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (role?: 'client' | 'creator') => {
    setLoading(true);
    // Pass the intended role based on context (login = undefined, signup = userType)
    const intendedRole = role || (userType === "seller" ? 'creator' : 'client');
    await signInWithGoogle(intendedRole);
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
            Back to home
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
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                  Sign in to your VisuStock account
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
                        placeholder="your@email.com"
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
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
                        Remember me
                      </Label>
                    </div>
                    <Button variant="link" className="p-0 text-sm">
                      Forgot password?
                    </Button>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => handleGoogleSignIn(undefined)}
                    disabled={loading}
                    type="button"
                  >
                    {loading ? "Signing in..." : "Sign in with Google"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>{defaultUserType === "seller" ? "Become a Seller" : "Create an Account"}</CardTitle>
                <CardDescription>
                  {defaultUserType === "seller" 
                    ? "Join our community of creators and sell your work"
                    : "Join the VisuStock community"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Google Sign Up Button */}
                <Button 
                  variant="outline" 
                  onClick={() => handleGoogleSignIn(userType === "seller" ? 'creator' : 'client')}
                  disabled={loading}
                  type="button"
                  className="w-full"
                >
                  {loading ? "Signing up..." : `Sign up with Google as ${userType === "seller" ? "Seller" : "Buyer"}`}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or register with email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* User Type Selection - Only show if not predefined */}
                  {!defaultUserType && (
                    <div className="space-y-2">
                      <Label>Account Type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={userType === "client" ? "default" : "outline"}
                          onClick={() => setUserType("client")}
                          className="flex items-center justify-center gap-2"
                        >
                          <User className="h-4 w-4" />
                          Buyer
                        </Button>
                        <Button
                          type="button"
                          variant={userType === "seller" ? "default" : "outline"}
                          onClick={() => setUserType("seller")}
                          className="flex items-center justify-center gap-2"
                        >
                          <Store className="h-4 w-4" />
                          Seller
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
                            Seller Registration
                          </>
                        ) : (
                          <>
                            <User className="h-5 w-5" />
                            Buyer Registration
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        placeholder="John" 
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
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
                        placeholder="your@email.com"
                        className="pl-10"
                        value={formData.registerEmail}
                        onChange={(e) => handleInputChange('registerEmail', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {userType === "seller" && (
                    <div className="space-y-2">
                      <Label htmlFor="storeName">Store Name</Label>
                      <Input
                        id="storeName"
                        placeholder="My Creative Store"
                        value={formData.storeName}
                        onChange={(e) => handleInputChange('storeName', e.target.value)}
                        required={userType === "seller"}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">Password (min. 6 characters)</Label>
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
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                      <p className="text-sm text-destructive">Passwords do not match</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select 
                      value={formData.country} 
                      onValueChange={(value) => handleInputChange('country', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="ca">Canada</SelectItem>
                        <SelectItem value="au">Australia</SelectItem>
                        <SelectItem value="de">Germany</SelectItem>
                        <SelectItem value="fr">France</SelectItem>
                        <SelectItem value="es">Spain</SelectItem>
                        <SelectItem value="it">Italy</SelectItem>
                        <SelectItem value="ma">Morocco</SelectItem>
                        <SelectItem value="dz">Algeria</SelectItem>
                        <SelectItem value="tn">Tunisia</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
                      I accept the <Link to="/en/terms" className="text-primary hover:underline">Terms of Service</Link> and{" "}
                      <Link to="/en/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;