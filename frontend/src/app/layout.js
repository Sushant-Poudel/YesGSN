import '@/index.css';
import '@/App.css';
import ClientProviders from '@/components/ClientProviders';
import { VisitTracker } from '@/components/VisitTracker';

export const metadata = {
  metadataBase: new URL('https://gameshopnepal.com'),
  alternates: {
    canonical: 'https://gameshopnepal.com',
  },
  title: {
    default: 'GameShop Nepal - Buy Digital Games, Subscriptions & Gift Cards',
    template: '%s',
  },
  description: 'Nepal\'s #1 digital store for gaming subscriptions, game top-ups, and gift cards. Buy Netflix, Spotify, YouTube Premium, PUBG, MLBB, and more at the best prices.',
  keywords: ['games nepal', 'digital store nepal', 'netflix nepal', 'spotify nepal', 'gaming topup'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gameshopnepal.com',
    siteName: 'GameShop Nepal',
    title: 'Buy Netflix, Spotify, YouTube Premium in Nepal | GameShop Nepal',
    description: 'Nepal\'s most trusted digital store. Buy Netflix Premium, Spotify, YouTube Premium, ChatGPT Plus, PUBG UC at the best prices. Instant delivery via eSewa & Khalti.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buy Netflix, Spotify, YouTube Premium in Nepal | GameShop Nepal',
    description: 'Nepal\'s most trusted digital store. Buy Netflix Premium, Spotify, YouTube Premium, ChatGPT Plus, PUBG UC at the best prices. Instant delivery via eSewa & Khalti.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "LocalBusiness",
                "@id": "https://gameshopnepal.com/#business",
                "name": "GameShop Nepal",
                "url": "https://gameshopnepal.com",
                "logo": "https://gameshopnepal.com/favicon.png",
                "image": "https://gameshopnepal.com/favicon.png",
                "description": "Nepal's most trusted digital subscription store. Buy Netflix, Spotify, YouTube Premium, ChatGPT Plus, PUBG UC at the best prices. Pay with eSewa or Khalti.",
                "telephone": "+9779743488871",
                "email": "support@gameshopnepal.com",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "Butwal",
                  "addressLocality": "Butwal",
                  "addressRegion": "Lumbini Province",
                  "addressCountry": "NP"
                },
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": "27.7006",
                  "longitude": "83.4532"
                },
                "openingHoursSpecification": {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
                  "opens": "10:00",
                  "closes": "22:00"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.7",
                  "reviewCount": "1000",
                  "bestRating": "5",
                  "worstRating": "1"
                },
                "priceRange": "Rs 100 - Rs 15,800",
                "currenciesAccepted": "NPR",
                "paymentAccepted": "eSewa, Khalti, Bank Transfer",
                "areaServed": {
                  "@type": "Country",
                  "name": "Nepal"
                },
                "foundingDate": "2021",
                "sameAs": [
                  "https://www.instagram.com/gameshopnepal.co"
                ]
              },
              {
                "@type": "WebSite",
                "@id": "https://gameshopnepal.com/#website",
                "url": "https://gameshopnepal.com",
                "name": "GameShop Nepal",
                "description": "Nepal's most trusted digital subscription store",
                "publisher": { "@id": "https://gameshopnepal.com/#business" },
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://gameshopnepal.com/products?search={search_term_string}"
                  },
                  "query-input": "required name=search_term_string"
                }
              }
            ]
          })}}
        />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="min-h-screen bg-black">
        <ClientProviders>
          {children}
        </ClientProviders>
        <VisitTracker />
      </body>
    </html>
  );
}
