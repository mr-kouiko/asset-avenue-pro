import { useState } from 'react';
import { Menu, X, Home, ShoppingCart, User, Sparkles, LogOut, Shield, Upload, LayoutDashboard, Package, Search, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

interface MobileMenuProps {
  userRole: string | null;
  onAuthClick: () => void;
}

export const MobileMenu = ({ userRole, onAuthClick }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signOut } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/${language}/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsOpen(false);
    }
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden h-10 w-10 p-0">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full">
          {/* Search */}
          <form onSubmit={handleSearch} className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search.placeholder')}
                className="pl-10"
              />
            </div>
          </form>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="space-y-1 px-2">
              <Link 
                to={`/${language}`} 
                onClick={handleLinkClick}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Home className="h-5 w-5" />
                {t('nav.home') || 'Accueil'}
              </Link>
              
              <Link 
                to={`/${language}/marketplace`} 
                onClick={handleLinkClick}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Package className="h-5 w-5" />
                Marketplace
              </Link>
              
              <Link 
                to="/studio-ai" 
                onClick={handleLinkClick}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Wand2 className="h-5 w-5" />
                Studio AI
              </Link>
              
              <Link 
                to={`/${language}/infinity`} 
                onClick={handleLinkClick}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                <span className="text-lg">∞</span>
                Infinity
              </Link>
            </div>

            <Separator className="my-4" />

            {user ? (
              <div className="space-y-1 px-2">
                <Link 
                  to={`/${language}/cart`} 
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {t('header.cart') || 'Cart'}
                </Link>

                {userRole === 'admin' && (
                  <Link 
                    to="/admin" 
                    onClick={handleLinkClick}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <Shield className="h-5 w-5" />
                    Administration
                  </Link>
                )}

                {(userRole === 'creator' || userRole === 'admin') ? (
                  <>
                    <Link 
                      to={`/${language}/seller-dashboard`} 
                      onClick={handleLinkClick}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      {t('header.seller.dashboard')}
                    </Link>
                    <Link 
                      to={`/${language}/file-upload`} 
                      onClick={handleLinkClick}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <Upload className="h-5 w-5" />
                      {t('header.upload')}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link 
                      to={`/${language}/dashboard`} 
                      onClick={handleLinkClick}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      {t('header.dashboard')}
                    </Link>
                    <Link 
                      to={`/${language}/buyer-dashboard`} 
                      onClick={handleLinkClick}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <Package className="h-5 w-5" />
                      {t('header.purchases')}
                    </Link>
                  </>
                )}

                <Separator className="my-4" />

                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                  {t('header.logout')}
                </button>
              </div>
            ) : (
              <div className="px-2">
                <button
                  onClick={() => {
                    onAuthClick();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <User className="h-5 w-5" />
                  {t('header.login')}
                </button>
              </div>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
};
