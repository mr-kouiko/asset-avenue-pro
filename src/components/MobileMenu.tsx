import { useState } from 'react';
import { 
  Menu, Home, ShoppingCart, User, Sparkles, LogOut, Shield, Upload, 
  LayoutDashboard, Package, Search, Wand2, Layers, TrendingUp, Crown, ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  userRole: string | null;
  onAuthClick: () => void;
}

const MenuItem = ({ 
  to, icon: Icon, label, onClick, accent, badge, iconElement 
}: { 
  to?: string; icon?: any; label: string; onClick?: () => void; accent?: boolean; badge?: string; iconElement?: React.ReactNode;
}) => {
  const content = (
    <div className={cn(
      "flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-medium transition-all duration-200",
      accent 
        ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" 
        : "text-foreground hover:bg-accent/10"
    )}>
      <div className={cn(
        "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
        accent ? "bg-primary/15" : "bg-muted"
      )}>
        {iconElement || (Icon && <Icon className="h-5 w-5" />)}
      </div>
      <span className="flex-1">{label}</span>
      {badge && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-0">
          {badge}
        </Badge>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
    </div>
  );

  if (to) {
    return <Link to={to} onClick={onClick}>{content}</Link>;
  }
  return <button onClick={onClick} className="w-full text-left">{content}</button>;
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 pt-4 pb-1.5">
    {children}
  </p>
);

export const MobileMenu = ({ userRole, onAuthClick }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signOut } = useAuth();
  const { language, t } = useLanguage();
  const { getItemCount } = useCart();
  const navigate = useNavigate();

  const isCreator = userRole === 'creator' || userRole === 'admin';
  const isAdmin = userRole === 'admin';
  const cartCount = getItemCount();

  const displayName = user?.user_metadata?.display_name 
    || user?.user_metadata?.full_name 
    || user?.email?.split('@')[0] 
    || 'User';

  const avatarUrl = user?.user_metadata?.avatar_url;

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/${language}/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const close = () => setIsOpen(false);

  const handleSignOut = async () => {
    await signOut();
    close();
  };

  const labels = {
    home: 'Home',
    marketplace: 'Marketplace',
    studioAi: 'Studio AI',
    collections: 'Collections',
    trending: 'Trending',
    creatorTools: 'Creator Tools',
    upload: 'Upload Content',
    sellerDashboard: 'Seller Dashboard',
    account: 'Account',
    cart: 'Cart',
    infinity: 'Infinity',
    myAccount: 'My Account',
    signOut: 'Sign Out',
    signIn: 'Sign In',
    admin: 'Administration',
    explore: 'Explore',
    dashboard: 'Dashboard',
    purchases: 'My Purchases',
    searchPlaceholder: 'Search photos, videos, audio...',
    hello: 'Hello',
    guest: 'Welcome',
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden h-10 w-10 p-0">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-[320px] sm:w-[360px] p-0 border-l-0 shadow-2xl [&>button]:hidden"
      >
        {/* ─── Header / Brand Moment ─── */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
          <div className="relative px-5 pt-6 pb-5">
            {user ? (
              <div className="flex items-center gap-3.5">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{labels.hello},</p>
                  <p className="text-base font-semibold text-foreground truncate">{displayName}</p>
                  {isCreator && (
                    <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      Creator
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{labels.guest}</p>
                  <p className="text-xs text-muted-foreground">VisuStock</p>
                </div>
              </div>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={labels.searchPlaceholder}
                  className="pl-10 h-10 rounded-xl bg-background/80 backdrop-blur-sm border-border/60 shadow-sm focus-visible:ring-primary/30"
                />
              </div>
            </form>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* ─── Navigation ─── */}
        <nav className="flex-1 overflow-y-auto px-3 pb-6" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          
          {/* Section 1 – Explore */}
          <SectionLabel>{labels.explore}</SectionLabel>
          <div className="space-y-0.5">
            <MenuItem to={`/${language}`} icon={Home} label={labels.home} onClick={close} />
            <MenuItem to={`/${language}/marketplace`} icon={Package} label={labels.marketplace} onClick={close} />
            <MenuItem to="/studio-ai" icon={Wand2} label={labels.studioAi} onClick={close} badge="AI" />
            <MenuItem to="/collections" icon={Layers} label={labels.collections} onClick={close} />
            <MenuItem to={`/${language}/marketplace?sort=trending`} icon={TrendingUp} label={labels.trending} onClick={close} />
          </div>

          {/* Section 2 – Creator Tools (if creator) */}
          {user && isCreator && (
            <>
              <SectionLabel>{labels.creatorTools}</SectionLabel>
              <div className="space-y-0.5">
                <MenuItem 
                  to={`/${language}/file-upload`} 
                  icon={Upload} 
                  label={labels.upload} 
                  onClick={close} 
                  accent 
                />
                <MenuItem 
                  to={`/${language}/seller-dashboard`} 
                  icon={LayoutDashboard} 
                  label={labels.sellerDashboard} 
                  onClick={close} 
                />
              </div>
            </>
          )}

          {/* Admin */}
          {user && isAdmin && (
            <>
              <div className="space-y-0.5 mt-1">
                <MenuItem to="/admin" icon={Shield} label={labels.admin} onClick={close} />
              </div>
            </>
          )}

          {/* Section 3 – Account */}
          {user ? (
            <>
              <SectionLabel>{labels.account}</SectionLabel>
              <div className="space-y-0.5">
                <MenuItem 
                  to={`/${language}/cart`} 
                  icon={ShoppingCart} 
                  label={labels.cart} 
                  onClick={close}
                  badge={cartCount > 0 ? String(cartCount) : undefined}
                />
                <MenuItem 
                  to={`/${language}/infinity`} 
                  label={labels.infinity}
                  onClick={close}
                  iconElement={<Crown className="h-5 w-5" />}
                  badge="PRO"
                />
                {!isCreator && (
                  <>
                    <MenuItem to={`/${language}/dashboard`} icon={LayoutDashboard} label={labels.dashboard} onClick={close} />
                    <MenuItem to={`/${language}/buyer-dashboard`} icon={Package} label={labels.purchases} onClick={close} />
                  </>
                )}
              </div>

              {/* Sign Out */}
              <div className="mt-6 px-1">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive/80 transition-colors hover:bg-destructive/5 hover:text-destructive"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/5">
                    <LogOut className="h-5 w-5" />
                  </div>
                  {labels.signOut}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-6 px-1">
              <Button
                onClick={() => { onAuthClick(); close(); }}
                className="w-full h-12 rounded-xl text-sm font-semibold gap-2"
              >
                <User className="h-4 w-4" />
                {labels.signIn}
              </Button>
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};
