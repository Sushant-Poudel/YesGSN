import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO, { SEOConfigs } from '@/components/SEO';
import { pagesAPI } from '@/lib/api';

export default function AboutPage() {
  const [pageData, setPageData] = useState({ title: 'About Us', content: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    pagesAPI.get('about').then(res => setPageData(res.data)).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <SEO {...SEOConfigs.about} />
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-testid="about-page">
          {isLoading ? (
            <div className="space-y-6"><div className="h-12 w-1/2 skeleton rounded"></div><div className="h-40 skeleton rounded"></div></div>
          ) : (
            <>
              <h1 className="font-heading text-4xl md:text-5xl font-bold text-white uppercase tracking-tight mb-8">{pageData.title}</h1>
              <div className="rich-text-content text-white/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: pageData.content || `
                <p><strong>Welcome to GameShop Nepal</strong> - Your trusted source for digital products since 2021.</p>
                <p>We are Nepal's leading provider of gaming subscriptions, OTT services, software licenses, and digital top-ups. Our mission is to make international digital products accessible to everyone in Nepal without the need for international payment cards.</p>
                <h2>Why Choose Us?</h2>
                <ul>
                  <li><strong>Trusted Since 2021</strong> - Years of reliable service and thousands of happy customers</li>
                  <li><strong>Instant Delivery</strong> - Get your products delivered within minutes</li>
                  <li><strong>Best Prices</strong> - Competitive pricing with regular discounts</li>
                  <li><strong>24/7 Support</strong> - Our team is always ready to help you</li>
                  <li><strong>Secure Payments</strong> - Multiple payment options for your convenience</li>
                </ul>
                <p>Thank you for choosing GameShop Nepal. We look forward to serving you!</p>
              ` }} />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
