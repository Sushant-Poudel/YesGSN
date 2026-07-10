import { getReviewsPublic } from '@/lib/server-api';
import ReviewsPageClient from '@/views/ReviewsPage';

export const metadata = {
  title: 'Customer Reviews — 4.7/5 Rating | 170+ Verified Reviews | GameShop Nepal',
  description: 'Read 170+ verified customer reviews of GameShop Nepal. Rated 4.7/5. Real reviews from Nepali customers who bought Netflix, Spotify, PUBG UC and more.',
  alternates: { canonical: 'https://gameshopnepal.com/reviews' },
  openGraph: {
    title: 'Customer Reviews — 4.7/5 | GameShop Nepal',
    description: '170+ verified reviews from real Nepali customers. Rated 4.7/5.',
    url: 'https://gameshopnepal.com/reviews',
    siteName: 'GameShop Nepal',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Customer Reviews — 4.7/5 Rating | GameShop Nepal',
    description: '170+ verified reviews from real Nepali customers.',
  },
};

export default async function ReviewsPage() {
  const reviewData = await getReviewsPublic();

  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "GameShop Nepal",
    "url": "https://gameshopnepal.com",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": reviewData?.avg_rating?.toFixed(1) || "4.7",
      "reviewCount": reviewData?.total || 1000,
      "bestRating": "5",
      "worstRating": "1"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
      />
      <ReviewsPageClient initialReviewData={reviewData} />
    </>
  );
}
