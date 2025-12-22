import { useState, useEffect } from 'react';
import { Search, ShoppingCart, User, LogOut, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { AuthModal } from "@/components/AuthModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { MobileMenu } from "@/components/MobileMenu";

export const Header = () => {
  const { user, signOut, loading, getUserRole } = useAuth();
  const { getItemCount } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      if (user) {
        const role = await getUserRole();
        setUserRole(role);
      } else {
        setUserRole(null);
      }
    };
    fetchRole();
  }, [user, getUserRole]);

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 md:h-16 items-center justify-between px-4">
        <Link to={`/${language}`} className="flex items-center space-x-2">
          <img 
            src="/lovable-uploads/d9197b59-e998-47b4-9d0f-604b4a1002ba.png"
            alt="VisuStock" 
            className="h-8 md:h-10 w-auto"
          />
        </Link>
          <div className="animate-pulse bg-muted rounded h-8 w-32"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 md:h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to={`/${language}`} className="flex items-center space-x-2 shrink-0">
          <img 
            src="/lovable-uploads/d9197b59-e998-47b4-9d0f-604b4a1002ba.png" 
            alt="VisuStock" 
            className="h-8 md:h-10 w-auto"
          />
        </Link>

        {/* Search Bar - Hidden on mobile */}
        <div className="hidden md:flex flex-1 max-w-lg mx-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const query = formData.get('search') as string;
            if (query?.trim()) {
              window.location.href = `/${language}/marketplace?search=${encodeURIComponent(query.trim())}`;
            }
          }} className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder={t('search.placeholder')}
                className="pl-10 pr-4"
              />
            </div>
          </form>
        </div>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* AI Image Generator Link - Desktop only */}
          <Button variant="outline" size="sm" asChild className="hidden lg:flex">
            <Link to={`/${language}/ai-image-generator`} className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              IA Image
            </Link>
          </Button>

          {/* Infinity Link - Desktop only */}
          <Button variant="default" size="sm" asChild className="hidden lg:flex">
            <Link to={`/${language}/infinity`}>
              Infinity
            </Link>
          </Button>

          {/* Cart - Show on tablet+ for logged in users */}
          {user && (
            <Button variant="ghost" size="sm" className="relative hidden sm:flex h-10 w-10 p-0" asChild>
              <Link to={`/${language}/cart`}>
                <ShoppingCart className="h-5 w-5" />
                {getItemCount() > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                    {getItemCount()}
                  </Badge>
                )}
              </Link>
            </Button>
          )}

          {/* User Menu - Desktop only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <User className="h-4 w-4 mr-1" />
                {user ? t('header.account') : t('header.account.guest')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {user ? (
                <>
                  {userRole === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        Administration
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {userRole === 'creator' || userRole === 'admin' ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={`/${language}/seller-dashboard`}>{t('header.seller.dashboard')}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/${language}/file-upload`}>{t('header.upload')}</Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={`/${language}/dashboard`}>{t('header.dashboard')}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/${language}/buyer-dashboard`}>{t('header.purchases')}</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={signOut}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('header.logout')}
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => setIsAuthModalOpen(true)}>
                    {t('header.login')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu */}
          <MobileMenu 
            userRole={userRole} 
            onAuthClick={() => setIsAuthModalOpen(true)} 
          />
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </header>
  );
};