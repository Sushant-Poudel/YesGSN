import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Trash2, Loader2, Ticket, X, Coins, Info } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useCart } from '@/components/Cart';
import { useCustomer } from '@/components/CustomerAccount';
import { useLanguage } from '@/components/Language';
import { ordersAPI, promoCodesAPI, settingsAPI, creditsAPI } from '@/lib/api';
import CustomerAuth from '@/components/CustomerAuth';

export default function CheckoutPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { cart, removeFromCart, clearCart, getCartTotal } = useCart();
  const { customer } = useCustomer();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', remark: '' });
  
  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  
  // Pricing settings
  const [pricingSettings, setPricingSettings] = useState({ service_charge: 0, tax_percentage: 0, tax_label: 'Tax' });

  // Store Credits
  const [creditBalance, setCreditBalance] = useState(0);
  const [useCredits, setUseCredits] = useState(false);
  const [customCreditAmount, setCustomCreditAmount] = useState('');
  const [creditSettings, setCreditSettings] = useState({ cashback_percentage: 5, is_enabled: true, max_credit_per_order: 0, max_credit_percentage: 0 });
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [creditValidation, setCreditValidation] = useState({ can_use_credits: true, max_usable: 0, unlimited: true });

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
    const fetchSettings = async () => {
      try {
        const [pricingRes, creditRes] = await Promise.all([
          settingsAPI.get(),
          creditsAPI.getSettings()
        ]);
        setPricingSettings(pricingRes.data);
        setCreditSettings(creditRes.data);
      } catch (e) {
        console.log('Using default pricing');
      }
    };
    fetchSettings();
  }, []);

  // Validate credit usage when cart changes
  useEffect(() => {
    const validateCredits = async () => {
      if (!creditSettings.is_enabled || cart.length === 0) {
        setCreditValidation({ can_use_credits: false, max_usable: 0, unlimited: false });
        return;
      }
      
      try {
        const productIds = cart.map(item => item.product_id).filter(Boolean);
        const res = await creditsAPI.validateUsage({ product_ids: productIds, requested_credits: 0 });
        setCreditValidation(res.data);
      } catch (e) {
        // Default to allowing credits if validation fails
        setCreditValidation({ can_use_credits: true, max_usable: 0, unlimited: true });
      }
    };
    validateCredits();
  }, [cart, creditSettings]);

  const subtotal = getCartTotal();
  const discountAmount = promoDiscount?.discount_amount || 0;
  const afterDiscount = subtotal - discountAmount;
  const serviceCharge = parseFloat(pricingSettings.service_charge) || 0;
  const taxPercentage = parseFloat(pricingSettings.tax_percentage) || 0;
  const taxAmount = afterDiscount * (taxPercentage / 100);
  const totalBeforeCredits = afterDiscount + serviceCharge + taxAmount;
  
  // Calculate max credits user can use
  const getMaxCreditsUsable = () => {
    if (!creditValidation.can_use_credits) return 0;
    
    // Calculate the eligible portion of the cart (only products that can use credits)
    let eligibleTotal = totalBeforeCredits;
    const eligibleIds = creditValidation.eligible_product_ids || [];
    if (eligibleIds.length > 0 && eligibleIds.length < cart.length) {
      // Only some products are eligible — cap to their total
      eligibleTotal = cart
        .filter(item => eligibleIds.includes(item.product_id))
        .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    }
    
    let max = Math.min(creditBalance, eligibleTotal);
    
    // Apply max_credit_percentage limit (e.g. 20% means max Rs 20 on Rs 100 eligible total)
    const maxPct = creditSettings.max_credit_percentage || creditValidation.max_credit_percentage || 0;
    if (maxPct > 0) {
      const pctCap = Math.floor(eligibleTotal * (maxPct / 100));
      max = Math.min(max, pctCap);
    }
    
    // Apply max_credit_per_order limit if set
    const maxPerOrder = creditSettings.max_credit_per_order || 0;
    if (maxPerOrder > 0) {
      max = Math.min(max, maxPerOrder);
    }
    
    // Apply validation max_usable if set
    if (!creditValidation.unlimited && creditValidation.max_usable > 0) {
      max = Math.min(max, creditValidation.max_usable);
    }
    
    return max;
  };
  
  const maxCreditsUsable = getMaxCreditsUsable();
  
  // Calculate credits to use - either custom amount or max if use all
  const getCreditsToUse = () => {
    if (!useCredits || !customer || !creditValidation.can_use_credits) return 0;
    if (customCreditAmount !== '') {
      const customAmount = parseFloat(customCreditAmount) || 0;
      return Math.min(customAmount, maxCreditsUsable);
    }
    return maxCreditsUsable;
  };
  const creditsToUse = getCreditsToUse();
  const total = Math.ceil(Math.max(0, totalBeforeCredits - creditsToUse) / 10) * 10;

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
    if (isSubmitting || cart.length === 0) return;
    if (!orderForm.customer_name || !orderForm.customer_phone || !orderForm.customer_email) {
      toast.error('Please fill in your name, phone number, and email');
      return;
    }

    setIsSubmitting(true);
    try {
      let fullRemark = '';
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
        items: cart.map(item => ({
          name: item.product.name,
          price: item.variation.price,
          quantity: item.quantity,
          variation: item.variation.name,
          product_id: item.product.id,
          variation_id: item.variation.id
        })),
        total_amount: total,
        credits_used: creditsToUse,
        promo_code: promoDiscount?.code || null,
        remark: fullRemark.trim() || null
      };

      const res = await ordersAPI.create(orderPayload);
      const orderId = res.data.order_id;
      
      // If total is 0 (fully paid with credits), redirect to WhatsApp directly
      if (total === 0 && creditsToUse > 0) {
        const itemsText = cart.map(item => `${item.quantity}x ${item.product.name} (${item.variation.name})`).join('\n');
        const siteUrl = window.location.origin;
        const invoiceUrl = `${siteUrl}/invoice/${orderId}`;
        
        const whatsappMessage = `*#${orderId.slice(0, 8).toUpperCase()}*

${itemsText}

Subtotal: Rs ${subtotal.toLocaleString()}
Store Credits Used: Rs ${creditsToUse.toLocaleString()}
*Total: Rs 0 (Paid with Credits)*

Customer: *${orderForm.customer_name}* ${orderForm.customer_phone} ${orderForm.customer_email || ''}

Payment: *Store Credits* (Full Payment)

See invoice: ${invoiceUrl}`;

        const encodedMessage = encodeURIComponent(whatsappMessage);
        const whatsappNumber = '9779743488871';
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
        
        clearCart();
        toast.success('Order placed with store credits! Opening WhatsApp...');
        
        setTimeout(() => {
          window.location.href = whatsappUrl;
        }, 500);
        return;
      }
      
      // Get first item details for payment page
      const firstItem = cart[0];
      
      // Redirect to our custom payment page with all required data
      const params = new URLSearchParams({
        total: total.toFixed(2),
        items: cart.map(item => `${item.product.name} (${item.variation.name} x${item.quantity})`).join(', '),
        name: orderForm.customer_name,
        phone: orderForm.customer_phone,
        email: orderForm.customer_email || '',
        product: firstItem?.product?.name || 'Order',
        variation: firstItem?.variation?.name || '',
        price: firstItem?.variation?.price?.toString() || '0',
        qty: cart.reduce((sum, item) => sum + item.quantity, 0).toString(),
        credits_used: creditsToUse.toString()
      });
      
      clearCart();
      navigate(`/payment/${res.data.order_id}?${params.toString()}`);
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPayment = () => {
    // Removed - we now redirect to /payment/:orderId
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-14 md:pt-24 pb-20 md:pb-8 max-w-2xl mx-auto px-4 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">{t('cartEmpty')}</h1>
          <p className="text-gray-400 mb-6">{t('addProductsToStart')}</p>
          <Link to="/">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black">{t('browseProducts')}</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/" className="inline-flex items-center text-gray-400 hover:text-amber-500 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />{t('backToProducts')}
          </Link>
          
          <h1 className="text-2xl font-bold text-white mb-6">Checkout ({cart.length} items)</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h2 className="text-white font-semibold mb-4">Your Items</h2>
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={`${item.product.id}-${item.variation.id}`} className="flex gap-3 p-3 bg-black/50 rounded-lg">
                      <img src={item.product.image_url} alt={item.product.name} className="w-16 h-16 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{item.product.name}</p>
                        <p className="text-gray-400 text-sm">{item.variation.name} × {item.quantity}</p>
                        <p className="text-amber-500 font-semibold">Rs {(item.variation.price * item.quantity).toLocaleString()}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id, item.variation.id)} className="text-gray-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Order Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmitOrder} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 sticky top-24">
                <h2 className="text-white font-semibold">Your Details</h2>
                
                {customer ? (
                  <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                    <p className="text-gray-400 text-xs mb-2">Logged in as:</p>
                    <p className="text-white font-medium">{orderForm.customer_name}</p>
                    <p className="text-gray-300 text-sm">{orderForm.customer_phone}</p>
                    {orderForm.customer_email && <p className="text-gray-300 text-sm">{orderForm.customer_email}</p>}
                  </div>
                ) : (
                  <>
                    <div>
                      <Label className="text-gray-400 text-sm">{t('fullName')} *</Label>
                      <Input value={orderForm.customer_name} onChange={e => setOrderForm({...orderForm, customer_name: e.target.value})} className="bg-black border-zinc-700 mt-1" required data-testid="checkout-name-input" />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-sm">{t('phoneNumber')} *</Label>
                      <Input value={orderForm.customer_phone} onChange={e => setOrderForm({...orderForm, customer_phone: e.target.value})} className="bg-black border-zinc-700 mt-1" required data-testid="checkout-phone-input" />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-sm">{t('email')} *</Label>
                      <Input type="email" value={orderForm.customer_email} onChange={e => setOrderForm({...orderForm, customer_email: e.target.value})} className="bg-black border-zinc-700 mt-1" required data-testid="checkout-email-input" />
                    </div>
                  </>
                )}
                <div>
                  <Label className="text-gray-400 text-sm">{t('notes')}</Label>
                  <Textarea value={orderForm.remark} onChange={e => setOrderForm({...orderForm, remark: e.target.value})} className="bg-black border-zinc-700 mt-1" rows={2} />
                </div>
                
                {/* Store Credits Section */}
                {creditSettings.is_enabled && (
                  <div className="pt-3 border-t border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-400 text-sm flex items-center gap-2">
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
                            {!creditValidation.can_use_credits && creditBalance > 0 && (
                              <p className="text-amber-500 text-xs mt-1">Credits cannot be used on these products</p>
                            )}
                            {creditSettings.max_credit_per_order > 0 && creditValidation.can_use_credits && (
                              <p className="text-zinc-400 text-xs mt-1">Max per order: Rs {creditSettings.max_credit_per_order}</p>
                            )}
                          </div>
                          <Switch
                            checked={useCredits}
                            onCheckedChange={(checked) => {
                              setUseCredits(checked);
                              if (!checked) setCustomCreditAmount('');
                            }}
                            disabled={creditBalance <= 0 || !creditValidation.can_use_credits}
                            data-testid="use-credits-switch"
                          />
                        </div>
                        
                        {useCredits && creditBalance > 0 && creditValidation.can_use_credits && (
                          <div className="space-y-2 pt-2 border-t border-zinc-700">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max={maxCreditsUsable}
                                step="1"
                                placeholder={`Max: Rs ${maxCreditsUsable.toFixed(0)}`}
                                value={customCreditAmount}
                                onChange={(e) => setCustomCreditAmount(e.target.value)}
                                className="bg-black border-zinc-700 flex-1"
                                data-testid="custom-credit-input"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCustomCreditAmount(maxCreditsUsable.toFixed(0))}
                                className="border-green-500 text-green-500 hover:bg-green-500 hover:text-black text-xs whitespace-nowrap"
                              >
                                Use Max
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
                          data-testid="login-for-credits-btn"
                        >
                          Login to use credits
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Promo Code */}
                <div className="pt-3 border-t border-zinc-800">
                  <Label className="text-gray-400 text-sm flex items-center gap-2 mb-2">
                    <Ticket className="w-4 h-4 text-amber-500" />{t('promoCode')}
                  </Label>
                  {promoDiscount ? (
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                      <span className="text-green-400 font-semibold">{promoDiscount.code} <span className="font-normal text-sm">-Rs {promoDiscount.discount_amount}</span></span>
                      <button type="button" onClick={handleRemovePromo} className="text-gray-400 hover:text-red-400"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} className="bg-black border-zinc-700 uppercase" placeholder="Code" />
                      <Button type="button" onClick={handleApplyPromo} disabled={isValidatingPromo} variant="outline" className="border-amber-500 text-amber-500">
                        {isValidatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : t('apply')}
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Price Summary */}
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-400">{t('subtotal')}</span><span className="text-white">Rs {subtotal.toLocaleString()}</span></div>
                  {promoDiscount && <div className="flex justify-between text-sm"><span className="text-green-400">{t('discount')}</span><span className="text-green-400">-Rs {discountAmount}</span></div>}
                  {serviceCharge > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">{t('serviceCharge')}</span><span className="text-white">Rs {serviceCharge}</span></div>}
                  {taxPercentage > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">{pricingSettings.tax_label} ({taxPercentage}%)</span><span className="text-white">Rs {taxAmount.toFixed(2)}</span></div>}
                  {creditsToUse > 0 && <div className="flex justify-between text-sm"><span className="text-green-400 flex items-center gap-1"><Coins className="w-3 h-3" /> Credits Used</span><span className="text-green-400">-Rs {creditsToUse.toFixed(2)}</span></div>}
                  <div className="flex justify-between pt-2 border-t border-zinc-800"><span className="text-white font-semibold">{t('total')}</span><span className="text-amber-500 font-bold text-lg">Rs {total.toFixed(2)}</span></div>
                </div>
                
                <Button type="submit" disabled={isSubmitting} className="w-full bg-amber-500 hover:bg-amber-600 text-black py-6">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><ShoppingBag className="w-4 h-4 mr-2" />{t('proceedToCheckout')}</>}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* Login Dialog for Credits */}
      <CustomerAuth 
        isOpen={showLoginDialog} 
        onClose={() => setShowLoginDialog(false)} 
        onSuccess={() => {
          setShowLoginDialog(false);
          // Refresh page to get updated customer data
          window.location.reload();
        }}
      />
    </div>
  );
}
