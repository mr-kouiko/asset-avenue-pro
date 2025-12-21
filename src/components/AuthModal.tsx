import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Lock, User, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<"client" | "creator">("client");
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
  
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      return;
    }

    setLoading(true);
    const result = await signIn(formData.email, formData.password);
    if (!result.error) {
      onClose();
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.registerEmail || 
        !formData.registerPassword || !formData.country || !formData.acceptTerms) {
      return;
    }

    if (formData.registerPassword.length < 6) {
      return;
    }

    if (formData.registerPassword !== formData.confirmPassword) {
      return;
    }

    if (userRole === "creator" && !formData.storeName) {
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(formData.registerEmail, formData.registerPassword, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: userRole,
        storeName: formData.storeName,
        country: formData.country
      });
      
      if (!result.error) {
        onClose();
        // Redirect based on role
        if (userRole === "creator") {
          navigate('/seller-dashboard');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Registration exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    if (!result.error) {
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center">
            <img 
              src="/lovable-uploads/d9197b59-e998-47b4-9d0f-604b4a1002ba.png" 
              alt="VisuStock" 
              className="h-8 w-auto"
            />
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0">
                <CardTitle className="text-lg">Sign In</CardTitle>
                <CardDescription>
                  Sign in to your VisuStock account
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-4">
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
                    onClick={handleGoogleSignIn}
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
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0">
                <CardTitle className="text-lg">Create an Account</CardTitle>
                <CardDescription>
                  Join the VisuStock community
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-4">
                {/* Google Sign Up Button */}
                <Button 
                  variant="outline" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  type="button"
                  className="w-full"
                >
                  {loading ? "Signing up..." : "Sign up with Google"}
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
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label>Account Type *</Label>
                    <RadioGroup value={userRole} onValueChange={(value: "client" | "creator") => setUserRole(value)}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value="client" id="client" />
                        <Label htmlFor="client" className="flex items-center gap-2 cursor-pointer flex-1">
                          <User className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Buyer</div>
                            <div className="text-sm text-muted-foreground">Buy and download content</div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value="creator" id="creator" />
                        <Label htmlFor="creator" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Store className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Seller</div>
                            <div className="text-sm text-muted-foreground">Sell your creations</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input 
                        id="firstName" 
                        placeholder="John" 
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
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
                    <Label htmlFor="registerEmail">Email *</Label>
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

                  {userRole === "creator" && (
                    <div className="space-y-2">
                      <Label htmlFor="storeName">Store Name *</Label>
                      <Input
                        id="storeName"
                        placeholder="My Creative Store"
                        value={formData.storeName}
                        onChange={(e) => handleInputChange('storeName', e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">Password (min. 6 characters) *</Label>
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
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
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
                    <Label htmlFor="country">Country *</Label>
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
                      <Link to="/en/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link> *
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
      </DialogContent>
    </Dialog>
  );
};