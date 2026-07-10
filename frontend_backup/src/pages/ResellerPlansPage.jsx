import { useState, useEffect } from 'react';
import { Check, Star, Zap, Crown, Users, MessageCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO, { SEOConfigs } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResellerPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API_URL}/reseller-plans`);
      setPlans(res.data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = (plan) => {
    const message = `Hi! I'm interested in the ${plan.name} membership plan (Rs ${plan.price}/${plan.duration}). Please provide more details.`;
    window.open(`https://wa.me/9779743488871?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO {...SEOConfigs.reseller} />
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-14 md:pt-24 pb-20 md:pb-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500/10 rounded-full border border-gold-500/20 mb-6">
            <Users className="w-4 h-4 text-gold-500" />
            <span className="text-gold-500 text-sm font-medium">Become a Member</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Membership <span className="text-gold-500">Plans</span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Join our membership program and get exclusive discounts on all products. 
            Start saving on digital subscriptions with GameShop Nepal.
          </p>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20">
              <Crown className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No membership plans available at the moment.</p>
              <p className="text-white/40 text-sm mt-2">Please check back later or contact us for custom plans.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`relative bg-card rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
                    plan.is_popular 
                      ? 'border-gold-500 shadow-lg shadow-gold-500/20' 
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  data-testid={`reseller-plan-${plan.id}`}
                >
                  {/* Popular Badge */}
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold-500 rounded-full">
                      <span className="text-black text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3" /> MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Plan Header */}
                    <div className="text-center mb-6 pt-2">
                      <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-gold-500">Rs {plan.price.toLocaleString()}</span>
                        <span className="text-white/40">/{plan.duration}</span>
                      </div>
                      {plan.discount_percent > 0 && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                          <Zap className="w-3 h-3 text-green-500" />
                          <span className="text-green-500 text-sm font-medium">{plan.discount_percent}% OFF on all products</span>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-gold-500" />
                          </div>
                          <span className="text-white/80 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleContact(plan)}
                      className={`w-full py-6 text-base font-semibold ${
                        plan.is_popular
                          ? 'bg-gold-500 hover:bg-gold-600 text-black'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                      data-testid={`contact-plan-${plan.id}`}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact on WhatsApp
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact Section */}
          <div className="mt-16 text-center">
            <div className="bg-card border border-white/10 rounded-2xl p-8 max-w-2xl mx-auto">
              <h3 className="text-xl font-bold text-white mb-2">Need a Custom Plan?</h3>
              <p className="text-white/60 mb-6">
                Contact us for custom membership plans tailored to your needs.
              </p>
              <Button
                onClick={() => window.open('https://wa.me/9779743488871?text=Hi! I need a custom membership plan. Please provide more details.', '_blank')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat with Us
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
