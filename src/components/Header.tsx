import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, User, LogOut, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { AuthModal } from "@/components/AuthModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { MobileMenu } from "@/components/MobileMenu";
import { SearchWithSuggestions } from "@/components/SearchWithSuggestions";
import { useMarketplace } from "@/hooks/useMarketplace";
import { NotificationBell } from "@/components/NotificationBell";

export const Header = () => {
  const { user, signOut, loading, role } = useAuth();
  const { getItemCount } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const navigate = useNavigate();
  const { content: marketplaceContent } = useMarketplace();

  // Convert to searchable format for suggestions - use safe access
  const searchableItems = useMemo(() => 
    (marketplaceContent || []).map(item => ({
      id: item.id,
      title: item.title || '',
      tags: item.tags || [],
      type: item.type || ''
    })),
    [marketplaceContent]
  );

  // Use role directly from auth context - no need for separate fetch
  const userRole = role;

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
        <Link to={`/${language}`} className="flex items-center shrink-0">
          <img 
            src="/lovable-uploads/d9197b59-e998-47b4-9d0f-604b4a1002ba.png" 
            alt="VisuStock" 
            className="h-8 md:h-10 w-auto max-w-[120px] md:max-w-none object-contain"
          />
        </Link>

        {/* Search Bar with Suggestions - Hidden on mobile */}
        <div className="hidden md:flex flex-1 max-w-lg mx-6">
          <SearchWithSuggestions
            items={searchableItems}
            placeholder={t('search.placeholder')}
            onSearch={() => {}}
            className="w-full"
          />
        </div>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Studio AI Link - Desktop only */}
          <Button variant="outline" size="sm" asChild className="hidden lg:flex">
            <Link to="/studio-ai" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Studio AI
            </Link>
          </Button>

          {/* Infinity Link - Desktop only */}
          <Button variant="default" size="sm" asChild className="hidden lg:flex">
            <Link to={`/${language}/infinity`}>
              Infinity
            </Link>
          </Button>

          {/* Notifications - Show for logged in users */}
          {user && (
            <div className="hidden sm:flex">
              <NotificationBell />
            </div>
          )}

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