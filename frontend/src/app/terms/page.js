import { getPageContent } from '@/lib/server-api';
import TermsPageClient from '@/views/TermsPage';

export const metadata = {
  title: 'Terms and Conditions | GameShop Nepal',
  description: 'Read the terms and conditions for using GameShop Nepal services.',
  openGraph: { title: 'Terms & Conditions | GameShop Nepal', url: 'https://gameshopnepal.com/terms' },
};

export default async function TermsPage() {
  const pageData = await getPageContent('terms');
  return <TermsPageClient initialData={pageData} />;
}
