import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { CartProvider } from "./hooks/useCart";
import { SearchProvider } from "./hooks/useSearch";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import { LanguageRedirect } from "./components/LanguageRedirect";
import { ProtectedRoute } from "./components/ProtectedRoute";
import IndexEN from "./pages/en/IndexEN";
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
import ContactEN from "./pages/en/ContactEN";
import Licenses from "./pages/Licenses";
import TermsEN from "./pages/en/TermsEN";
import CookiePolicyEN from "./pages/en/CookiePolicyEN";
import PrivacyPolicyEN from "./pages/en/PrivacyPolicyEN";
import LicenseAgreementEN from "./pages/en/LicenseAgreementEN";
import InfinityEN from "./pages/en/InfinityEN";
import PackagesPricing from "./pages/PackagesPricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import TestAccounts from "./pages/TestAccounts";
import AdminDashboard from "./pages/AdminDashboard";
import { CreateTestAccounts } from "./pages/CreateTestAccounts";
import NotFound from "./pages/NotFound";
import AboutEN from "./pages/en/AboutEN";
import AIImageGenerator from "./pages/AIImageGenerator";
import BuyCredits from "./pages/BuyCredits";
import BecomeSeller from "./pages/BecomeSeller";
import SellerRegistrationSuccess from "./pages/SellerRegistrationSuccess";
import SellerRegistrationCancelled from "./pages/SellerRegistrationCancelled";
import AuthCallback from "./pages/AuthCallback";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <AudioPlayerProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <LanguageProvider>
                <SearchProvider>
                  <LanguageRedirect />
                  <Routes>
                  {/* English Routes - Now at root */}
                  <Route path="/" element={<IndexEN />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/products/:slug" element={<ProductDetail />} />
                  {/* Legacy route for backward compatibility with UUID-based URLs */}
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/seller" element={<Auth userType="seller" />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
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
                  <Route path="/contact" element={<ContactEN />} />
                  <Route path="/licenses" element={<Licenses />} />
                  <Route path="/terms" element={<TermsEN />} />
                  <Route path="/cookie-policy" element={<CookiePolicyEN />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyEN />} />
                  <Route path="/license-agreement" element={<LicenseAgreementEN />} />
                  <Route path="/infinity" element={<InfinityEN />} />
                  <Route path="/packages-pricing" element={<PackagesPricing />} />
                  <Route path="/about" element={<AboutEN />} />
                  <Route path="/ai-image-generator" element={<AIImageGenerator />} />
                  <Route path="/buy-credits" element={<BuyCredits />} />
                  <Route path="/test-accounts" element={<TestAccounts />} />
                  <Route path="/become-seller" element={<BecomeSeller />} />
                  <Route path="/seller-registration-success" element={<SellerRegistrationSuccess />} />
                  <Route path="/seller-registration-cancelled" element={<SellerRegistrationCancelled />} />
                  <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                  <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']} fallbackMessage="Only administrators can access this page.">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/create-test-accounts" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <CreateTestAccounts />
                    </ProtectedRoute>
                  } />
                  
                  {/* 404 Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SearchProvider>
            </LanguageProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AudioPlayerProvider>
    </CartProvider>
  </AuthProvider>
</QueryClientProvider>
);

export default App;
