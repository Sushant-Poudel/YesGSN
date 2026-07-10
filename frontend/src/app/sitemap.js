export const revalidate = 0;
export const dynamic = "force-dynamic";

const SITE_URL = 'https://gameshopnepal.com';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default async function sitemap() {
  // Static pages
  const staticPages = [
    { url: `${SITE_URL}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/reviews`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/reseller-plans`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Dynamic product pages
  let productPages = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/products`);
    const products = await res.json();
    productPages = products
      .filter(p => p.is_active && p.slug)
      .map(p => ({
        url: `${SITE_URL}/product/${p.slug}`,
        lastModified: new Date(p.created_at),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
  } catch (e) {
    console.error('Sitemap: failed to fetch products', e);
  }

  // Dynamic blog pages
  let blogPages = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/blog`);
    const posts = await res.json();
    blogPages = posts
      .filter(p => p.slug)
      .map(p => ({
        url: `${SITE_URL}/blog/${p.slug}`,
        lastModified: new Date(p.created_at),
        changeFrequency: 'monthly',
        priority: 0.7,
      }));
  } catch (e) {
    console.error('Sitemap: failed to fetch blog posts', e);
  }

  return [...staticPages, ...productPages, ...blogPages];
}
