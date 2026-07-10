import { useState, useEffect, createContext, useContext } from 'react';
import { ShoppingCart, X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

// Cart Context
const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// Get cart from localStorage
const getStoredCart = () => {
  try {
    const cart = localStorage.getItem('gsn_cart');
    return cart ? JSON.parse(cart) : [];
  } catch {
    return [];
  }
};

// Save cart to localStorage
const saveCart = (cart) => {
  localStorage.setItem('gsn_cart', JSON.stringify(cart));
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setCart(getStoredCart());
  }, []);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const addToCart = (product, variation, quantity = 1) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && item.variation.id === variation.id
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        toast.success(`Updated quantity in cart`);
        return updated;
      }

      toast.success(`Added to cart`);
      return [...prev, { product, variation, quantity }];
    });
  };

  const removeFromCart = (productId, variationId) => {
    setCart(prev => prev.filter(
      item => !(item.product.id === productId && item.variation.id === variationId)
    ));
    toast.success('Removed from cart');
  };

  const updateQuantity = (productId, variationId, newQuantity) => {
    if (newQuantity < 1) return;
    setCart(prev => prev.map(item => {
      if (item.product.id === productId && item.variation.id === variationId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
    toast.success('Cart cleared');
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.variation.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartCount,
      isOpen,
      setIsOpen,
    }}>
      {children}
    </CartContext.Provider>
  );
}

// Cart Sidebar Component
export function CartSidebar() {
  const { cart, removeFromCart, updateQuantity, getCartTotal, getCartCount, clearCart, isOpen, setIsOpen } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-white hover:text-amber-500"
          data-testid="cart-trigger"
        >
          <ShoppingCart className="w-5 h-5" />
          {getCartCount() > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
              {getCartCount()}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-zinc-900 border-zinc-800 text-white w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-500" /> 
              My Cart ({getCartCount()})
            </span>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-400 hover:text-red-300 text-xs">
                Clear All
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4 max-h-[55vh] overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4" data-testid="empty-state-cart">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-xl scale-150" />
                <div className="relative p-5 rounded-full bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08]">
                  <ShoppingCart className="h-7 w-7 text-white/25" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-white/70 font-medium">Your cart is empty</p>
              <p className="text-white/40 text-sm mt-1">Add some products to get started!</p>
              <Link to="/">
                <Button className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors duration-200" onClick={() => setIsOpen(false)}>
                  Browse Products
                </Button>
              </Link>
            </div>
          ) : (
            cart.map((item) => (
              <div key={`${item.product.id}-${item.variation.id}`} className="flex gap-3 p-3 bg-zinc-800 rounded-lg">
                {item.product.image_url && (
                  <img 
                    src={item.product.image_url} 
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/product/${item.product.slug || item.product.id}`}
                    className="text-white font-medium hover:text-amber-500 truncate block text-sm"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-gray-400 text-xs">{item.variation.name}</p>
                  <p className="text-amber-500 font-semibold text-sm mt-1">
                    Rs {item.variation.price.toLocaleString()}
                  </p>
                  
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.variation.id, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-white font-medium w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.variation.id, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(item.product.id, item.variation.id)}
                    className="text-gray-400 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-white font-semibold text-sm">
                    Rs {(item.variation.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-800 space-y-4">
            <div className="flex items-center justify-between text-lg">
              <span className="text-gray-400">Total</span>
              <span className="text-amber-500 font-bold">Rs {getCartTotal().toLocaleString()}</span>
            </div>
            
            <Link to="/checkout" onClick={() => setIsOpen(false)}>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-6">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Proceed to Checkout
              </Button>
            </Link>
            
            <p className="text-gray-500 text-xs text-center">
              You can also order individual items from their product pages
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default CartProvider;
