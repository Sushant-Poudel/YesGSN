import { getProducts, getCategories, getReviews, getReviewsPublic, getNotificationBar, getBlogPosts, getPaymentMethods } from '@/lib/server-api';
import HomePageClient from '@/views/HomePage';

export const metadata = {
  title: 'Buy Netflix, Spotify, YouTube Premium in Nepal | GameShop Nepal',
  description: 'Nepal\'s most trusted digital store. Buy Netflix Premium, Spotify, YouTube Premium, ChatGPT Plus, PUBG UC at the best prices. Instant delivery via eSewa & Khalti.',
  keywords: 'Netflix Nepal, Spotify Premium Nepal, YouTube Premium Nepal, ChatGPT Plus Nepal, PUBG UC Nepal, buy subscriptions Nepal',
  openGraph: {
    title: 'Buy Netflix, Spotify, YouTube Premium in Nepal | GameShop Nepal',
    description: 'Nepal\'s most trusted digital store. Buy Netflix Premium, Spotify, YouTube Premium, ChatGPT Plus, PUBG UC at the best prices. Instant delivery via eSewa & Khalti.',
    url: 'https://gameshopnepal.com',
    siteName: 'GameShop Nepal',
    images: [
      {
        url: 'https://customer-assets.emergentagent.com/job_f826d6c3-4354-45f7-8eac-b606d3ae45c3/artifacts/8kg7y2go_Staff.jpg',
        width: 1200,
        height: 630,
      }
    ],
  },
};

export default async function HomePage() {
  const [products, categories, reviews, reviewsPublic, notificationBar, blogPosts, paymentMethods] = await Promise.all([
    getProducts(),
    getCategories(),
    getReviews(),
    getReviewsPublic(),
    getNotificationBar(),
    getBlogPosts(),
    getPaymentMethods(),
  ]);

  return (
    <HomePageClient
      initialProducts={products || []}
      initialCategories={categories || []}
      initialReviews={reviews || []}
      initialReviewStats={{
        total: reviewsPublic?.total || 0,
        avg_rating: reviewsPublic?.avg_rating || 0,
      }}
      initialNotificationBar={notificationBar}
      initialBlogPosts={(blogPosts || []).slice(0, 3)}
      initialPaymentMethods={paymentMethods || []}
    />
  );
}
