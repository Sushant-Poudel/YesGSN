import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { pagesAPI } from '@/lib/api';

export default function TermsPage() {
  const [pageData, setPageData] = useState({ title: 'Terms and Conditions', content: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    pagesAPI.get('terms').then(res => setPageData(res.data)).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const defaultContent = `
    <h2>1. Introduction</h2>
    <p>Welcome to GameShop Nepal. By using our website and services, you agree to these terms and conditions.</p>
    <h2>2. Products and Services</h2>
    <p>We sell digital products including gaming subscriptions, OTT services, software licenses, and game credits. All products are delivered digitally.</p>
    <h2>3. Ordering Process</h2>
    <p>Orders are placed through WhatsApp. Once payment is confirmed, products are delivered within minutes to 24 hours depending on the product type.</p>
    <h2>4. Payment</h2>
    <p>We accept eSewa, Khalti, bank transfer, and other local payment methods. Payment details are shared via WhatsApp during the ordering process.</p>
    <h2>5. Refund Policy</h2>
    <p>Refunds are available for products that cannot be delivered or are not as described. Contact us within 24 hours of purchase for refund requests.</p>
    <h2>6. Delivery</h2>
    <p>Digital products are delivered instantly or within 24 hours. Delivery time may vary based on product availability.</p>
    <h2>7. Account Sharing</h2>
    <p>Some products may involve shared accounts. Please follow the usage guidelines provided with your purchase.</p>
    <h2>8. Contact</h2>
    <p>For any questions or concerns, contact us at support@gameshopnepal.com or via WhatsApp.</p>
  `;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-testid="terms-page">
          {isLoading ? (
            <div className="space-y-6"><div className="h-12 w-1/2 skeleton rounded"></div><div className="h-40 skeleton rounded"></div></div>
          ) : (
            <>
              <h1 className="font-heading text-4xl md:text-5xl font-bold text-white uppercase tracking-tight mb-8">{pageData.title}</h1>
              <div className="rich-text-content text-white/80 leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: pageData.content || defaultContent }} />
              <div className="mt-12 pt-8 border-t border-white/10"><p className="text-white/40 text-sm">Last updated: January 2025</p></div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
