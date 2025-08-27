import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { CartProvider } from "./hooks/useCart";
import { SearchProvider } from "./hooks/useSearch";
import { LanguageProvider } from "./contexts/LanguageContext";
import { LanguageRedirect } from "./components/LanguageRedirect";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import DashboardRouter from "./pages/DashboardRouter";
import SellerDashboard from "./pages/SellerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import Portfolio from "./pages/Portfolio";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import FileUpload from "./pages/FileUpload";
import ProductManagement from "./pages/ProductManagement";
import Support from "./pages/Support";
import Contact from "./pages/Contact";
import Licenses from "./pages/Licenses";
import Terms from "./pages/Terms";
import CookiePolicy from "./pages/CookiePolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import LicenseAgreement from "./pages/LicenseAgreement";
import Infinity from "./pages/Infinity";
import PackagesPricing from "./pages/PackagesPricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import TestAccounts from "./pages/TestAccounts";
import AdminDashboard from "./pages/AdminDashboard";
import { CreateTestAccounts } from "./pages/CreateTestAccounts";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import IndexEN from "./pages/en/IndexEN";
import AboutEN from "./pages/en/AboutEN";
import ContactEN from "./pages/en/ContactEN";
import TermsEN from "./pages/en/TermsEN";
import CookiePolicyEN from "./pages/en/CookiePolicyEN";
import PrivacyPolicyEN from "./pages/en/PrivacyPolicyEN";
import LicenseAgreementEN from "./pages/en/LicenseAgreementEN";
import InfinityEN from "./pages/en/InfinityEN";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <LanguageProvider>
              <SearchProvider>
                <LanguageRedirect />
                <Routes>
                  {/* Root Route */}
                  <Route path="/" element={<Index />} />
                  
                  {/* French Routes */}
                  <Route path="/fr" element={<Index />} />
                  <Route path="/fr/marketplace" element={<Marketplace />} />
                  <Route path="/fr/product/:id" element={<ProductDetail />} />
                  <Route path="/fr/auth" element={<Auth />} />
                  <Route path="/fr/auth/seller" element={<Auth userType="seller" />} />
                  <Route path="/fr/dashboard" element={<DashboardRouter />} />
                  <Route path="/fr/seller-dashboard" element={<SellerDashboard />} />
                  <Route path="/fr/buyer-dashboard" element={<BuyerDashboard />} />
                  <Route path="/fr/portfolio" element={<Portfolio />} />
                  <Route path="/fr/cart" element={<Cart />} />
                  <Route path="/fr/checkout" element={<Checkout />} />
                  <Route path="/fr/file-upload" element={<FileUpload />} />
                  <Route path="/fr/product-management" element={<ProductManagement />} />
                  <Route path="/fr/support" element={<Support />} />
                  <Route path="/fr/contact" element={<Contact />} />
                  <Route path="/fr/licenses" element={<Licenses />} />
                  <Route path="/fr/terms" element={<Terms />} />
                  <Route path="/fr/cookie-policy" element={<CookiePolicy />} />
                  <Route path="/fr/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/fr/license-agreement" element={<LicenseAgreement />} />
                  <Route path="/fr/infinity" element={<Infinity />} />
                  <Route path="/fr/packages-pricing" element={<PackagesPricing />} />
                  <Route path="/fr/about" element={<About />} />
                  <Route path="/fr/admin" element={
                    <ProtectedRoute allowedRoles={['admin']} fallbackMessage="Seuls les administrateurs peuvent accéder à cette page.">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  
                  {/* English Routes */}
                  <Route path="/en" element={<IndexEN />} />
                  <Route path="/en/marketplace" element={<Marketplace />} />
                  <Route path="/en/product/:id" element={<ProductDetail />} />
                  <Route path="/en/auth" element={<Auth />} />
                  <Route path="/en/auth/seller" element={<Auth userType="seller" />} />
                  <Route path="/en/dashboard" element={<DashboardRouter />} />
                  <Route path="/en/seller-dashboard" element={<SellerDashboard />} />
                  <Route path="/en/buyer-dashboard" element={<BuyerDashboard />} />
                  <Route path="/en/portfolio" element={<Portfolio />} />
                  <Route path="/en/cart" element={<Cart />} />
                  <Route path="/en/checkout" element={<Checkout />} />
                  <Route path="/en/file-upload" element={<FileUpload />} />
                  <Route path="/en/product-management" element={<ProductManagement />} />
                  <Route path="/en/support" element={<Support />} />
                  <Route path="/en/contact" element={<ContactEN />} />
                  <Route path="/en/licenses" element={<Licenses />} />
                  <Route path="/en/terms" element={<TermsEN />} />
                  <Route path="/en/cookie-policy" element={<CookiePolicyEN />} />
                  <Route path="/en/privacy-policy" element={<PrivacyPolicyEN />} />
                  <Route path="/en/license-agreement" element={<LicenseAgreementEN />} />
                  <Route path="/en/infinity" element={<InfinityEN />} />
                  <Route path="/en/packages-pricing" element={<PackagesPricing />} />
                  <Route path="/en/about" element={<AboutEN />} />
                  <Route path="/en/admin" element={
                    <ProtectedRoute allowedRoles={['admin']} fallbackMessage="Only administrators can access this page.">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  
                  {/* Legacy redirects - any routes without language prefix redirect to FR */}
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/seller" element={<Auth userType="seller" />} />
                  <Route path="/dashboard" element={<DashboardRouter />} />
                  <Route path="/seller-dashboard" element={<SellerDashboard />} />
                  <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                  <Route path="/file-upload" element={<FileUpload />} />
                  <Route path="/product-management" element={<ProductManagement />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/licenses" element={<Licenses />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/cookie-policy" element={<CookiePolicy />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/license-agreement" element={<LicenseAgreement />} />
                  <Route path="/infinity" element={<Infinity />} />
                  <Route path="/packages-pricing" element={<PackagesPricing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/test-accounts" element={<TestAccounts />} />
                  
                  {/* Admin Routes - Sécurisées */}
                  <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']} fallbackMessage="Seuls les administrateurs peuvent accéder à cette page.">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  
                  {/* Test Accounts Creation - Admin only */}
                  <Route path="/create-test-accounts" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <CreateTestAccounts />
                    </ProtectedRoute>
                  } />
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SearchProvider>
            </LanguageProvider>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
