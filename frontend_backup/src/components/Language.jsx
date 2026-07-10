import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

// Translations
const translations = {
  en: {
    // Navbar
    home: 'Home',
    about: 'About',
    blog: 'Blog',
    trackOrder: 'Track Order',
    search: 'Search',
    searchProducts: 'Search products...',
    
    // Homepage
    excellentOnTrustpilot: 'EXCELLENT ON TRUSTPILOT',
    checkAllReviews: 'CHECK ALL REVIEWS',
    whatOurCustomersSay: 'WHAT OUR CUSTOMERS SAY',
    hotDeals: 'HOT DEALS',
    bestSellers: 'BEST SELLERS',
    newArrivals: 'NEW ARRIVALS',
    allProducts: 'ALL PRODUCTS',
    browseCollection: 'Browse our collection of premium digital products.',
    viewAll: 'View All',
    noProductsFound: 'No products found.',
    
    // Product Page
    selectPlan: 'Select Plan',
    orderNow: 'Order Now',
    addToCart: 'Add to Cart',
    quantity: 'Quantity',
    description: 'Description',
    soldOut: 'Sold Out',
    backToProducts: 'Back to Products',
    onlyLeft: 'Only {count} left!',
    inStock: 'In Stock',
    customersAlsoBought: 'Customers Also Bought',
    
    // Cart
    myCart: 'My Cart',
    cartEmpty: 'Your cart is empty',
    addProductsToStart: 'Add some products to get started!',
    browseProducts: 'Browse Products',
    total: 'Total',
    proceedToCheckout: 'Proceed to Checkout',
    clearAll: 'Clear All',
    
    // Order Dialog
    placeYourOrder: 'Place Your Order',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    email: 'Email (optional)',
    notes: 'Notes (optional)',
    promoCode: 'Promo Code',
    apply: 'Apply',
    subtotal: 'Subtotal',
    discount: 'Discount',
    serviceCharge: 'Service Charge',
    continueToPayment: 'Continue to Payment',
    cancel: 'Cancel',
    orderCreated: 'Order Created!',
    completePayment: 'Complete Payment',
    
    // Order Tracking
    trackYourOrder: 'Track Your Order',
    enterOrderId: 'Enter your order ID to check the status',
    track: 'Track',
    orderNotFound: 'Order not found',
    items: 'Items',
    totalAmount: 'Total Amount',
    orderDate: 'Order Date',
    delivery: 'Delivery',
    orderTimeline: 'Order Timeline',
    needHelp: 'Need help with your order?',
    
    // Footer
    yourTrustedSource: 'Your trusted source for digital products in Nepal since 2021.',
    quickLinks: 'Quick Links',
    connect: 'Connect',
    allRightsReserved: 'All rights reserved.',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    close: 'Close',
  },
  
  np: {
    // Navbar
    home: 'गृहपृष्ठ',
    about: 'हाम्रोबारे',
    blog: 'ब्लग',
    trackOrder: 'अर्डर ट्र्याक',
    search: 'खोज्नुहोस्',
    searchProducts: 'उत्पादन खोज्नुहोस्...',
    
    // Homepage
    excellentOnTrustpilot: 'ट्रस्टपाइलटमा उत्कृष्ट',
    checkAllReviews: 'सबै समीक्षाहरू हेर्नुहोस्',
    whatOurCustomersSay: 'हाम्रा ग्राहकहरू के भन्छन्',
    hotDeals: 'हट डिलहरू',
    bestSellers: 'सबैभन्दा बिक्री',
    newArrivals: 'नयाँ आगमन',
    allProducts: 'सबै उत्पादनहरू',
    browseCollection: 'हाम्रो प्रिमियम डिजिटल उत्पादनहरूको संग्रह हेर्नुहोस्।',
    viewAll: 'सबै हेर्नुहोस्',
    noProductsFound: 'कुनै उत्पादन फेला परेन।',
    
    // Product Page
    selectPlan: 'प्लान छान्नुहोस्',
    orderNow: 'अहिले अर्डर गर्नुहोस्',
    addToCart: 'कार्टमा थप्नुहोस्',
    quantity: 'मात्रा',
    description: 'विवरण',
    soldOut: 'बिक्री भयो',
    backToProducts: 'उत्पादनहरूमा फर्कनुहोस्',
    onlyLeft: 'केवल {count} बाँकी!',
    inStock: 'स्टकमा छ',
    customersAlsoBought: 'ग्राहकहरूले यो पनि किनेका छन्',
    
    // Cart
    myCart: 'मेरो कार्ट',
    cartEmpty: 'तपाईंको कार्ट खाली छ',
    addProductsToStart: 'सुरु गर्न केही उत्पादनहरू थप्नुहोस्!',
    browseProducts: 'उत्पादनहरू हेर्नुहोस्',
    total: 'जम्मा',
    proceedToCheckout: 'चेकआउटमा जानुहोस्',
    clearAll: 'सबै हटाउनुहोस्',
    
    // Order Dialog
    placeYourOrder: 'तपाईंको अर्डर दिनुहोस्',
    fullName: 'पूरा नाम',
    phoneNumber: 'फोन नम्बर',
    email: 'इमेल (वैकल्पिक)',
    notes: 'नोटहरू (वैकल्पिक)',
    promoCode: 'प्रोमो कोड',
    apply: 'लागू गर्नुहोस्',
    subtotal: 'उप-जम्मा',
    discount: 'छुट',
    serviceCharge: 'सेवा शुल्क',
    continueToPayment: 'भुक्तानी जारी राख्नुहोस्',
    cancel: 'रद्द गर्नुहोस्',
    orderCreated: 'अर्डर सिर्जना भयो!',
    completePayment: 'भुक्तानी पूरा गर्नुहोस्',
    
    // Order Tracking
    trackYourOrder: 'तपाईंको अर्डर ट्र्याक गर्नुहोस्',
    enterOrderId: 'स्थिति जाँच गर्न आफ्नो अर्डर आईडी प्रविष्ट गर्नुहोस्',
    track: 'ट्र्याक',
    orderNotFound: 'अर्डर फेला परेन',
    items: 'वस्तुहरू',
    totalAmount: 'कुल रकम',
    orderDate: 'अर्डर मिति',
    delivery: 'डेलिभरी',
    orderTimeline: 'अर्डर टाइमलाइन',
    needHelp: 'तपाईंको अर्डरमा मद्दत चाहिन्छ?',
    
    // Footer
    yourTrustedSource: '२०२१ देखि नेपालमा डिजिटल उत्पादनहरूको लागि तपाईंको विश्वसनीय स्रोत।',
    quickLinks: 'छिटो लिंकहरू',
    connect: 'जडान गर्नुहोस्',
    allRightsReserved: 'सबै अधिकार सुरक्षित।',
    
    // Common
    loading: 'लोड हुँदैछ...',
    error: 'त्रुटि',
    success: 'सफलता',
    close: 'बन्द गर्नुहोस्',
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('gsn_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('gsn_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key, params = {}) => {
    let text = translations[language]?.[key] || translations['en'][key] || key;
    
    // Replace parameters like {count} with actual values
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'np' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Language Toggle Button Component
export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  
  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors"
      data-testid="language-toggle"
    >
      {language === 'en' ? (
        <>
          <span className="text-xs">🇳🇵</span>
          <span>नेपाली</span>
        </>
      ) : (
        <>
          <span className="text-xs">🇬🇧</span>
          <span>English</span>
        </>
      )}
    </button>
  );
}

export default LanguageProvider;
