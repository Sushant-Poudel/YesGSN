import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Heart, X, Bell, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { wishlistAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

// Generate or get visitor ID
const getVisitorId = () => {
  let visitorId = localStorage.getItem('gsn_visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('gsn_visitor_id', visitorId);
  }
  return visitorId;
};

// Wishlist Context
const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const visitorId = getVisitorId();

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await wishlistAPI.get(visitorId);
      setWishlist(res.data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  }, [visitorId]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const addToWishlist = async (productId, variationId = null) => {
    try {
      await wishlistAPI.add({
        visitor_id: visitorId,
        product_id: productId,
        variation_id: variationId,
      });
      await fetchWishlist();
      toast.success('Added to wishlist');
      return true;
    } catch (error) {
      toast.error('Failed to add to wishlist');
      return false;
    }
  };

  const removeFromWishlist = async (productId, variationId = null) => {
    try {
      await wishlistAPI.remove(visitorId, productId, variationId);
      await fetchWishlist();
      toast.success('Removed from wishlist');
      return true;
    } catch (error) {
      toast.error('Failed to remove from wishlist');
      return false;
    }
  };

  const isInWishlist = (productId, variationId = null) => {
    return wishlist.some(item => 
      item.product_id === productId && 
      (variationId ? item.variation_id === variationId : true)
    );
  };

  const toggleWishlist = async (productId, variationId = null) => {
    if (isInWishlist(productId, variationId)) {
      return removeFromWishlist(productId, variationId);
    } else {
      return addToWishlist(productId, variationId);
    }
  };

  return (
    <WishlistContext.Provider value={{
      wishlist,
      isLoading,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      toggleWishlist,
      refreshWishlist: fetchWishlist,
      visitorId,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

// Wishlist Button Component (for product cards/pages)
export function WishlistButton({ productId, variationId = null, size = 'default' }) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [loading, setLoading] = useState(false);
  
  const inWishlist = isInWishlist(productId, variationId);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    await toggleWishlist(productId, variationId);
    setLoading(false);
  };

  const sizeClasses = size === 'sm' 
    ? 'w-8 h-8' 
    : 'w-10 h-10';

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${sizeClasses} rounded-full flex items-center justify-center transition-all ${
        inWishlist 
          ? 'bg-red-500 text-white' 
          : 'bg-black/50 text-white hover:bg-red-500/20 hover:text-red-400'
      }`}
      data-testid={`wishlist-btn-${productId}`}
    >
      <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
    </button>
  );
}

// Wishlist Sidebar Component
export function WishlistSidebar() {
  const { wishlist, removeFromWishlist, visitorId } = useWishlist();
  const [email, setEmail] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setEmailSubmitting(true);
    try {
      await wishlistAPI.updateEmail(visitorId, email);
      toast.success('You\'ll be notified when prices drop!');
      setEmail('');
    } catch (error) {
      toast.error('Failed to save email');
    } finally {
      setEmailSubmitting(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-white hover:text-amber-500"
          data-testid="wishlist-trigger"
        >
          <Heart className="w-5 h-5" />
          {wishlist.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {wishlist.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-zinc-900 border-zinc-800 text-white w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" /> My Wishlist ({wishlist.length})
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {wishlist.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Your wishlist is empty</p>
              <p className="text-sm mt-1">Save items you love!</p>
            </div>
          ) : (
            wishlist.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 bg-zinc-800 rounded-lg">
                {item.product?.image_url && (
                  <img 
                    src={item.product.image_url} 
                    alt={item.product?.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/product/${item.product?.slug || item.product_id}`}
                    className="text-white font-medium hover:text-amber-500 truncate block"
                  >
                    {item.product?.name || 'Product'}
                  </Link>
                  {item.product?.variations?.[0] && (
                    <p className="text-amber-500 text-sm">
                      Rs {item.product.variations[0].price}
                    </p>
                  )}
                  {item.price_when_added && item.product?.variations?.[0]?.price < item.price_when_added && (
                    <p className="text-green-400 text-xs flex items-center gap-1">
                      <Bell className="w-3 h-3" /> Price dropped!
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeFromWishlist(item.product_id, item.variation_id)}
                  className="text-gray-400 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {wishlist.length > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <p className="text-gray-400 text-sm mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Get notified when prices drop
            </p>
            <form onSubmit={handleEmailSubmit} className="flex gap-2">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-zinc-800 border-zinc-700"
              />
              <Button 
                type="submit" 
                disabled={emailSubmitting}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                Notify Me
              </Button>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default WishlistProvider;
