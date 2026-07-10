import AboutPageClient from '@/views/AboutPage';

export const revalidate = 0;

export const metadata = {
  title: 'About GameShop Nepal — Our Story | Trusted Since 2021 | Butwal Nepal',
  description: "GameShop Nepal was founded in 2021 by Sushant Poudel in Butwal, Nepal after being scammed buying Netflix. Now Nepal's most trusted digital subscription store with a 4.7/5 customer rating.",
  alternates: { canonical: 'https://gameshopnepal.com/about' },
  openGraph: {
    title: 'About GameShop Nepal — Our Story | Trusted Since 2021',
    description: "Founded in 2021 by Sushant Poudel in Butwal, Nepal. Nepal's most trusted digital subscription store. Rated 4.7/5 by customers.",
    url: 'https://gameshopnepal.com/about',
    siteName: 'GameShop Nepal',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About GameShop Nepal — Our Story | Trusted Since 2021',
    description: "Founded in 2021 by Sushant Poudel in Butwal. Nepal's most trusted digital subscription store.",
  },
};

export default async function AboutPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
  const pageData = await fetch(backendUrl + '/api/pages/about', { cache: 'no-store' }).then(r => r.json()).catch(() => null);
  return <AboutPageClient initialData={pageData} />;
}
