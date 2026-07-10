import { useEffect } from 'react';

const SITE_URL = 'https://gameshopnepal.com';
const SITE_NAME = 'GameShop Nepal';
const DEFAULT_IMAGE = 'https://customer-assets.emergentagent.com/job_f826d6c3-4354-45f7-8eac-b606d3ae45c3/artifacts/8kg7y2go_Staff.jpg';

function setMeta(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

function setJsonLd(schema, id = 'seo-jsonld') {
  let el = document.getElementById(id);
  if (schema) {
    if (!el) {
      el = document.createElement('script');
      el.id = id;
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);
  } else if (el) {
    el.remove();
  }
}

export default function SEO({
  title = 'GameShop Nepal | Digital Products at Best Prices',
  description = 'Buy Netflix, Spotify Premium, YouTube Premium, Amazon Prime Video subscriptions at best prices in Nepal. Instant delivery guaranteed!',
  keywords = '',
  image,
  url,
  type = 'website',
  schema = null,
}) {
  useEffect(() => {
    const t = title || 'GameShop Nepal | Digital Products at Best Prices';
    const d = description || '';
    const img = image || DEFAULT_IMAGE;
    const canonical = url || window.location.href.replace(/https?:\/\/[^/]+/, SITE_URL);

    document.title = t;
    setMeta('name', 'description', d);
    setMeta('name', 'keywords', keywords);
    setCanonical(canonical);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:title', t);
    setMeta('property', 'og:description', d);
    setMeta('property', 'og:image', img);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', t);
    setMeta('name', 'twitter:description', d);
    setMeta('name', 'twitter:image', img);
    setJsonLd(schema);
  }, [title, description, keywords, image, url, type, schema]);

  return null;
}

export const SEOConfigs = {
  home: {
    title: 'Netflix, Spotify Premium, YouTube Premium Nepal | GameShop Nepal',
    description: 'Buy Netflix, Spotify Premium, YouTube Premium, Amazon Prime Video, Disney+ Hotstar subscriptions at best prices in Nepal. Instant delivery guaranteed!',
    keywords: 'Netflix Nepal, Spotify Premium Nepal, YouTube Premium Nepal, Prime Video Nepal, Netflix subscription price Nepal, streaming services Nepal, OTT platforms Nepal, digital subscription Kathmandu',
  },
  about: {
    title: 'About Us - Trusted Digital Products Store | GameShop Nepal',
    description: "GameShop Nepal — Nepal's most trusted digital products store. Buy Netflix, Spotify, YouTube Premium with instant delivery. 100% genuine products.",
    keywords: 'GameShop Nepal about, trusted digital store Nepal, Netflix seller Nepal',
  },
  faq: {
    title: 'FAQ - How to Buy Netflix, Spotify in Nepal? | GameShop Nepal',
    description: 'How to buy Netflix, Spotify Premium, YouTube Premium in Nepal? Payment methods, delivery time, all answers here.',
    keywords: 'how to buy Netflix Nepal, Spotify Premium Nepal FAQ, YouTube Premium Nepal FAQ',
  },
  blog: {
    title: 'Netflix, Spotify, YouTube Tips & Guides | GameShop Nepal Blog',
    description: 'Netflix guides, Spotify Premium features, YouTube Premium benefits. Streaming guides, gaming tips, and digital product tutorials.',
    keywords: 'Netflix guide Nepal, Spotify tips, YouTube Premium features',
  },
  reviews: {
    title: 'Customer Reviews - Trusted by Thousands | GameShop Nepal',
    description: 'Read real customer reviews of GameShop Nepal. Rated 4.7/5 by verified customers. See why thousands trust us for Netflix, Spotify, YouTube Premium subscriptions.',
    keywords: 'GameShop Nepal reviews, GameShop Nepal customer reviews, Netflix Nepal reviews',
  },
  terms: {
    title: 'Terms of Service | GameShop Nepal',
    description: 'Terms and conditions for using GameShop Nepal services.',
  },
  track: {
    title: 'Track Your Order | GameShop Nepal',
    description: 'Track your Netflix, Spotify, YouTube Premium order status in real-time.',
  },
  reseller: {
    title: 'Membership Plans - Exclusive Benefits for Members | GameShop Nepal',
    description: 'Join GameShop Nepal Membership. Get exclusive discounts on Netflix, Spotify, YouTube Premium subscriptions in Nepal.',
    keywords: 'GameShop Nepal membership, digital products membership Nepal, subscription discounts Nepal',
  },
};

export function getProductSEO(product) {
  if (!product || !product.name) return SEOConfigs.home;
  const minPrice = product.variations?.length
    ? Math.min(...product.variations.map(v => v.price))
    : 0;
  const maxPrice = product.variations?.length
    ? Math.max(...product.variations.map(v => v.price))
    : minPrice;
  const offerCount = product.variations?.length || 1;
  const desc = product.description?.replace(/<[^>]*>/g, '')?.slice(0, 160) || '';
  const shortDesc = desc.slice(0, 100);
  // Strip leading "Buy " from product name so titles don't double up to "Buy Buy ..."
  const cleanName = product.name.replace(/^Buy\s+/i, '');
  return {
    title: `Buy ${cleanName} in Nepal — Rs ${minPrice} | eSewa Khalti | GameShop Nepal`,
    description: `Buy ${cleanName} in Nepal starting Rs ${minPrice}. Pay with eSewa or Khalti. No dollar card needed. Trusted by 170+ verified customers since 2021. ${shortDesc}`,
    keywords: `${cleanName} Nepal, buy ${cleanName} Nepal, ${cleanName} price Nepal, ${cleanName} eSewa, ${cleanName} Khalti`,
    image: product.image_url,
    type: 'product',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: desc || `Buy ${product.name} at best price in Nepal`,
      image: product.image_url,
      url: `${SITE_URL}/product/${product.slug}`,
      brand: { '@type': 'Brand', name: cleanName },
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: minPrice,
        highPrice: maxPrice,
        offerCount: offerCount,
        priceCurrency: 'NPR',
        availability: product.is_sold_out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'GameShop Nepal', url: SITE_URL },
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.7',
        reviewCount: '170',
        bestRating: '5',
        worstRating: '1',
      },
    },
  };
}

export function getBlogSEO(post) {
  if (!post || !post.title) return SEOConfigs.blog;
  return {
    title: `${post.title} | GameShop Nepal Blog`,
    description: post.excerpt || post.content?.replace(/<[^>]*>/g, '').slice(0, 160),
    image: post.image_url,
    type: 'article',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      image: post.image_url,
      datePublished: post.created_at,
      author: { '@type': 'Organization', name: 'GameShop Nepal' },
      publisher: { '@type': 'Organization', name: 'GameShop Nepal', url: SITE_URL },
    },
  };
}

export { SITE_URL, SITE_NAME, DEFAULT_IMAGE };
