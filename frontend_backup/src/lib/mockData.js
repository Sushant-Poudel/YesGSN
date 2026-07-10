// Mock data for Gangbro Gaming Marketplace

export const mockProducts = [
  {
    id: '1',
    slug: 'netflix-gift-card',
    name: 'Netflix Gift Card',
    category: 'Streaming',
    description: 'Netflix Premium subscription gift cards. Instant delivery. Works worldwide.',
    image: 'https://images.pexels.com/photos/10330108/pexels-photo-10330108.jpeg?auto=compress&cs=tinysrgb&w=800',
    price: 15.99,
    originalPrice: 19.99,
    currency: 'USD',
    inStock: true,
    featured: true,
    flashSale: false,
    discount: 20,
    variations: [
      { id: 'v1', name: '1 Month', price: 15.99 },
      { id: 'v2', name: '3 Months', price: 42.99 },
      { id: 'v3', name: '6 Months', price: 79.99 },
    ],
    regions: ['US', 'UK', 'EU', 'Global']
  },
  {
    id: '2',
    slug: 'spotify-premium',
    name: 'Spotify Premium',
    category: 'Streaming',
    description: 'Spotify Premium subscription. Ad-free music streaming. Offline downloads.',
    image: 'https://images.pexels.com/photos/31884818/pexels-photo-31884818.jpeg?auto=compress&cs=tinysrgb&w=800',
    price: 9.99,
    originalPrice: 12.99,
    currency: 'USD',
    inStock: true,
    featured: true,
    flashSale: true,
    discount: 23,
    variations: [
      { id: 'v1', name: '1 Month', price: 9.99 },
      { id: 'v2', name: '3 Months', price: 27.99 },
    ],
    regions: ['US', 'UK', 'EU', 'Global']
  },
  {
    id: '3',
    slug: 'pubg-uc',
    name: 'PUBG Mobile UC',
    category: 'Gaming',
    description: 'PUBG Mobile Unknown Cash (UC). Get your UC instantly. All regions supported.',
    image: 'https://images.pexels.com/photos/14583222/pexels-photo-14583222.jpeg?auto=compress&cs=tinysrgb&w=800',
    price: 4.99,
    originalPrice: 5.99,
    currency: 'USD',
    inStock: true,
    featured: true,
    flashSale: true,
    discount: 17,
    variations: [
      { id: 'v1', name: '60 UC', price: 4.99 },
      { id: 'v2', name: '300 UC', price: 19.99 },
      { id: 'v3', name: '600 UC', price: 39.99 },
      { id: 'v4', name: '1500 UC', price: 99.99 },
    ],
    regions: ['Global']
  },
  {
    id: '4',
    slug: 'steam-wallet',
    name: 'Steam Wallet Code',
    category: 'Gaming',
    description: 'Steam Wallet codes for your gaming needs. Instant delivery. Multiple denominations.',
    image: 'https://images.pexels.com/photos/14402043/pexels-photo-14402043.jpeg?auto=compress&cs=tinysrgb&w=800',
    price: 20.00,
    originalPrice: 20.00,
    currency: 'USD',
    inStock: true,
    featured: true,
    flashSale: false,
    discount: 0,
    variations: [
      { id: 'v1', name: '$10', price: 10.00 },
      { id: 'v2', name: '$20', price: 20.00 },
      { id: 'v3', name: '$50', price: 50.00 },
      { id: 'v4', name: '$100', price: 100.00 },
    ],
    regions: ['US', 'EU', 'Asia']
  },
  {
    id: '5',
    slug: 'playstation-plus',
    name: 'PlayStation Plus',
    category: 'Gaming',
    description: 'PlayStation Plus subscription. Free monthly games. Online multiplayer access.',
    image: 'https://images.pexels.com/photos/4219885/pexels-photo-4219885.jpeg?auto=compress&cs=tinysrgb&w=800',
    price: 24.99,
    originalPrice: 29.99,
    currency: 'USD',
    inStock: true,
    featured: false,
    flashSale: false,
    discount: 17,
    variations: [
      { id: 'v1', name: '1 Month', price: 24.99 },
      { id: 'v2', name: '3 Months', price: 69.99 },
      { id: 'v3', name: '12 Months', price: 239.99 },
    ],
    regions: ['US', 'UK', 'EU']
  },
  {
    id: '6',
    slug: 'xbox-game-pass',
    name: 'Xbox Game Pass',
    category: 'Gaming',
    description: 'Xbox Game Pass Ultimate. Access to 100+ games. Cloud gaming included.',
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&auto=format&fit=crop',
    price: 14.99,
    originalPrice: 14.99,
    currency: 'USD',
    inStock: true,
    featured: false,
    flashSale: false,
    discount: 0,
    variations: [
      { id: 'v1', name: '1 Month', price: 14.99 },
      { id: 'v2', name: '3 Months', price: 42.99 },
    ],
    regions: ['US', 'UK', 'EU']
  },
  {
    id: '7',
    slug: 'free-fire-diamonds',
    name: 'Free Fire Diamonds',
    category: 'Gaming',
    description: 'Garena Free Fire Diamonds. Fast delivery. Best prices guaranteed.',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop',
    price: 9.99,
    originalPrice: 11.99,
    currency: 'USD',
    inStock: true,
    featured: true,
    flashSale: true,
    discount: 17,
    variations: [
      { id: 'v1', name: '100 Diamonds', price: 9.99 },
      { id: 'v2', name: '310 Diamonds', price: 29.99 },
      { id: 'v3', name: '520 Diamonds', price: 49.99 },
    ],
    regions: ['Global']
  },
  {
    id: '8',
    slug: 'apple-music',
    name: 'Apple Music',
    category: 'Streaming',
    description: 'Apple Music subscription. 90 million songs. Lossless audio quality.',
    image: 'https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=800&auto=format&fit=crop',
    price: 10.99,
    originalPrice: 10.99,
    currency: 'USD',
    inStock: true,
    featured: false,
    flashSale: false,
    discount: 0,
    variations: [
      { id: 'v1', name: '1 Month', price: 10.99 },
      { id: 'v2', name: '3 Months', price: 31.99 },
    ],
    regions: ['US', 'UK', 'EU', 'Global']
  }
];

