'use client';
import { WishlistProvider } from '@/components/Wishlist';
import { CartProvider } from '@/components/Cart';
import { LanguageProvider } from '@/components/Language';
import { CustomerProvider } from '@/components/CustomerAccount';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from '@/components/ui/sonner';
import InstallPWA from '@/components/InstallPWA';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "971769292372-5unqcvlcamf9ggfltgkhhq051mtihra1.apps.googleusercontent.com";

export default function ClientProviders({ children }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LanguageProvider>
        <CustomerProvider>
          <CartProvider>
            <WishlistProvider>
              {children}
              <InstallPWA />
              <Toaster position="top-right" richColors />
            </WishlistProvider>
          </CartProvider>
        </CustomerProvider>
      </LanguageProvider>
    </GoogleOAuthProvider>
  );
}
