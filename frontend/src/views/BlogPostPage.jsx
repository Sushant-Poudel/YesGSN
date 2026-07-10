'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO, { getBlogSEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { blogAPI } from '@/lib/api';

export default function BlogPostPage({ initialPost = null, slug: propSlug = null }) {
  const routeParams = useParams();
  const slug = propSlug || routeParams?.slug;
  const [post, setPost] = useState(initialPost);
  const [isLoading, setIsLoading] = useState(!initialPost);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await blogAPI.getOne(slug);
        setPost(res.data);
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-14 md:pt-24 pb-20 md:pb-8 max-w-3xl mx-auto px-4"><div className="h-8 w-48 skeleton rounded mb-4"></div><div className="h-12 w-full skeleton rounded mb-6"></div><div className="h-64 skeleton rounded"></div></div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-14 md:pt-24 pb-20 md:pb-8 max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-heading text-white mb-4">Post Not Found</h1>
          <Link href="/blog"><Button variant="outline" className="border-gold-500 text-gold-500">Back to Blog</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SEO {...getBlogSEO(post)} />
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/blog" className="inline-flex items-center text-white/60 hover:text-gold-500 mb-6 transition-colors"><ArrowLeft className="h-4 w-4 mr-2" />Back to Blog</Link>
          {post.image_url && <img src={post.image_url} alt={post.title} className="w-full h-64 object-cover rounded-lg mb-6" />}
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">{post.title}</h1>
          <p className="text-white/60 text-lg mb-6">{post.excerpt}</p>
          {post.cta_url && (
            <div className="mb-8">
              <a
                href={post.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-3.5 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/20"
              >
                {post.cta_text || 'Order Now'} <span>→</span>
              </a>
            </div>
          )}
          <div className="prose prose-invert prose-gold max-w-none rich-text-content" dangerouslySetInnerHTML={{ __html: post.content }} />
          
          {/* Buy Now CTA */}
          <div className="mt-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-center">
            <div className="text-2xl mb-2">🛍️</div>
            <h3 className="text-white font-bold text-xl mb-2">Ready to Buy?</h3>
            <p className="text-white/60 text-sm mb-4">Get your order via WhatsApp. Pay with eSewa or Khalti. No credit card needed.</p>
            <div className="flex flex-wrap gap-3 justify-center mb-4">
              <div className="flex items-center gap-1.5 text-white/60 text-xs"><span className="text-amber-500">⭐</span> 4.7/5 Rated</div>
              <div className="flex items-center gap-1.5 text-white/60 text-xs"><span>⚡</span> Fast Delivery</div>
              <div className="flex items-center gap-1.5 text-white/60 text-xs"><span>🇳🇵</span> Nepal Payments</div>
            </div>
            <Link href="/products" className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-3 rounded-xl transition-all hover:scale-105">
              Browse All Products →
            </Link>
          </div>

          {/* Trust Bar */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '🔒', text: 'Secure Payment' },
              { icon: '⚡', text: 'Fast Delivery' },
              { icon: '💬', text: 'WhatsApp Support' },
              { icon: '✅', text: 'Genuine Products' },
            ].map(item => (
              <div key={item.text} className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-xl mb-1">{item.icon}</div>
                <p className="text-white/60 text-xs">{item.text}</p>
              </div>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