export const mockReviews = [
  {
    id: '1',
    customerName: 'Alex Johnson',
    rating: 5,
    comment: 'Super fast delivery! Got my PUBG UC within minutes. Highly recommended!',
    product: 'PUBG Mobile UC',
    date: '2026-02-05',
    verified: true
  },
  {
    id: '2',
    customerName: 'Sarah Miller',
    rating: 5,
    comment: 'Best prices for Netflix gift cards. Always shop here!',
    product: 'Netflix Gift Card',
    date: '2026-02-04',
    verified: true
  },
  {
    id: '3',
    customerName: 'Mike Chen',
    rating: 5,
    comment: 'Excellent service. Steam codes work perfectly. Will buy again.',
    product: 'Steam Wallet Code',
    date: '2026-02-03',
    verified: true
  },
  {
    id: '4',
    customerName: 'Emily Davis',
    rating: 4,
    comment: 'Great prices and fast delivery. Customer support is responsive too.',
    product: 'Spotify Premium',
    date: '2026-02-02',
    verified: true
  },
  {
    id: '5',
    customerName: 'David Wilson',
    rating: 5,
    comment: 'Been using this site for months. Never had any issues. Trustworthy!',
    product: 'PlayStation Plus',
    date: '2026-02-01',
    verified: true
  },
  {
    id: '6',
    customerName: 'Lisa Anderson',
    rating: 5,
    comment: 'Amazing deals! Saved so much money on my Free Fire diamonds.',
    product: 'Free Fire Diamonds',
    date: '2026-01-31',
    verified: true
  }
];

export const mockCategories = [
  { id: '1', name: 'Gaming', slug: 'gaming', icon: 'gamepad' },
  { id: '2', name: 'Streaming', slug: 'streaming', icon: 'tv' },
  { id: '3', name: 'Gift Cards', slug: 'gift-cards', icon: 'gift' },
  { id: '4', name: 'Software', slug: 'software', icon: 'code' }
];

export const mockBlogPosts = [
  {
    id: '1',
    slug: 'how-to-get-free-uc-pubg',
    title: 'How to Get Free UC in PUBG Mobile',
    excerpt: 'Learn legitimate ways to earn free UC in PUBG Mobile without spending money.',
    content: 'Full content here...',
    author: 'Admin',
    date: '2026-02-01',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop'
  },
  {
    id: '2',
    slug: 'best-netflix-shows-2026',
    title: 'Best Netflix Shows to Watch in 2026',
    excerpt: 'Our curated list of must-watch shows on Netflix this year.',
    content: 'Full content here...',
    author: 'Admin',
    date: '2026-01-28',
    image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop'
  }
];

export const mockFAQs = [
  {
    id: '1',
    question: 'How fast is the delivery?',
    answer: 'Most orders are delivered instantly or within 5-30 minutes. Some products may take up to 24 hours during high demand.'
  },
  {
    id: '2',
    question: 'Are the products genuine?',
    answer: 'Yes! All our products are 100% genuine and sourced directly from authorized distributors.'
  },
  {
    id: '3',
    question: 'What payment methods do you accept?',
    answer: 'We accept credit/debit cards, PayPal, cryptocurrency, and various local payment methods.'
  },
  {
    id: '4',
    question: 'Can I get a refund?',
    answer: 'Refunds are available if the product code doesn\'t work or if there\'s an issue with your order. Please contact support within 24 hours.'
  },
  {
    id: '5',
    question: 'Do you offer customer support?',
    answer: 'Yes! Our customer support team is available 24/7 via WhatsApp, email, and live chat.'
  }
];

export const mockLivePurchases = [
  { id: '1', product: 'PUBG UC 600', location: 'USA', time: '2 min ago' },
  { id: '2', product: 'Netflix Gift Card', location: 'UK', time: '5 min ago' },
  { id: '3', product: 'Steam $20', location: 'Germany', time: '8 min ago' },
  { id: '4', product: 'Spotify Premium', location: 'Canada', time: '12 min ago' },
  { id: '5', product: 'Free Fire Diamonds', location: 'India', time: '15 min ago' },
  { id: '6', product: 'PlayStation Plus', location: 'Australia', time: '18 min ago' }
];

export const mockPaymentMethods = [
  { id: '1', name: 'Credit Card', icon: 'credit-card', enabled: true },
  { id: '2', name: 'PayPal', icon: 'paypal', enabled: true },
  { id: '3', name: 'Cryptocurrency', icon: 'bitcoin', enabled: true },
  { id: '4', name: 'Bank Transfer', icon: 'bank', enabled: false }
];

export const mockSocialLinks = {
  whatsapp: 'https://wa.me/9779743488871',
  facebook: 'https://facebook.com/gangbro',
  instagram: 'https://instagram.com/gangbro',
  tiktok: 'https://tiktok.com/@gangbro',
  twitter: 'https://twitter.com/gangbro'
};

export const mockNotificationBar = {
  enabled: true,
  message: '🔥 Flash Sale! Up to 30% OFF on all gaming products. Limited time offer!',
  link: '/products?category=gaming'
};

export const mockTrustpilot = {
  rating: 4.8,
  totalReviews: 1247,
  link: 'https://www.trustpilot.com/review/gangbro.com'
};