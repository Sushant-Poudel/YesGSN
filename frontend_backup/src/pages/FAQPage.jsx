import { useEffect, useState } from 'react';
import { Search, HelpCircle, ShoppingCart, CreditCard, Headphones, Package } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO, { SEOConfigs } from '@/components/SEO';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { faqsAPI } from '@/lib/api';

const CATEGORIES = [
  { id: 'all', name: 'All', icon: HelpCircle },
  { id: 'Ordering', name: 'Ordering', icon: ShoppingCart },
  { id: 'Payments', name: 'Payments', icon: CreditCard },
  { id: 'Delivery', name: 'Delivery', icon: Package },
  { id: 'Support', name: 'Support', icon: Headphones },
  { id: 'General', name: 'General', icon: HelpCircle },
];

const defaultFAQs = [
  { id: 'default-1', question: "How do I place an order?", answer: "Simply browse our products, select the plan you want, and click 'Order Now'. This will redirect you to WhatsApp where you can complete your order with our support team.", category: "Ordering" },
  { id: 'default-2', question: "How long does delivery take?", answer: "Most products are delivered instantly within minutes after payment confirmation. Some products may take up to 24 hours depending on availability.", category: "Delivery" },
  { id: 'default-3', question: "What payment methods do you accept?", answer: "We accept eSewa, Khalti, bank transfer, and other local payment methods. Payment details will be shared via WhatsApp when you place an order.", category: "Payments" },
  { id: 'default-4', question: "Are your products genuine?", answer: "Yes! All our products are 100% genuine and sourced directly from authorized channels. We have been operating since 2021 with thousands of satisfied customers.", category: "General" },
  { id: 'default-5', question: "How can I contact support?", answer: "You can reach us via WhatsApp, email at support@gameshopnepal.com, or through our social media channels. Our team typically responds within 30 minutes during business hours.", category: "Support" },
  { id: 'default-6', question: "Can I get a refund?", answer: "Due to the digital nature of our products, refunds are handled on a case-by-case basis. If you face any issues with your product, contact our support team immediately.", category: "Payments" },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    faqsAPI.getAll()
      .then(res => setFaqs(res.data.length > 0 ? res.data : defaultFAQs))
      .catch(() => setFaqs(defaultFAQs))
      .finally(() => setIsLoading(false));
  }, []);

  // Filter FAQs based on search and category
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group FAQs by category for display
  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    const category = faq.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(faq);
    return acc;
  }, {});

  // Build FAQ JSON-LD from loaded FAQs
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.slice(0, 20).map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer?.replace(/<[^>]*>/g, '') || '' }
    }))
  };

  return (
    <div className="min-h-screen bg-black">
      <SEO {...SEOConfigs.faq} schema={faqSchema} />
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-testid="faq-page">
          {isLoading ? (
            <div className="space-y-6">
              <div className="h-12 w-1/2 skeleton rounded"></div>
              <div className="h-40 skeleton rounded"></div>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-4xl md:text-5xl font-bold text-white uppercase tracking-tight mb-4">
                Frequently Asked <span className="text-gold-500">Questions</span>
              </h1>
              <p className="text-white/60 mb-8">Find answers to commonly asked questions about our products and services.</p>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 bg-card border-white/10 text-white placeholder:text-white/40 h-12"
                  data-testid="faq-search"
                />
              </div>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-8">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gold-500 text-black'
                          : 'bg-card border border-white/10 text-white/70 hover:border-gold-500/50 hover:text-white'
                      }`}
                      data-testid={`faq-category-${cat.id}`}
                    >
                      <Icon className="h-4 w-4" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {/* FAQs Display */}
              {filteredFAQs.length === 0 ? (
                <div className="text-center py-12 bg-card border border-white/10 rounded-lg">
                  <HelpCircle className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">No questions found matching your search.</p>
                </div>
              ) : selectedCategory === 'all' ? (
                // Grouped view when "All" is selected
                <div className="space-y-8">
                  {Object.entries(groupedFAQs).map(([category, categoryFaqs]) => (
                    <div key={category}>
                      <h2 className="font-heading text-xl font-semibold text-gold-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        {CATEGORIES.find(c => c.id === category)?.icon && (
                          (() => {
                            const IconComp = CATEGORIES.find(c => c.id === category)?.icon || HelpCircle;
                            return <IconComp className="h-5 w-5" />;
                          })()
                        )}
                        {category}
                      </h2>
                      <Accordion type="single" collapsible className="space-y-3">
                        {categoryFaqs.map((faq, index) => (
                          <AccordionItem
                            key={faq.id}
                            value={`${category}-${index}`}
                            className="bg-card border border-white/10 rounded-lg px-6 data-[state=open]:border-gold-500/50"
                            data-testid={`faq-item-${faq.id}`}
                          >
                            <AccordionTrigger className="font-heading text-base font-semibold text-white hover:text-gold-500 py-4 text-left">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-white/70 pb-4 leading-relaxed">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  ))}
                </div>
              ) : (
                // Single category view
                <Accordion type="single" collapsible className="space-y-4">
                  {filteredFAQs.map((faq, index) => (
                    <AccordionItem
                      key={faq.id}
                      value={`item-${index}`}
                      className="bg-card border border-white/10 rounded-lg px-6 data-[state=open]:border-gold-500/50"
                      data-testid={`faq-item-${index}`}
                    >
                      <AccordionTrigger className="font-heading text-lg font-semibold text-white hover:text-gold-500 py-4 text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-white/70 pb-4 leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}

              {/* Contact Section */}
              <div className="mt-12 text-center bg-card/50 border border-white/10 rounded-lg p-8">
                <h3 className="font-heading text-2xl font-semibold text-white uppercase mb-4">Still Have Questions?</h3>
                <p className="text-white/60 mb-4">Can&apos;t find what you&apos;re looking for? Contact our support team.</p>
                <a href="mailto:support@gameshopnepal.com" className="text-gold-500 hover:text-gold-400 font-semibold">
                  support@gameshopnepal.com
                </a>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
