import { getPageContent } from '@/lib/server-api';
import PrivacyPageClient from '@/views/PrivacyPage';

export const metadata = {
  title: 'Privacy Policy | GameShop Nepal',
  description: 'Read how GameShop Nepal collects, uses, and protects your personal information. Your privacy matters.',
  alternates: { canonical: 'https://gameshopnepal.com/privacy' },
  openGraph: { title: 'Privacy Policy | GameShop Nepal', url: 'https://gameshopnepal.com/privacy' },
};

export default async function PrivacyPage() {
  const pageData = await getPageContent('privacy');
  return <PrivacyPageClient initialData={pageData} />;
}
