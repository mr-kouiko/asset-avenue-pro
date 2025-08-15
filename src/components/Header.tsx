import { Search, ShoppingCart, User, Menu, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">AS</span>
          </div>
          <span className="text-xl font-bold">ArabsStock</span>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-lg mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher des photos, vidéos, illustrations..."
              className="pl-10 pr-4"
            />
          </div>
        </div>

        {/* Navigation & Actions */}
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Globe className="h-4 w-4 mr-1" />
                FR
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Français</DropdownMenuItem>
              <DropdownMenuItem>English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Cart */}
          <Button variant="ghost" size="sm" className="relative">
            <ShoppingCart className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
              3
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-1" />
                Compte
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Link to="/auth">Se connecter</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/auth">S'inscrire</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/dashboard">Espace vendeur</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu */}
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};