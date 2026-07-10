import { getResellerPlans } from '@/lib/server-api';
import ResellerPlansPageClient from '@/views/ResellerPlansPage';

export const metadata = {
  title: 'Membership Plans — Silver, Gold, Platinum | GameShop Nepal',
  description: 'Join GameShop Nepal Membership and save 3-10% on every order. Free monthly products, birthday rewards, dedicated support and exclusive discounts.',
  alternates: { canonical: 'https://gameshopnepal.com/reseller-plans' },
  openGraph: {
    title: 'Membership Plans — Silver, Gold, Platinum | GameShop Nepal',
    description: 'Join GameShop Nepal Membership. Save 3-10% on every order plus exclusive perks.',
    url: 'https://gameshopnepal.com/reseller-plans',
    siteName: 'GameShop Nepal',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Membership Plans — GameShop Nepal',
    description: 'Save 3-10% on every order plus exclusive perks.',
  },
};

export default async function ResellerPlansPage() {
  const plans = await getResellerPlans();
  return <ResellerPlansPageClient initialPlans={plans || []} />;
}
