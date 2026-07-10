import { getBlogPosts } from '@/lib/server-api';
import BlogPageClient from '@/views/BlogPage';

// Always fetch fresh blog data; ISR was holding stale snapshots for ~1 year
export const revalidate = 30;
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Blog — Netflix, Spotify, PUBG Guides & Tips Nepal | GameShop Nepal',
  description: 'Read guides on buying Netflix, Spotify, YouTube Premium, PUBG UC and more in Nepal. Tips, price comparisons and digital subscription guides for Nepali users.',
  alternates: { canonical: 'https://gameshopnepal.com/blog' },
  openGraph: {
    title: 'Blog — Netflix, Spotify, PUBG Guides & Tips Nepal | GameShop Nepal',
    description: 'Guides on buying digital subscriptions in Nepal. Netflix, Spotify, YouTube Premium, PUBG UC tips.',
    url: 'https://gameshopnepal.com/blog',
    siteName: 'GameShop Nepal',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Digital Subscription Guides Nepal | GameShop Nepal',
    description: 'Guides on buying Netflix, Spotify, PUBG UC and more in Nepal.',
  },
};

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return <BlogPageClient initialPosts={posts || []} />;
}
