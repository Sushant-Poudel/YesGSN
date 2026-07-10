import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ShoppingCart, Loader2, AlertCircle, Ticket, X, Plus, Minus, AlertTriangle, Heart, Coins, Info } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import SEO, { getProductSEO } from '@/components/SEO';
import { AdBanner } from '@/components/AdBanner';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { productsAPI, ordersAPI, promoCodesAPI, settingsAPI, sendTrustpilotInvitation, creditsAPI } from '@/lib/api';
import { useCart } from '@/components/Cart';
import { useWishlist } from '@/components/Wishlist';
import { useLanguage } from '@/components/Language';
import { useCustomer } from '@/components/CustomerAccount';
import CustomerAuth from '@/components/CustomerAuth';
import { FlashSaleTimer } from '@/components/FlashSale';

export default function ProductPage() {
  const { productSlug } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { addToCart, setIsOpen: setCartOpen } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { customer } = useCustomer();
  
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', custom_fields: {}, remark: '' });
  
  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  
  // Pricing settings
  const [pricingSettings, setPricingSettings] = useState({ service_charge: 0, tax_percentage: 0, tax_label: 'Tax' });

  // Store Credits
  const [creditBalance, setCreditBalance] = useState(0);
  const [useCredits, setUseCredits] = useState(false);
  const [customCreditAmount, setCustomCreditAmount] = useState('');
  const [creditSettings, setCreditSettings] = useState({ cashback_percentage: 5, is_enabled: true });
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Auto-fill form for logged-in users
  useEffect(() => {
    if (customer) {
      setOrderForm(prev => ({
        ...prev,
        customer_name: customer.name || '',
        customer_email: customer.email || '',
        customer_phone: customer.whatsapp_number || customer.phone || ''
      }));
      // Fetch credit balance
      fetchCreditBalance(customer.email);
    }
  }, [customer]);

  const fetchCreditBalance = async (email) => {
    if (!email) return;
    try {
      const res = await creditsAPI.getBalance(email);
      setCreditBalance(res.data.credit_balance || 0);
    } catch (e) {
      console.log('Could not fetch credit balance');
    }
  };

  useEffect(() => {
    // Scroll to top when product page loads
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    const fetchProduct = async () => {
      try {
        const [productRes, settingsRes, creditRes] = await Promise.all([
          productsAPI.getOne(productSlug),
          settingsAPI.get().catch(() => ({ data: { service_charge: 0, tax_percentage: 0, tax_label: 'Tax' } })),
          creditsAPI.getSettings().catch(() => ({ data: { cashback_percentage: 5, is_enabled: true } }))
        ]);
        setProduct(productRes.data);
        setPricingSettings(settingsRes.data);
        setCreditSettings(creditRes.data);
        if (productRes.data.variations?.length > 0) setSelectedVariation(productRes.data.variations[0].id);
        
        // Fetch related products
        try {
          const relatedRes = await productsAPI.getRelated(productSlug);
          setRelatedProducts(relatedRes.data || []);
        } catch (e) {
          console.log('No related products');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [productSlug]);

  const currentVariation = product?.variations?.find(v => v.id === selectedVariation);
  
  // Flash sale check
  const isFlashSale = product?.flash_sale_end && new Date(product.flash_sale_end) > new Date();
  
  // Stock indicator
  const stockQuantity = product?.stock_quantity;
  const hasLimitedStock = stockQuantity !== null && stockQuantity !== undefined;
  const isLowStock = hasLimitedStock && stockQuantity <= 5 && stockQuantity > 0;
  
  // Calculate pricing
  const unitPrice = currentVariation?.price || 0;
  const subtotal = unitPrice * quantity;
  const discountAmount = promoDiscount?.discount_amount || 0;
  const afterDiscount = subtotal - discountAmount;
  const serviceCharge = parseFloat(pricingSettings.service_charge) || 0;
  const taxPercentage = parseFloat(pricingSettings.tax_percentage) || 0;
  const taxAmount = afterDiscount * (taxPercentage / 100);
  const totalBeforeCredits = afterDiscount + serviceCharge + taxAmount;
  
  // Calculate credits to use - either custom amount or max if use all
  const getCreditsToUse = () => {
    if (!useCredits || !customer) return 0;
    if (customCreditAmount !== '') {
      const customAmount = parseFloat(customCreditAmount) || 0;
      return Math.min(customAmount, creditBalance, totalBeforeCredits);
    }
    return Math.min(creditBalance, totalBeforeCredits);
  };
  const creditsToUse = getCreditsToUse();
  const total = Math.max(0, totalBeforeCredits - creditsToUse);

  const handleQuantityChange = (delta) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && (!hasLimitedStock || newQty <= stockQuantity)) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = () => {
    if (!currentVariation) return;
    addToCart(product, currentVariation, quantity);
    setCartOpen(true);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    
    // Require login to use promo codes
    if (!customer || !customer.email) {
      toast.error('Please login to use promo codes');
      return;
    }
    
    setIsValidatingPromo(true);
    try {
      const res = await promoCodesAPI.validate(promoCode.trim(), subtotal, customer.email);
      setPromoDiscount(res.data);
      toast.success(`Promo code applied! You save Rs ${res.data.discount_amount}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid promo code');
      setPromoDiscount(null);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setPromoDiscount(null);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!orderForm.customer_name || !orderForm.customer_phone || !orderForm.customer_email) {
      toast.error('Please fill in your name, phone number, and email');
      return;
    }

    setIsSubmitting(true);
    try {
      let fullRemark = '';
      if (product.custom_fields && product.custom_fields.length > 0) {
        product.custom_fields.forEach(field => {
          const value = orderForm.custom_fields[field.id];
          if (value) fullRemark += `${field.label}: ${value}\n`;
        });
      }
      if (promoDiscount) {
        fullRemark += `Promo Code: ${promoDiscount.code} (-Rs ${promoDiscount.discount_amount})\n`;
      }
      if (creditsToUse > 0) {
        fullRemark += `Store Credits Used: Rs ${creditsToUse}\n`;
      }
      if (orderForm.remark) fullRemark += `Notes: ${orderForm.remark}`;

      const orderPayload = {
        customer_name: orderForm.customer_name,
        customer_phone: orderForm.customer_phone,
        customer_email: orderForm.customer_email || null,
        items: [{ 
          name: product.name, 
          price: currentVariation.price, 
          quantity: quantity, 
          variation: currentVariation.name,
          product_id: product.id,
          variation_id: currentVariation.id
        }],
        total_amount: total,
        credits_used: creditsToUse,
        promo_code: promoDiscount?.code || null,
        remark: fullRemark.trim() || null
      };

      const res = await ordersAPI.create(orderPayload);
      const orderId = res.data.order_id;
      
      // If total is 0 (fully paid with credits), redirect to WhatsApp directly
      if (total === 0 && creditsToUse > 0) {
        const siteUrl = window.location.origin;
        const invoiceUrl = `${siteUrl}/invoice/${orderId}`;
        
        // Build custom fields text for WhatsApp
        let customFieldsText = '';
        if (product.custom_fields && product.custom_fields.length > 0) {
          product.custom_fields.forEach(field => {
            const value = orderForm.custom_fields[field.id];
            if (value) customFieldsText += `*${field.label}:* ${value}\n`;
          });
        }
        
        const whatsappMessage = `*#${orderId.slice(0, 8).toUpperCase()}*

*${quantity}x* ${product.name} - ${currentVariation.name} – Rs ${currentVariation.price.toLocaleString()}

Subtotal: Rs ${subtotal.toLocaleString()}
Store Credits Used: Rs ${creditsToUse.toLocaleString()}
*Total: Rs 0 (Paid with Credits)*

Customer: *${orderForm.customer_name}* ${orderForm.customer_phone} ${orderForm.customer_email || ''}
${customFieldsText ? `\n${customFieldsText}` : ''}${orderForm.remark ? `Notes: ${orderForm.remark}\n` : ''}
Payment: *Store Credits* (Full Payment)

See invoice: ${invoiceUrl}`;

        const encodedMessage = encodeURIComponent(whatsappMessage);
        const whatsappNumber = '9779743488871';
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
        
        setIsOrderDialogOpen(false);
        toast.success('Order placed with store credits! Opening WhatsApp...');
        
        setTimeout(() => {
          window.location.href = whatsappUrl;
        }, 500);
        return;
      }
      
      // Redirect to our custom payment page with all required data
      // Build custom fields string for URL params
      let customFieldsStr = '';
      if (product.custom_fields && product.custom_fields.length > 0) {
        const fieldsData = product.custom_fields.map(field => {
          const value = orderForm.custom_fields[field.id] || '';
          return `${field.label}:${value}`;
        }).filter(f => f.split(':')[1]); // Only include fields with values
        customFieldsStr = fieldsData.join('||');
      }
      
      const params = new URLSearchParams({
        total: total.toFixed(2),
        items: `${product.name} (${currentVariation.name} x${quantity})`,
        name: orderForm.customer_name,
        phone: orderForm.customer_phone,
        email: orderForm.customer_email || '',
        product: product.name,
        variation: currentVariation.name,
        price: currentVariation.price.toString(),
        qty: quantity.toString(),
        customFields: customFieldsStr,
        remark: orderForm.remark || ''
      });
      
      // Send Trustpilot invitation if email was provided
      if (orderForm.customer_email) {
        sendTrustpilotInvitation({
          email: orderForm.customer_email,
          name: orderForm.customer_name,
          orderId: orderId,
          productSlug: product.slug || product.id,
          productImage: product.image_url,
          productName: `${product.name} - ${currentVariation.name}`,
        });
      }
      
      // Navigate to payment page
      navigate(`/payment/${orderId}?${params.toString()}`);
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setIsOrderDialogOpen(false);
    setOrderForm({ customer_name: '', customer_phone: '', customer_email: '', custom_fields: {}, remark: '' });
    setPromoCode('');
    setPromoDiscount(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-14 md:pt-24 pb-20 md:pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
            <div className="aspect-square skeleton rounded-lg"></div>
            <div className="space-y-4 lg:space-y-6"><div className="h-8 lg:h-10 w-3/4 skeleton rounded"></div><div className="h-6 w-1/4 skeleton rounded"></div><div className="h-32 lg:h-40 skeleton rounded"></div></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-14 md:pt-24 pb-20 md:pb-8 min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-xl lg:text-2xl font-heading text-white mb-4">Product Not Found</h1>
            <Link to="/"><Button variant="outline" className="border-gold-500 text-gold-500">Go Back Home</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);

  return (
    <div className="min-h-screen bg-black">
      <SEO {...getProductSEO(product)} />
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
          <Link to="/" className="inline-flex items-center text-white/60 hover:text-gold-500 transition-colors text-sm" data-testid="back-to-home">
            <ArrowLeft className="h-4 w-4 mr-2" />{t('backToProducts')}
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 lg:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-10">
            <div className="lg:sticky lg:top-24 lg:self-start space-y-4" data-testid="product-image-container">
              <div className="aspect-square bg-card rounded-lg overflow-hidden border border-white/10 animate-fade-in relative">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                
                {/* Wishlist button on image */}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    inWishlist ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-red-500/20'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
                </button>
              </div>
              
              {/* Sidebar Ad */}
              <AdBanner position="product_sidebar" className="hidden lg:block rounded-lg" />
            </div>

            <div className="space-y-4 lg:space-y-6 animate-slide-up" data-testid="product-details">
              {/* Flash Sale Timer */}
              {isFlashSale && (
                <FlashSaleTimer 
                  endTime={product.flash_sale_end} 
                  label={product.flash_sale_label || 'FLASH SALE'} 
                />
              )}
              
              <div>
                {product.is_sold_out && <Badge variant="destructive" className="mb-2">{t('soldOut')}</Badge>}
                <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white uppercase tracking-tight">{product.name}</h1>
                
                {/* Stock Indicator */}
                {!product.is_sold_out && (
                  <div className="mt-2">
                    {isLowStock ? (
                      <div className="flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('onlyLeft', { count: stockQuantity })}</span>
                      </div>
                    ) : hasLimitedStock ? (
                      <span className="text-green-500 text-sm">{t('inStock')}</span>
                    ) : (
                      <span className="text-green-500 text-sm">{t('inStock')}</span>
                    )}
                  </div>
                )}
              </div>

              {product.variations?.length > 0 && (
                <div className="space-y-3" data-testid="variations-section">
                  <h3 className="font-heading text-sm lg:text-base font-semibold text-white uppercase tracking-wider">{t('selectPlan')}</h3>
                  <RadioGroup value={selectedVariation} onValueChange={setSelectedVariation} className="space-y-2">
                    {product.variations.map((variation) => {
                      const varStock = variation.stock ?? 0;
                      const isUnlimited = varStock === 0;
                      const isOutOfStock = !isUnlimited && varStock <= 0;
                      const isLowVariationStock = !isUnlimited && varStock > 0 && varStock <= 5;
                      
                      return (
                        <div key={variation.id} className="relative">
                          <RadioGroupItem 
                            value={variation.id} 
                            id={variation.id} 
                            className="peer sr-only" 
                            data-testid={`variation-${variation.id}`}
                            disabled={isOutOfStock}
                          />
                          <Label 
                            htmlFor={variation.id} 
                            className={`flex items-center justify-between p-3 bg-card border border-white/10 rounded-lg transition-all duration-300 peer-data-[state=checked]:border-gold-500 peer-data-[state=checked]:bg-gold-500/10 hover:border-white/30 hover:scale-[1.01] ${
                              isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selectedVariation === variation.id ? 'border-gold-500' : 'border-white/30'}`}>
                                {selectedVariation === variation.id && <Check className="h-2.5 w-2.5 text-gold-500" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-heading font-semibold text-white text-sm">{variation.name}</span>
                                {/* Stock indicator per variation */}
                                {isOutOfStock ? (
                                  <span className="text-xs text-red-400">Out of Stock</span>
                                ) : isLowVariationStock ? (
                                  <span className="text-xs text-amber-400">Only {varStock} left!</span>
                                ) : !isUnlimited ? (
                                  <span className="text-xs text-green-400">{varStock} in stock</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-gold-500 text-sm lg:text-base">Rs {variation.price.toLocaleString()}</span>
                              {variation.original_price && variation.original_price > variation.price && <span className="ml-2 text-white/40 line-through text-xs">Rs {variation.original_price.toLocaleString()}</span>}
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="space-y-2">
                <h3 className="font-heading text-sm lg:text-base font-semibold text-white uppercase tracking-wider">{t('quantity')}</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white"
                    data-testid="qty-decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-white font-bold text-xl w-12 text-center" data-testid="qty-value">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={hasLimitedStock && quantity >= stockQuantity}
                    className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white"
                    data-testid="qty-increase"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-card/50 border border-white/10 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between"><span className="text-white/60 text-sm">Selected Plan:</span><span className="font-heading font-semibold text-white text-sm">{currentVariation?.name}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/60 text-sm">{t('quantity')}:</span><span className="font-heading font-semibold text-white text-sm">{quantity}</span></div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-white/60 text-sm">{t('total')}:</span>
                  <div>
                    <span className="font-bold text-gold-500 text-xl">Rs {subtotal.toLocaleString()}</span>
                    {currentVariation?.original_price && currentVariation.original_price > currentVariation.price && <span className="ml-2 text-white/40 line-through text-sm">Rs {(currentVariation.original_price * quantity).toLocaleString()}</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {product.whatsapp_only ? (
                  // WhatsApp Contact Button
                  <Button 
                    onClick={() => {
                      const message = product.whatsapp_message 
                        ? product.whatsapp_message.replace('{product_name}', product.name)
                        : `Hi, I'm interested in ${product.name}${currentVariation ? ` (${currentVariation.name})` : ''}. Can you provide more details?`;
                      const whatsappNumber = '9779743488871'; // From PRD
                      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                    disabled={product.is_sold_out}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-heading text-base uppercase tracking-wider py-5 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/20"
                    data-testid="whatsapp-btn"
                  >
                    <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Message on WhatsApp
                  </Button>
                ) : (
                  // Regular Order Buttons
                  <>
                    <Button onClick={() => setIsOrderDialogOpen(true)} disabled={product.is_sold_out} className="w-full bg-gold-500 hover:bg-gold-600 text-black font-heading text-base uppercase tracking-wider py-5 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-gold-500/20" data-testid="order-now-btn">
                      <ShoppingCart className="mr-2 h-5 w-5" />{t('orderNow')}
                    </Button>
                    
                    <Button onClick={handleAddToCart} disabled={product.is_sold_out} variant="outline" className="w-full border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black font-heading text-base uppercase tracking-wider py-5 rounded-lg transition-all duration-300" data-testid="add-to-cart-btn">
                      <Plus className="mr-2 h-5 w-5" />{t('addToCart')}
                    </Button>
                  </>
                )}
                
                <p className="text-white/50 text-xs text-center flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3" />Please read the description below before ordering.</p>
                <p className="text-white/40 text-xs text-center">By ordering, you agree to our <Link to="/terms" className="text-gold-500 hover:underline">Terms & Conditions</Link></p>
              </div>

              <div className="prose prose-invert max-w-none pt-2 border-t border-white/10">
                <h3 className="font-heading text-sm lg:text-base font-semibold text-white uppercase tracking-wider mb-2">{t('description')}</h3>
                <div className="rich-text-content text-white/80 leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: product.description }} />
              </div>

              <div className="text-center text-white/40 text-xs pt-2"><p>Questions? Contact us via our social media</p></div>
            </div>
          </div>
          
          {/* Customers Also Bought Section */}
          {relatedProducts.length > 0 && (
            <div className="mt-12 pt-8 border-t border-white/10">
              <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wider mb-6">{t('customersAlsoBought')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {relatedProducts.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Dialog open={isOrderDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="bg-card border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto sm:mx-auto">
          <DialogHeader><DialogTitle className="font-heading text-xl uppercase">{t('placeYourOrder')}</DialogTitle></DialogHeader>

          <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="bg-black/50 rounded-lg p-3 flex items-center gap-3">
                <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded object-cover" />
                <div className="flex-1 min-w-0"><p className="text-white font-semibold text-sm truncate">{product.name}</p><p className="text-white/60 text-xs">{currentVariation?.name} × {quantity}</p></div>
              </div>

              <div className="space-y-3">
                {customer ? (
                  <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                    <p className="text-gray-400 text-xs mb-2">Logged in as:</p>
                    <p className="text-white font-medium">{orderForm.customer_name}</p>
                    <p className="text-gray-300 text-sm">{orderForm.customer_phone}</p>
                    {orderForm.customer_email && <p className="text-gray-300 text-sm">{orderForm.customer_email}</p>}
                  </div>
                ) : (
                  <>
                    <div><Label className="text-white/80 text-sm">{t('fullName')} *</Label><Input value={orderForm.customer_name} onChange={(e) => setOrderForm({...orderForm, customer_name: e.target.value})} className="bg-black border-white/20 mt-1 text-base" placeholder="Enter your full name" required data-testid="order-name-input" /></div>
                    <div><Label className="text-white/80 text-sm">{t('phoneNumber')} *</Label><Input value={orderForm.customer_phone} onChange={(e) => setOrderForm({...orderForm, customer_phone: e.target.value})} className="bg-black border-white/20 mt-1 text-base" placeholder="9801234567" required data-testid="order-phone-input" /></div>
                    <div><Label className="text-white/80 text-sm">{t('email')} *</Label><Input type="email" value={orderForm.customer_email} onChange={(e) => setOrderForm({...orderForm, customer_email: e.target.value})} className="bg-black border-white/20 mt-1 text-base" placeholder="your@email.com" required data-testid="order-email-input" /></div>
                  </>
                )}

                {product.custom_fields && product.custom_fields.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-3">
                    {product.custom_fields.map((field) => (
                      <div key={field.id}><Label className="text-white/80 text-sm">{field.label} {field.required && '*'}</Label><Input value={orderForm.custom_fields[field.id] || ''} onChange={(e) => setOrderForm({...orderForm, custom_fields: {...orderForm.custom_fields, [field.id]: e.target.value}})} className="bg-black border-white/20 mt-1 text-base" placeholder={field.placeholder} required={field.required} /></div>
                    ))}
                  </div>
                )}

                <div><Label className="text-white/80 text-sm">{t('notes')}</Label><Textarea value={orderForm.remark} onChange={(e) => setOrderForm({...orderForm, remark: e.target.value})} className="bg-black border-white/20 mt-1 text-base min-h-[60px]" placeholder="Any special instructions..." /></div>
              </div>

              {/* Store Credits Section */}
              {creditSettings.is_enabled && (
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-white/80 text-sm flex items-center gap-2">
                      <Coins className="w-4 h-4 text-green-500" /> Use Store Credits
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3 text-gray-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-800 border-zinc-700 text-white max-w-xs">
                            <p className="text-sm">
                              <span className="font-semibold text-amber-500">How to earn credits:</span><br/>
                              Purchase products and get {creditSettings.cashback_percentage}% cashback as store credits when your order is completed!
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                  </div>
                  
                  {customer ? (
                    <div className="bg-zinc-800/50 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm">Available: <span className="text-green-500 font-semibold">Rs {creditBalance.toLocaleString()}</span></p>
                        </div>
                        <Switch
                          checked={useCredits}
                          onCheckedChange={(checked) => {
                            setUseCredits(checked);
                            if (!checked) setCustomCreditAmount('');
                          }}
                          disabled={creditBalance <= 0}
                          data-testid="use-credits-switch-product"
                        />
                      </div>
                      
                      {useCredits && creditBalance > 0 && (
                        <div className="space-y-2 pt-2 border-t border-zinc-700">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={Math.min(creditBalance, totalBeforeCredits)}
                              step="1"
                              placeholder={`Max: Rs ${Math.min(creditBalance, totalBeforeCredits).toFixed(0)}`}
                              value={customCreditAmount}
                              onChange={(e) => setCustomCreditAmount(e.target.value)}
                              className="bg-black border-zinc-700 flex-1 text-sm"
                              data-testid="custom-credit-input-product"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setCustomCreditAmount(Math.min(creditBalance, totalBeforeCredits).toFixed(0))}
                              className="border-green-500 text-green-500 hover:bg-green-500 hover:text-black text-xs whitespace-nowrap"
                            >
                              Use All
                            </Button>
                          </div>
                          <p className="text-green-400 text-xs">
                            Using: Rs {creditsToUse.toFixed(2)} credits
                          </p>
                        </div>
                      )}
                      
                      {creditBalance <= 0 && (
                        <p className="text-gray-500 text-xs">No credits available. Earn credits by making purchases!</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-gray-400 text-sm mb-2">Want to use store credits?</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLoginDialog(true)}
                        className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black"
                        data-testid="login-for-credits-btn-product"
                      >
                        Login to use credits
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Promo Code Section */}
              <div className="pt-3 border-t border-white/10">
                <Label className="text-white/80 text-sm flex items-center gap-2 mb-2">
                  <Ticket className="h-4 w-4 text-gold-500" />
                  {t('promoCode')}
                </Label>
                {promoDiscount ? (
                  <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-green-400 font-semibold">{promoDiscount.code}</span>
                      <span className="text-green-400/60 text-sm ml-2">-Rs {promoDiscount.discount_amount}</span>
                    </div>
                    <button type="button" onClick={handleRemovePromo} className="text-white/40 hover:text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="bg-black border-white/20 uppercase font-mono flex-1"
                      placeholder="Enter code"
                    />
                    <Button 
                      type="button" 
                      onClick={handleApplyPromo} 
                      disabled={isValidatingPromo || !promoCode.trim()}
                      variant="outline" 
                      className="border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black"
                    >
                      {isValidatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : t('apply')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-black/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">{t('subtotal')} ({quantity}x)</span>
                  <span className="text-white">Rs {subtotal.toFixed(2)}</span>
                </div>
                
                {promoDiscount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-400">{t('discount')} ({promoDiscount.code})</span>
                    <span className="text-green-400">-Rs {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                {serviceCharge > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">{t('serviceCharge')}</span>
                    <span className="text-white">Rs {serviceCharge.toFixed(2)}</span>
                  </div>
                )}
                
                {taxPercentage > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">{pricingSettings.tax_label || 'Tax'} ({taxPercentage}%)</span>
                    <span className="text-white">Rs {taxAmount.toFixed(2)}</span>
                  </div>
                )}

                {creditsToUse > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-400 flex items-center gap-1"><Coins className="w-3 h-3" /> Credits Used</span>
                    <span className="text-green-400">-Rs {creditsToUse.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                  <span className="text-white font-semibold">{t('total')}</span>
                  <span className="text-gold-500 font-bold text-lg">Rs {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={handleCloseDialog} className="flex-1">{t('cancel')}</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-gold-500 hover:bg-gold-600 text-black">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : t('continueToPayment')}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Login Dialog for Credits */}
      <CustomerAuth 
        isOpen={showLoginDialog} 
        onClose={() => setShowLoginDialog(false)} 
        onSuccess={() => {
          setShowLoginDialog(false);
          window.location.reload();
        }}
      />

      <Footer />
    </div>
  );
}
