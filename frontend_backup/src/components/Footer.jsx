import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, MessageCircle, Send, Loader2, Shield, Truck, Clock, CreditCard, Star } from 'lucide-react';
import { socialLinksAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_8ec93a6a-4f80-4dde-b760-4bc71482fa44/artifacts/4uqt5osn_Staff.zip%20-%201.png";

const TikTokIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const TRUST_BADGES = [
  { icon: Shield, label: 'Secure Payment' },
  { icon: Truck, label: 'Instant Delivery' },
  { icon: Clock, label: '24/7 Support' },
  { icon: Star, label: 'Trusted Since 2021' },
];

const PAYMENT_METHODS = ['eSewa', 'Khalti', 'Bank Transfer', 'IME Pay'];

export default function Footer() {
  const [socialLinks, setSocialLinks] = useState([]);
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    socialLinksAPI.getAll()
      .then(res => setSocialLinks(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) { toast.error('Please enter a valid email address'); return; }
    setIsSubscribing(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/newsletter/subscribe`, { email });
      toast.success(response.data.message);
      setEmail('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to subscribe');
    } finally {
      setIsSubscribing(false);
    }
  };

  const getIcon = (platform) => {
    const name = platform?.toLowerCase();
    if (name?.includes('facebook')) return <Facebook className="h-5 w-5" />;
    if (name?.includes('instagram')) return <Instagram className="h-5 w-5" />;
    if (name?.includes('whatsapp')) return <MessageCircle className="h-5 w-5" />;
    if (name?.includes('tiktok')) return <TikTokIcon />;
    if (name?.includes('discord')) return <DiscordIcon />;
    return null;
  };

  const socialLinksArray = socialLinks.filter(link => link.url && link.platform);

  return (
    <footer className="relative bg-black border-t border-white/[0.06]" data-testid="footer">
      {/* Subtle ambient glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

      {/* Trust Badges Strip */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 justify-center md:justify-start" data-testid={`trust-badge-${label.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Icon className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-white/60 text-xs sm:text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="glass-depth rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="font-heading text-lg lg:text-xl font-semibold text-white mb-1.5">
                  Get Exclusive Deals
                </h3>
                <p className="text-white/50 text-sm">
                  New products, special offers & discounts — straight to your inbox
                </p>
              </div>
              <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 w-full md:w-72 rounded-xl focus:border-amber-500/30"
                  data-testid="newsletter-email-input"
                />
                <Button 
                  type="submit" 
                  disabled={isSubscribing}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 rounded-xl transition-colors duration-200"
                  data-testid="newsletter-subscribe-btn"
                >
                  {isSubscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Subscribe
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4">
            <Link to="/" className="inline-block mb-4">
              <img src={LOGO_URL} alt="GameShop Nepal" className="h-9 lg:h-12 w-auto" />
            </Link>
            <p className="text-white/50 text-xs sm:text-sm leading-relaxed max-w-sm mb-5">
              Nepal's trusted destination for digital subscriptions, gaming, OTT, and software since 2021.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinksArray.map((link) => (
                <a 
                  key={link.platform} 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-amber-500/15 hover:text-amber-500 transition-colors duration-200" 
                  data-testid={`social-link-${link.platform.toLowerCase()}`}
                >
                  {getIcon(link.platform)}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h3 className="font-heading text-xs uppercase tracking-widest text-white/40 font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2.5">
              {[
                { to: '/', label: 'Home' },
                { to: '/reviews', label: 'Reviews' },
                { to: '/daily-reward', label: 'Rewards' },
                { to: '/reseller-plans', label: 'Membership' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-white/50 hover:text-amber-400 text-sm transition-colors duration-200" data-testid={`footer-link-${link.label.toLowerCase().replace(/\s/g, '-')}`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="md:col-span-2">
            <h3 className="font-heading text-xs uppercase tracking-widest text-white/40 font-semibold mb-4">Support</h3>
            <ul className="space-y-2.5">
              {[
                { to: '/about', label: 'About Us' },
                { to: '/faq', label: 'FAQ' },
                { to: '/terms', label: 'Terms & Conditions' },
                { to: '/blog', label: 'Blog' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-white/50 hover:text-amber-400 text-sm transition-colors duration-200" data-testid={`footer-link-${link.label.toLowerCase().replace(/\s/g, '-')}`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Payment */}
          <div className="col-span-2 md:col-span-4">
            <h3 className="font-heading text-xs uppercase tracking-widest text-white/40 font-semibold mb-4">Contact</h3>
            <p className="text-white/50 text-sm mb-1">support@gameshopnepal.com</p>
            <p className="text-white/50 text-sm mb-5">+977 9743488871</p>
            
            <h3 className="font-heading text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">We Accept</h3>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(method => (
                <div key={method} className="flex items-center gap-1.5 bg-white/5 border border-white/[0.06] rounded-lg px-3 py-1.5" data-testid={`payment-method-${method.toLowerCase().replace(/\s/g, '-')}`}>
                  <CreditCard className="h-3 w-3 text-amber-500/70" />
                  <span className="text-white/50 text-xs font-medium">{method}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/30 text-xs text-center sm:text-left">&copy; {new Date().getFullYear()} GameShop Nepal. All rights reserved.</p>
            <Link to="/reviews" className="text-amber-500/70 hover:text-amber-400 text-xs flex items-center gap-1 transition-colors duration-200" data-testid="footer-reviews-link">
              <Star className="h-3 w-3" /> Customer Reviews
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
