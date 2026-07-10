import ProductsPage from '@/views/ProductsPage';
import { getProducts, getCategories } from '@/lib/server-api';

export const revalidate = 60;

export const metadata = {
  title: 'Buy Digital Subscriptions & Game Top-Ups in Nepal | GameShop Nepal',
  description: 'Browse 35+ digital products — Netflix, Spotify, YouTube Premium, ChatGPT Plus, PUBG UC, Mobile Legends, Valorant and more. Pay with eSewa or Khalti. Instant delivery.',
  alternates: { canonical: 'https://gameshopnepal.com/products' },
  openGraph: {
    title: 'Buy Digital Subscriptions & Game Top-Ups in Nepal | GameShop Nepal',
    description: 'Browse 35+ digital products. Pay with eSewa or Khalti. Instant delivery via WhatsApp.',
    url: 'https://gameshopnepal.com/products',
    siteName: 'GameShop Nepal',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buy Digital Subscriptions & Game Top-Ups in Nepal | GameShop Nepal',
    description: 'Browse 35+ digital products. Pay with eSewa or Khalti. Instant delivery via WhatsApp.',
  },
};

export default async function Page() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);
  return <ProductsPage initialProducts={products || []} initialCategories={categories || []} />;
}
