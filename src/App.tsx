import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SearchProvider } from "@/hooks/useSearch";
import { LanguageRedirect } from "@/components/LanguageRedirect";
import { RouteTitleFallback } from "@/components/RouteTitleFallback";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";


// Critical above-the-fold components loaded eagerly
import IndexEN from "./pages/en/IndexEN";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Loading fallback for lazy components
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse flex flex-col items-center gap-4">
      <div className="h-12 w-12 rounded-full bg-primary/20" />
      <div className="h-4 w-32 bg-muted rounded" />
    </div>
  </div>
);

// Lazy-loaded routes for code splitting
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const DashboardRouter = lazy(() => import("./pages/DashboardRouter"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const BuyerDashboard = lazy(() => import("./pages/BuyerDashboard"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const SellerPortfolio = lazy(() => import("./pages/SellerPortfolio"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
const FileUpload = lazy(() => import("./pages/FileUpload"));
const ProductManagement = lazy(() => import("./pages/ProductManagement"));
const Support = lazy(() => import("./pages/Support"));
const Licenses = lazy(() => import("./pages/Licenses"));
const PackagesPricing = lazy(() => import("./pages/PackagesPricing"));
const BuyCredits = lazy(() => import("./pages/BuyCredits"));
const TestAccounts = lazy(() => import("./pages/TestAccounts"));
const BecomeSeller = lazy(() => import("./pages/BecomeSeller"));
const SellerRegistrationSuccess = lazy(() => import("./pages/SellerRegistrationSuccess"));
const SellerRegistrationCancelled = lazy(() => import("./pages/SellerRegistrationCancelled"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CreateTestAccounts = lazy(() => import("./pages/CreateTestAccounts"));

// AI/Studio pages (heavy dependencies - always lazy load)
const AIImageGenerator = lazy(() => import("./pages/AIImageGenerator"));
const StudioAI = lazy(() => import("./pages/StudioAI"));
const RemoveBackground = lazy(() => import("./pages/RemoveBackground"));
const VideoUpscale = lazy(() => import("./pages/VideoUpscale"));
const TextToSpeech = lazy(() => import("./pages/TextToSpeech"));
const ImageToVideo = lazy(() => import("./pages/ImageToVideo"));
const ImageConverter = lazy(() => import("./pages/ImageConverter"));
const AdjustMusicDuration = lazy(() => import("./pages/AdjustMusicDuration"));
const ImageUpscale = lazy(() => import("./pages/ImageUpscale"));
const AIUpscaler = lazy(() => import("./pages/AIUpscaler"));
const FaceEnhancer = lazy(() => import("./pages/FaceEnhancer"));
const ReframeVideo = lazy(() => import("./pages/ReframeVideo"));

// Content pages (lazy loaded)
const ContactEN = lazy(() => import("./pages/en/ContactEN"));
const TermsEN = lazy(() => import("./pages/en/TermsEN"));
const CookiePolicyEN = lazy(() => import("./pages/en/CookiePolicyEN"));
const PrivacyPolicyEN = lazy(() => import("./pages/en/PrivacyPolicyEN"));
const LicenseAgreementEN = lazy(() => import("./pages/en/LicenseAgreementEN"));
const InfinityEN = lazy(() => import("./pages/en/InfinityEN"));
const AboutEN = lazy(() => import("./pages/en/AboutEN"));
const BlogEN = lazy(() => import("./pages/en/BlogEN"));
const BlogArticleEN = lazy(() => import("./pages/en/BlogArticleEN"));
const Collections = lazy(() => import("./pages/Collections"));
const CollectionDetail = lazy(() => import("./pages/CollectionDetail"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <AudioPlayerProvider>
            <TooltipProvider>
              <LanguageProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <SearchProvider>
                    <LanguageRedirect />
                    <RouteTitleFallback />
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        {/* Homepage - loaded eagerly for fast initial render */}
                        <Route path="/" element={<IndexEN />} />
                        
                        {/* Marketplace routes */}
                        <Route path="/marketplace" element={<Marketplace />} />
                        <Route path="/videos/:searchQuery" element={<Marketplace />} />
                        <Route path="/photos/:searchQuery" element={<Marketplace />} />
                        <Route path="/audio/:searchQuery" element={<Marketplace />} />
                        <Route path="/ebooks/:searchQuery" element={<Marketplace />} />
                        <Route path="/products/:slug" element={<ProductDetail />} />
                        <Route path="/product/:id" element={<ProductDetail />} />
                        
                        {/* Auth routes */}
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/auth/seller" element={<Auth />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        
                        {/* Dashboard routes */}
                        <Route path="/dashboard" element={<DashboardRouter />} />
                        <Route path="/seller-dashboard" element={<SellerDashboard />} />
                        <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
                        <Route path="/portfolio" element={<Portfolio />} />
                        <Route path="/seller/:storeSlug" element={<SellerPortfolio />} />
                        
                        {/* E-commerce routes */}
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                        
                        {/* Creator routes */}
                        <Route path="/file-upload" element={<FileUpload />} />
                        <Route path="/product-management" element={<ProductManagement />} />
                        <Route path="/become-seller" element={<BecomeSeller />} />
                        <Route path="/seller-registration-success" element={<SellerRegistrationSuccess />} />
                        <Route path="/seller-registration-cancelled" element={<SellerRegistrationCancelled />} />
                        
                        {/* AI/Studio routes (heavy) */}
                        <Route path="/ai-image-generator" element={<AIImageGenerator />} />
                        <Route path="/studio-ai" element={<StudioAI />} />
                        <Route path="/studio-ai/remove-background" element={<RemoveBackground />} />
                        <Route path="/studio-ai/video-upscale" element={<VideoUpscale />} />
                        <Route path="/studio-ai/text-to-speech" element={<TextToSpeech />} />
                        <Route path="/studio-ai/image-to-video" element={<ImageToVideo />} />
                        <Route path="/studio-ai/image-converter" element={<ImageConverter />} />
                        <Route path="/studio-ai/adjust-music-duration" element={<AdjustMusicDuration />} />
                        <Route path="/studio-ai/image-upscale" element={<ImageUpscale />} />
                        <Route path="/ai-upscaler" element={<AIUpscaler />} />
                        <Route path="/face-enhancer" element={<FaceEnhancer />} />
                        <Route path="/studio-ai/reframe-video" element={<ReframeVideo />} />
                        
                        {/* Content pages */}
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
                        <Route path="/blog" element={<BlogEN />} />
                        <Route path="/blog/:slug" element={<BlogArticleEN />} />
                        <Route path="/collections" element={<Collections />} />
                        <Route path="/collections/:slug" element={<CollectionDetail />} />
                        <Route path="/buy-credits" element={<BuyCredits />} />
                        <Route path="/test-accounts" element={<TestAccounts />} />
                        <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                        
                        {/* Admin routes */}
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
                    </Suspense>
                  </SearchProvider>
                </BrowserRouter>
              </LanguageProvider>
            </TooltipProvider>
          </AudioPlayerProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
