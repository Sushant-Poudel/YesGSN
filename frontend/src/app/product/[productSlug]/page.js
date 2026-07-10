import { getProductBySlug, getProducts } from '@/lib/server-api';
import ProductPageClient from '@/views/ProductPage';

export async function generateMetadata({ params }) {
  const { productSlug } = await params;
  const product = await getProductBySlug(productSlug);
  if (!product) return { title: 'Product Not Found' };
  
  const minPrice = product.variations?.length
    ? Math.min(...product.variations.map(v => v.price))
    : 0;
  const cleanDesc = product.description?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 155) || '';
  const title = `Buy ${product.name} in Nepal — Rs ${minPrice} | eSewa Khalti | GameShop Nepal`;
  const description = `Buy ${product.name} in Nepal starting Rs ${minPrice}. Pay with eSewa or Khalti. No dollar card needed. Instant delivery via WhatsApp. Trusted since 2021. ${cleanDesc}`.slice(0, 160);
  return {
    title,
    description,
    keywords: `${product.name} Nepal, buy ${product.name} Nepal, ${product.name} price Nepal, ${product.name} eSewa, ${product.name} Khalti`,
    alternates: {
      canonical: `https://gameshopnepal.com/product/${productSlug}`,
    },
    openGraph: {
      title,
      description,
      images: product.image_url ? [{ url: product.image_url }] : [],
      url: `https://gameshopnepal.com/product/${productSlug}`,
      type: 'website',
      siteName: 'GameShop Nepal',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product.image_url ? [product.image_url] : [],
    },
  };
}

export default async function ProductPage({ params }) {
  const { productSlug } = await params;
  const product = await getProductBySlug(productSlug);

  // Product Schema for Google rich results
  const productSchema = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 500) || '',
    "image": product.image_url || '',
    "url": `https://gameshopnepal.com/product/${productSlug}`,
    "brand": {
      "@type": "Brand",
      "name": "GameShop Nepal"
    },
    "offers": product.variations?.length > 0 ? product.variations.map(v => ({
      "@type": "Offer",
      "name": v.name,
      "price": v.price,
      "priceCurrency": "NPR",
      "availability": v.is_sold_out ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "GameShop Nepal"
      },
      "url": `https://gameshopnepal.com/product/${productSlug}`
    })) : {
      "@type": "Offer",
      "priceCurrency": "NPR",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "GameShop Nepal"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.7",
      "reviewCount": "1000",
      "bestRating": "5"
    }
  } : null;

  return (
    <>
      {productSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
      <ProductPageClient initialProduct={product} productSlug={productSlug} />
    </>
  );
}
