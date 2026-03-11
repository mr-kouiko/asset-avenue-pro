import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-muted py-12">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1 flex items-start">
            <Link to="/" className="mr-5 flex-shrink-0">
              <img 
                src="/lovable-uploads/d9197b59-e998-47b4-9d0f-604b4a1002ba.png" 
                alt="VisuStock" 
                className="h-8 w-auto hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Products</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/marketplace" className="text-muted-foreground hover:text-foreground">Browse Content</Link></li>
              <li><Link to="/packages-pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link></li>
              <li><Link to="/infinity" className="text-muted-foreground hover:text-foreground">Infinity</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link></li>
              <li><Link to="/support" className="text-muted-foreground hover:text-foreground">Support</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms & Conditions</Link></li>
              <li><Link to="/licenses" className="text-muted-foreground hover:text-foreground">Licenses</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} VisuStock. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span>|</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link>
            <span>|</span>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
