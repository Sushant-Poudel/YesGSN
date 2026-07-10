'use client';

import Link from 'next/link';
import { InlineAd } from '@/components/AdBanner';
import { useEffect, useState } from 'react';
import { Search, X, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import ProductCard from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/LoadingSkeletons';
import EmptyState from '@/components/EmptyState';
import { productsAPI, categoriesAPI } from '@/lib/api';

export default function ProductsPage({ initialProducts = [], initialCategories = [] }) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [isLoading, setIsLoading] = useState(initialProducts.length === 0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (initialProducts.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search');
      if (search) setSearchQuery(search);
      return;
    }
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          productsAPI.getAll(),
          categoriesAPI.getAll(),
        ]);
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    if (search) setSearchQuery(search);
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-black">
      <SEO
        title="All Products | GameShop Nepal"
        description="Browse all digital subscriptions at GameShop Nepal. Netflix, Spotify, YouTube Premium, ChatGPT Plus and more at best prices in Nepal."
        keywords="digital subscriptions Nepal, Netflix Nepal, Spotify Nepal, ChatGPT Plus Nepal"
      />
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center text-white/50 hover:text-amber-500 text-sm mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">All Products</h1>
            <p className="text-white/40 text-sm mt-1">Browse our full collection of premium digital products</p>
          </div>

          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-zinc-900/80 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setSelectedCategory(null)} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${selectedCategory === null ? 'bg-amber-500 text-black' : 'bg-zinc-900/60 border border-white/[0.06] text-white/60 hover:text-white hover:border-white/15'}`}>All</button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${selectedCategory === cat.id ? 'bg-amber-500 text-black' : 'bg-zinc-900/60 border border-white/[0.06] text-white/60 hover:text-white hover:border-white/15'}`}>{cat.name}</button>
            ))}
          </div>

          {!isLoading && (
            <p className="text-white/30 text-xs mb-4">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          )}

          {isLoading ? (
            <ProductGridSkeleton count={12} />
          ) : filteredProducts.length > 0 ? (
            <>
              <InlineAd className="mb-4 max-w-3xl mx-auto" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
            </>
          ) : (
            <EmptyState type="search" title="No products found" description={searchQuery ? `No results for "${searchQuery}"` : 'No products in this category'} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
