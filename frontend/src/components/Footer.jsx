'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  { icon: Clock, label: '10AM–10PM Support' },
  { icon: Star, label: 'Trusted Since 2021' },
];

const PAYMENT_METHODS = ['eSewa', 'Khalti', 'Bank Transfer', 'IME Pay'];

export default function Footer() {
  const [socialLinks, setSocialLinks] = useState([]);
  const [floatingBtn, setFloatingBtn] = useState({
    enabled: true,
    url: "https://wa.me/9779743488871",
    tooltip: "Chat with us",
    bg_color: "#22c55e",
    icon: "whatsapp"
  });
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    socialLinksAPI.getAll()
      .then(res => setSocialLinks(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    fetch(`${API_URL}/api/settings/floating-button`)
      .then(r => r.json())
      .then(d => setFloatingBtn(d))
      .catch(() => {});
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) { toast.error('Please enter a valid email address'); return; }
    setIsSubscribing(true);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/newsletter/subscribe`, { email });
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
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

      {/* Trust Badges */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 justify-center md:justify-start">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Icon className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-white/60 text-xs sm:text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="glass-depth rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="font-heading text-lg lg:text-xl font-semibold text-white mb-1.5">Get Exclusive Deals</h3>
                <p className="text-white/50 text-sm">New products, special offers & discounts — straight to your inbox</p>
              </div>
              <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2">
                <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 w-full md:w-72 rounded-xl focus:border-amber-500/30" />
                <Button type="submit" disabled={isSubscribing} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 rounded-xl transition-colors duration-200">
                  {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" />Subscribe</>}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4">
            <Link href="/" className="inline-block mb-4">
              <img src={LOGO_URL} alt="GameShop Nepal" className="h-9 lg:h-12 w-auto" />
            </Link>
            <p className="text-white/50 text-xs sm:text-sm leading-relaxed max-w-sm mb-5">
              Nepal's trusted destination for digital subscriptions, gaming, OTT, and software since 2021.
            </p>
            <div className="flex items-center gap-3">
              {socialLinksArray.map((link) => (
                <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-amber-500/15 hover:text-amber-500 transition-colors duration-200">
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
                { to: '/products', label: 'All Products' },
                { to: '/reviews', label: 'Reviews' },
                { to: '/daily-reward', label: 'Rewards' },
                { to: '/reseller-plans', label: 'Membership' },
              ].map(link => (
                <li key={link.to}>
                  <Link href={link.to} className="text-white/50 hover:text-amber-400 text-sm transition-colors duration-200">{link.label}</Link>
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
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/blog', label: 'Blog' },
                { to: '/track-order', label: 'Track Order' },
              ].map(link => (
                <li key={link.to}>
                  <Link href={link.to} className="text-white/50 hover:text-amber-400 text-sm transition-colors duration-200">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Payment */}
          <div className="col-span-2 md:col-span-4">
            <h3 className="font-heading text-xs uppercase tracking-widest text-white/40 font-semibold mb-4">Contact</h3>
            <a href="mailto:support@gameshopnepal.com" className="text-white/50 hover:text-amber-400 text-sm transition-colors block mb-1">support@gameshopnepal.com</a>
            <a href="https://wa.me/9779743488871" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-amber-400 text-sm transition-colors block mb-5">+977 9743488871</a>
            <h3 className="font-heading text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">We Accept</h3>
            <div className="flex flex-wrap gap-2">
              {['eSewa', 'Khalti', 'Bank Transfer', 'IME Pay'].map(method => (
                <div key={method} className="flex items-center gap-1.5 bg-white/5 border border-white/[0.06] rounded-lg px-3 py-1.5">
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
            <p className="text-white/30 text-xs">&copy; {new Date().getFullYear()} GameShop Nepal. All rights reserved.</p>
            <p className="text-white/20 text-xs">Made by <a href="https://pixelnepal.site/" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">PixelNepal</a></p>
          </div>
        </div>
      </div>

      {/* Floating Contact Button — configurable from admin */}
      {floatingBtn.enabled && (
        <a href={floatingBtn.url} target="_blank" rel="noopener noreferrer"
          style={{ backgroundColor: floatingBtn.bg_color }}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all md:bottom-6 md:right-6 group">
          {floatingBtn.tooltip && (
            <span className="absolute -top-10 right-0 bg-black/90 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {floatingBtn.tooltip}
            </span>
          )}
          {floatingBtn.icon === 'whatsapp' && (
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          )}
          {floatingBtn.icon === 'instagram' && (
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          )}
          {floatingBtn.icon === 'email' && (
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          )}
          {floatingBtn.icon === 'messenger' && (
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/></svg>
          )}
          {!['whatsapp','instagram','email','messenger'].includes(floatingBtn.icon) && (
            <span className="text-2xl">{floatingBtn.icon}</span>
          )}
        </a>
      )}
    </footer>
  );
}
