import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { WishlistProvider } from "@/components/Wishlist";
import { CartProvider } from "@/components/Cart";
import { LanguageProvider } from "@/components/Language";
import { CustomerProvider } from "@/components/CustomerAccount";
import InstallPWA from "@/components/InstallPWA";
import { GoogleOAuthProvider } from '@react-oauth/google';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "971769292372-5unqcvlcamf9ggfltgkhhq051mtihra1.apps.googleusercontent.com";

// Loading component
const PageLoader = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
  </div>
);

// Lazy load pages for better performance
const HomePage = lazy(() => import("@/pages/HomePage"));
const ProductPage = lazy(() => import("@/pages/ProductPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const PaymentPage = lazy(() => import("@/pages/PaymentPage"));
const InvoicePage = lazy(() => import("@/pages/InvoicePage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const FAQPage = lazy(() => import("@/pages/FAQPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const BlogPage = lazy(() => import("@/pages/BlogPage"));
const BlogPostPage = lazy(() => import("@/pages/BlogPostPage"));
const ReviewsPage = lazy(() => import("@/pages/ReviewsPage"));
const DailyRewardPage = lazy(() => import("@/pages/DailyRewardPage"));
const CustomerAccountPage = lazy(() => import("@/pages/CustomerAccountPage"));
const OrderTrackingPage = lazy(() => import("@/pages/OrderTrackingPage"));

// Admin pages - lazy loaded separately
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminCategories = lazy(() => import("@/pages/admin/AdminCategories"));
const AdminReviews = lazy(() => import("@/pages/admin/AdminReviews"));
const AdminFAQs = lazy(() => import("@/pages/admin/AdminFAQs"));
const AdminPages = lazy(() => import("@/pages/admin/AdminPages"));
const AdminSocialLinks = lazy(() => import("@/pages/admin/AdminSocialLinks"));
const AdminPaymentMethods = lazy(() => import("@/pages/admin/AdminPaymentMethods"));
const AdminNotificationBar = lazy(() => import("@/pages/admin/AdminNotificationBar"));
const AdminBlog = lazy(() => import("@/pages/admin/AdminBlog"));
const AdminPromoCodes = lazy(() => import("@/pages/admin/AdminPromoCodes"));
const AdminPricingSettings = lazy(() => import("@/pages/admin/AdminPricingSettings"));
const AdminTrustpilot = lazy(() => import("@/pages/admin/AdminTrustpilot"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminCustomers = lazy(() => import("@/pages/admin/AdminCustomers"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminStaff = lazy(() => import("@/pages/admin/AdminStaff"));
const AdminNewsletter = lazy(() => import("@/pages/admin/AdminNewsletter"));
const AdminCreditSettings = lazy(() => import("@/pages/admin/AdminCreditSettings"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AdminAuditLogs"));
const AdminAds = lazy(() => import("@/pages/admin/AdminAds"));
const AdminResellerPlans = lazy(() => import("@/pages/admin/AdminResellerPlans"));
const AdminWebhooks = lazy(() => import("@/pages/admin/AdminWebhooks"));
const ResellerPlansPage = lazy(() => import("@/pages/ResellerPlansPage"));
import AdminDailyReward from "@/pages/admin/AdminDailyReward";
import AdminReferral from "@/pages/admin/AdminReferral";
import AdminMultiplier from "@/pages/admin/AdminMultiplier";
import ProtectedRoute from "@/components/ProtectedRoute";
import "@/App.css";

// Track website visits
const trackVisit = () => {
  // Generate or get visitor ID
  let visitorId = localStorage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('visitor_id', visitorId);
  }
  
  // Track the visit
  fetch(`${process.env.REACT_APP_BACKEND_URL}/api/track-visit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Visitor-ID': visitorId
    }
  }).catch(() => {}); // Silent fail
};

// Register Service Worker for PWA
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('GSN: Service Worker registered successfully');
        })
        .catch((error) => {
          console.log('GSN: Service Worker registration failed:', error);
        });
    });
  }
};

function App() {
  useEffect(() => {
    trackVisit();
    registerServiceWorker();
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LanguageProvider>
        <CustomerProvider>
          <CartProvider>
            <WishlistProvider>
              <div className="App min-h-screen bg-black">
                <BrowserRouter>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/product/:productSlug" element={<ProductPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/payment/:orderId" element={<PaymentPage />} />
                  <Route path="/invoice/:orderId" element={<InvoicePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/blog/:slug" element={<BlogPostPage />} />
                  <Route path="/reviews" element={<ReviewsPage />} />
                  <Route path="/daily-reward" element={<DailyRewardPage />} />
                  <Route path="/account" element={<CustomerAccountPage />} />
                  <Route path="/track-order" element={<OrderTrackingPage />} />
                  <Route path="/reseller-plans" element={<ResellerPlansPage />} />

                  <Route path="/panelgsnadminbackend/login" element={<AdminLogin />} />
                  <Route path="/panelgsnadminbackend" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/analytics" element={<ProtectedRoute requiredPermission="view_analytics"><AdminAnalytics /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/products" element={<ProtectedRoute requiredPermission="view_products"><AdminProducts /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/categories" element={<ProtectedRoute requiredPermission="view_categories"><AdminCategories /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/reviews" element={<ProtectedRoute requiredPermission="view_reviews"><AdminReviews /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/faqs" element={<ProtectedRoute requiredPermission="view_faqs"><AdminFAQs /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/pages" element={<ProtectedRoute requiredPermission="view_pages"><AdminPages /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/social-links" element={<ProtectedRoute requiredPermission="view_settings"><AdminSocialLinks /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/payment-methods" element={<ProtectedRoute requiredPermission="view_settings"><AdminPaymentMethods /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/notification-bar" element={<ProtectedRoute requiredPermission="view_settings"><AdminNotificationBar /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/blog" element={<ProtectedRoute requiredPermission="view_blog"><AdminBlog /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/promo-codes" element={<ProtectedRoute requiredPermission="view_settings"><AdminPromoCodes /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/pricing" element={<ProtectedRoute requiredPermission="view_settings"><AdminPricingSettings /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/trustpilot" element={<ProtectedRoute requiredPermission="view_settings"><AdminTrustpilot /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/customers" element={<ProtectedRoute requiredPermission="view_customers"><AdminCustomers /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/orders" element={<ProtectedRoute requiredPermission="view_orders"><AdminOrders /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/staff" element={<ProtectedRoute requiredPermission="manage_admins"><AdminStaff /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/newsletter" element={<ProtectedRoute requiredPermission="view_settings"><AdminNewsletter /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/credit-settings" element={<ProtectedRoute requiredPermission="view_settings"><AdminCreditSettings /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/daily-reward" element={<ProtectedRoute requiredPermission="view_settings"><AdminDailyReward /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/referral" element={<ProtectedRoute requiredPermission="view_settings"><AdminReferral /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/multiplier" element={<ProtectedRoute requiredPermission="view_settings"><AdminMultiplier /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/audit-logs" element={<ProtectedRoute requiredPermission="view_analytics"><AdminAuditLogs /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/ads" element={<ProtectedRoute requiredPermission="view_settings"><AdminAds /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/reseller-plans" element={<ProtectedRoute requiredPermission="view_settings"><AdminResellerPlans /></ProtectedRoute>} />
                  <Route path="/panelgsnadminbackend/webhooks" element={<ProtectedRoute requiredPermission="view_settings"><AdminWebhooks /></ProtectedRoute>} />
                </Routes>
                <InstallPWA />
              </BrowserRouter>
              <Toaster position="top-right" richColors />
            </div>
            </WishlistProvider>
          </CartProvider>
        </CustomerProvider>
      </LanguageProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
