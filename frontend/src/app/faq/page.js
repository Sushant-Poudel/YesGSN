import { getFAQs } from '@/lib/server-api';
import FAQPageClient from '@/views/FAQPage';

export const metadata = {
  title: 'FAQ - Frequently Asked Questions | GameShop Nepal',
  description: 'Find answers to common questions about ordering, delivery, payments, and more at GameShop Nepal.',
  openGraph: { title: 'FAQ | GameShop Nepal', url: 'https://gameshopnepal.com/faq' },
  alternates: { canonical: 'https://gameshopnepal.com/faq' },
};

export default async function FAQPage() {
  const faqs = await getFAQs();

  // FAQ Schema for Google rich results
  const faqSchema = faqs?.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || faq.answer || ''
      }
    }))
  } : {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I buy Netflix in Nepal?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Visit gameshopnepal.com, select Netflix, choose your plan, pay with eSewa or Khalti, and receive your login details via WhatsApp within minutes."
        }
      },
      {
        "@type": "Question",
        "name": "Which payment methods do you accept?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We accept eSewa, Khalti, Bank Transfer and IME Pay. No dollar card needed."
        }
      },
      {
        "@type": "Question",
        "name": "How long does delivery take?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Most orders are delivered within minutes via WhatsApp after payment confirmation, during our open hours of 10AM to 10PM."
        }
      },
      {
        "@type": "Question",
        "name": "Is GameShop Nepal legitimate?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. We have been operating since 2021 with 1,500+ verified customers and a 4.7/5 customer rating. Every product we sell is 100% genuine."
        }
      },
      {
        "@type": "Question",
        "name": "Does Netflix work without VPN in Nepal?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. All our Netflix accounts work on all Nepali internet providers including Worldlink, Vianet, Classic Tech, NTC and Ncell without any VPN."
        }
      },
      {
        "@type": "Question",
        "name": "Can I buy PUBG UC with eSewa in Nepal?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. You can buy PUBG UC in Nepal using eSewa or Khalti at GameShop Nepal. No dollar card needed. Starting from Rs 145 for 60 UC."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <FAQPageClient initialFAQs={faqs || []} />
    </>
  );
}
