'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import Link from 'next/link';
import { Shield, Zap, Star, Users, Award } from 'lucide-react';
import { pagesAPI } from '@/lib/api';

const STATS = [
  { value: '1,500+', label: 'Happy Customers' },
  { value: '4.7/5', label: 'Customer Rating' },
  { value: '35+', label: 'Products Available' },
  { value: '2021', label: 'Founded In Butwal' },
];

const WHY_US = [
  { icon: Shield, title: 'Genuine Products', desc: 'Every subscription is 100% authentic. Indian paid accounts with full premium features.' },
  { icon: Zap, title: 'Instant Delivery', desc: 'Orders processed via WhatsApp within minutes of payment confirmation.' },
  { icon: Star, title: '4.7/5 Customer Rating', desc: '170+ verified reviews from real Nepali customers. Every star is earned.' },
  { icon: Users, title: 'Local & Trusted', desc: 'Based in Butwal, Nepal. We accept eSewa, Khalti and Bank Transfer.' },
  { icon: Award, title: 'Serving Nepal Since 2021', desc: 'Helping thousands of Nepalis access premium digital products affordably since 2021.' },
];

const DEFAULT_CONTENT = `
<section>
  <h2>The Story Behind GameShop Nepal</h2>
  <p>It started with a scam.</p>
  <p>Back in 2021, <strong>Sushant Poudel</strong> — then just 14 years old — was trying to buy a Netflix subscription online. He paid. He waited. The account never came. Rs. 500 gone, trust shattered.</p>
  <p>Most people would have moved on. Sushant got angry — and then got to work.</p>
</section>
<section>
  <h2>Why GameShop Nepal Exists</h2>
  <p>At 14, with zero business experience and a whole lot of passion, <strong>GameShop Nepal was born</strong>.</p>
</section>
`;

export default function AboutPage({ initialData = null }) {
  const [pageContent, setPageContent] = useState(initialData?.content || '');
  const [isLoading, setIsLoading] = useState(!initialData?.content);

  useEffect(() => {
    if (initialData?.content) {
      setPageContent(initialData.content);
      setIsLoading(false);
      return;
    }
    // Fallback: fetch client-side if server didn't provide data
    fetch('/api/pages/about', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.content) setPageContent(d.content);
        else setPageContent(DEFAULT_CONTENT);
      })
      .catch(() => setPageContent(DEFAULT_CONTENT))
      .finally(() => setIsLoading(false));
  }, [initialData]);

  return (
    <div className="min-h-screen bg-black">
      <SEO
        title="About GameShop Nepal — Our Story | Trusted Since 2021 | Butwal Nepal"
        description="GameShop Nepal is Nepal's most trusted digital subscription store founded by Sushant Poudel in 2021. Buy Netflix, Spotify, YouTube Premium at best prices. Rated 4.7/5 by customers."
        keywords="GameShop Nepal about, trusted digital store Nepal, Netflix seller Nepal, Butwal digital store, Sushant Poudel"
      />
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-amber-400 text-sm font-medium">Trusted Since 2021 • Butwal, Nepal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Nepal's Most Trusted<br />
            <span className="text-amber-500">Digital Subscription Store</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            Born from a scam. Built with passion. Trusted by thousands of customers across Nepal.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/products" className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-6 py-3 rounded-xl transition-all hover:scale-105">Browse Products</Link>
            <a href="https://wa.me/9779743488871" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/15 text-white font-bold px-6 py-3 rounded-xl transition-all">WhatsApp Us</a>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-white/[0.06] bg-white/[0.02]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-amber-500 mb-1">{stat.value}</div>
                  <div className="text-white/50 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dynamic Content from DB */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div
              className="prose prose-invert prose-amber max-w-none
                prose-h2:text-2xl prose-h2:font-bold prose-h2:text-white prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:font-semibold prose-h3:text-white prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-white/60 prose-p:leading-relaxed prose-p:mb-4
                prose-strong:text-white
                prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
                prose-ul:text-white/60 prose-li:mb-2
                prose-blockquote:border-l-4 prose-blockquote:border-amber-500 prose-blockquote:bg-amber-500/5 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-white/70"
              dangerouslySetInnerHTML={{ __html: pageContent || DEFAULT_CONTENT }}
            />
          )}
        </section>

        {/* Why Us */}
        <section className="bg-white/[0.02] border-y border-white/[0.06]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 text-center">Why Choose GameShop Nepal?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {WHY_US.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:border-amber-500/20 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                        <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-white/60 mb-8">Join thousands of satisfied customers across Nepal. Pay with eSewa or Khalti.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/products" className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-3 rounded-xl transition-all hover:scale-105">Shop Now</Link>
            <Link href="/reviews" className="bg-white/10 hover:bg-white/15 text-white font-bold px-8 py-3 rounded-xl transition-all">Read Reviews</Link>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
