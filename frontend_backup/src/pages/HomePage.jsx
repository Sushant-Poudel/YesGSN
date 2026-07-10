import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, Search, X, Shield, Clock, Headphones, Lock, Zap, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO, { SEOConfigs } from '@/components/SEO';
import ProductCard from '@/components/ProductCard';
import ReviewCard from '@/components/ReviewCard';
import { AdBanner, AdPopup } from '@/components/AdBanner';
import { ProductGridSkeleton } from '@/components/LoadingSkeletons';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { productsAPI, categoriesAPI, reviewsAPI, notificationBarAPI, blogAPI, paymentMethodsAPI } from '@/lib/api';

const TRUST_FEATURES = [
  { icon: Shield, title: 'Secure Payments', desc: '100% safe & encrypted' },
  { icon: Lock, title: 'Data Privacy', desc: 'Your info is protected' },
  { icon: Zap, title: 'Fast Delivery', desc: 'Within minutes' },
  { icon: Headphones, title: '24/7 Support', desc: 'Always here to help' },
];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ total: 0, avg_rating: 0 });
  const [blogPosts, setBlogPosts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [notificationBar, setNotificationBar] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const productsSectionRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, reviewsRes, reviewsPublicRes, notifRes, blogRes, paymentRes] = await Promise.all([
          productsAPI.getAll(),
          categoriesAPI.getAll(),
          reviewsAPI.getAll(),
          reviewsAPI.getPublic(1).catch(() => ({ data: { total: 0, avg_rating: 0 } })),
          notificationBarAPI.get().catch(() => ({ data: null })),
          blogAPI.getAll().catch(() => ({ data: [] })),
          paymentMethodsAPI.getAll().catch(() => ({ data: [] })),
        ]);
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
        setReviewStats({ total: reviewsPublicRes.data.total || 0, avg_rating: reviewsPublicRes.data.avg_rating || 0 });
        // Limit reviews to latest 20
        const sortedReviews = reviewsRes.data
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 20);
        setReviews(sortedReviews);
        setNotificationBar(notifRes.data);
        setBlogPosts(blogRes.data.slice(0, 3));
        setPaymentMethods(paymentRes.data);
      } catch (error) {
        console.error('Error:', error);
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
    const matchesSearch = !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase()) || product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const hotDeals = products.filter(p => p.tags?.includes('Hot') || p.tags?.includes('Sale')).slice(0, 5);
  const bestSellers = products.filter(p => p.tags?.includes('Popular') || p.tags?.includes('Best Seller')).slice(0, 5);
  const newArrivals = products.filter(p => p.tags?.includes('New')).slice(0, 5);

  const clearSearch = () => {
    setSearchQuery('');
    window.history.replaceState({}, '', '/');
  };

  const hasNotification = notificationBar && notificationBar.is_active && notificationBar.text;

  return (
    <div className="min-h-screen bg-black">
      <SEO {...SEOConfigs.home} />
      {hasNotification && (
        <div className="fixed top-0 left-0 right-0 z-[60] py-2 px-4 text-center text-sm font-medium backdrop-blur-xl" style={{ backgroundColor: notificationBar.bg_color, color: notificationBar.text_color }}>
          {notificationBar.link ? <a href={notificationBar.link} className="hover:underline">{notificationBar.text}</a> : notificationBar.text}
        </div>
      )}

      <Navbar notificationBarHeight={hasNotification ? 36 : 0} />

      {/* Reviews Section */}
      <section className="pt-14 md:pt-24" data-testid="reviews-section">
        <div className="py-3 border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const avg = reviewStats.avg_rating || 0;
                    const filled = star <= Math.floor(avg);
                    const half = !filled && star === Math.ceil(avg) && avg % 1 >= 0.3;
                    return (
                      <Star 
                        key={star} 
                        className={`h-4 w-4 ${filled ? 'text-amber-500 fill-amber-500' : half ? 'text-amber-500 fill-amber-500/50' : 'text-amber-500/30'}`} 
                      />
                    );
                  })}
                </div>
                <span className="text-amber-500 font-bold text-sm">
                  {reviewStats.avg_rating > 0 ? reviewStats.avg_rating.toFixed(1) : '0.0'}/5
                </span>
                <span className="text-white/70 text-sm">Based on {reviewStats.total} review{reviewStats.total !== 1 ? 's' : ''}</span>
              </div>
              <Link to="/reviews">
                <Button variant="outline" size="sm" className="border-white/15 text-white/70 hover:bg-white/5 hover:text-white text-xs" data-testid="view-all-reviews-btn">
                  View All Reviews<ChevronRight className="ml-1.5 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="py-6 lg:py-8 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 lg:mb-5">What Our Customers Say</h2>
          </div>

          {isLoading ? (
            <div className="flex gap-3 px-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-36 w-72 bg-zinc-900/50 rounded-xl flex-shrink-0 animate-pulse" />)}</div>
          ) : reviews.length > 0 ? (
            <div className="reviews-marquee-container">
              <div className="reviews-marquee">
                {reviews.map((review) => <div key={review.id} className="review-slide"><ReviewCard review={review} /></div>)}
                {reviews.map((review) => <div key={`dup-${review.id}`} className="review-slide"><ReviewCard review={review} /></div>)}
              </div>
            </div>
          ) : <div className="text-center py-6 text-white/30 text-sm">No reviews yet</div>}
        </div>
      </section>

      {/* Homepage Banner Ad */}
      <section className="py-3 lg:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdBanner position="home_banner" className="aspect-[4/1] sm:aspect-[5/1] lg:aspect-[6/1] rounded-xl overflow-hidden" closeable />
        </div>
      </section>

      {hotDeals.length > 0 && (
        <section className="py-6 lg:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Hot Deals</h2>
              <Link to="/" className="text-amber-500 text-xs sm:text-sm hover:text-amber-400 flex items-center gap-1 transition-colors">View All <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{hotDeals.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          </div>
        </section>
      )}

      {bestSellers.length > 0 && (
        <section className="py-6 lg:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Best Sellers</h2>
              <Link to="/" className="text-amber-500 text-xs sm:text-sm hover:text-amber-400 flex items-center gap-1 transition-colors">View All <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              {bestSellers.map((product) => <div key={product.id} className="flex-shrink-0 w-[155px] sm:w-[175px] lg:w-[195px] snap-start"><ProductCard product={product} /></div>)}
            </div>
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="py-6 lg:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">New Arrivals</h2>
              <Link to="/" className="text-amber-500 text-xs sm:text-sm hover:text-amber-400 flex items-center gap-1 transition-colors">View All <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{newArrivals.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          </div>
        </section>
      )}

      {/* All Products Section */}
      <section ref={productsSectionRef} className="py-8 lg:py-10" data-testid="products-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 lg:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-1">All Products</h2>
            <p className="text-white/40 text-sm">Browse our collection of premium digital products</p>
          </div>

          {searchQuery && (
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center gap-2 bg-zinc-900/80 border border-white/10 rounded-lg px-3.5 py-2">
                <Search className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-white/70 text-sm">Results for "<span className="text-amber-400">{searchQuery}</span>"</span>
                <button onClick={clearSearch} className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors"><X className="h-3.5 w-3.5 text-white/40 hover:text-white" /></button>
              </div>
            </div>
          )}

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button 
              onClick={() => setSelectedCategory(null)} 
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedCategory === null 
                  ? 'bg-amber-500 text-black' 
                  : 'bg-zinc-900/60 border border-white/[0.06] text-white/60 hover:text-white hover:border-white/15'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button 
                key={cat.id} 
                onClick={() => setSelectedCategory(cat.id)} 
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedCategory === cat.id 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-zinc-900/60 border border-white/[0.06] text-white/60 hover:text-white hover:border-white/15'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {isLoading ? (
            <ProductGridSkeleton count={10} />
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState type="search" title="No products found" description={searchQuery ? `No results for "${searchQuery}"` : 'No products in this category'} />
          )}
        </div>
      </section>

      {paymentMethods.length > 0 && (
        <section className="py-6 lg:py-8 border-t border-white/[0.04]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 text-center">Payment Options</h2>
            <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="glass-depth rounded-lg px-4 py-2.5 flex items-center gap-2.5 hover:border-white/15 transition-colors duration-200">
                  <img src={method.image_url} alt={method.name} className="h-7 w-auto object-contain" onError={(e) => e.target.style.display = 'none'} />
                  <span className="text-white/70 font-medium text-sm">{method.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-8 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-5 text-center">Trust & Safety</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {TRUST_FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="depth-card p-4 text-center opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mx-auto mb-2.5"><Icon className="h-5 w-5 text-amber-500" /></div>
                  <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                  <p className="text-white/40 text-xs mt-0.5">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {blogPosts.length > 0 && (
        <section className="py-8 lg:py-10 border-t border-white/[0.04]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Guides & Tips</h2>
              <Link to="/blog" className="text-amber-500 text-xs sm:text-sm hover:text-amber-400 flex items-center gap-1 transition-colors">View All <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {blogPosts.map((post, i) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="depth-card overflow-hidden group opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  {post.image_url && <img src={post.image_url} alt={post.title} className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
                  <div className="p-3.5">
                    <h3 className="font-semibold text-white text-sm group-hover:text-amber-400 transition-colors duration-200 line-clamp-2">{post.title}</h3>
                    <p className="text-white/40 text-xs mt-1.5 line-clamp-2">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
      
      {/* Popup Ad - Shows after 5 seconds, once per session */}
      <AdPopup delay={5000} showOnce />
    </div>
  );
}
