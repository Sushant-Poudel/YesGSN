/**
 * Server-side API utility for fetching data during SSR.
 * Uses fetch() directly (no axios) for Next.js server components.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const API_URL = `${BACKEND_URL}/api`;

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      next: { revalidate: 60 }, // Cache for 60 seconds
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`[SSR] Failed to fetch ${endpoint}:`, error.message);
    return null;
  }
}

export async function getProducts(categoryId = null) {
  const params = new URLSearchParams();
  if (categoryId) params.append('category_id', categoryId);
  params.append('active_only', 'true');
  return fetchAPI(`/products?${params.toString()}`);
}

export async function getProductBySlug(slug) {
  // Products are fetched by ID/slug from /products/{id}
  // The productSlug parameter IS used as the product identifier
  const allProducts = await fetchAPI('/products');
  if (!allProducts) return null;
  return allProducts.find(p => p.slug === slug || p.id === slug) || null;
}

export async function getCategories() {
  return fetchAPI('/categories');
}

export async function getReviews() {
  return fetchAPI('/reviews');
}

export async function getReviewsPublic(page = 1) {
  return fetchAPI(`/reviews/public?page=${page}&limit=20`);
}

export async function getFAQs() {
  return fetchAPI('/faqs');
}

export async function getSocialLinks() {
  return fetchAPI('/social-links');
}

export async function getPageContent(pageKey) {
  return fetchAPI(`/pages/${pageKey}`);
}

export async function getBlogPosts() {
  return fetchAPI('/blog');
}

export async function getBlogPost(slug) {
  return fetchAPI(`/blog/${slug}`);
}

export async function getNotificationBar() {
  return fetchAPI('/notification-bar');
}

export async function getPaymentMethods() {
  return fetchAPI('/payment-methods');
}

export async function getResellerPlans() {
  return fetchAPI('/reseller-plans');
}

export async function getSiteSettings() {
  return fetchAPI('/settings');
}
