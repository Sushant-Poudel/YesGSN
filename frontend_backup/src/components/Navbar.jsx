import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X, Search, User, Gift, Users, Smartphone, Star, Home, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CartSidebar } from '@/components/Cart';
import CustomerAuthModal from '@/components/CustomerAuth';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_8ec93a6a-4f80-4dde-b760-4bc71482fa44/artifacts/4uqt5osn_Staff.zip%20-%201.png";

export default function Navbar({ notificationBarHeight = 0 }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [customer, setCustomer] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const syncCustomerState = () => {
    const info = localStorage.getItem('customer_info');
    if (info) {
      try { setCustomer(JSON.parse(info)); } catch (e) { setCustomer(null); }
    } else { setCustomer(null); }
  };

  useEffect(() => {
    syncCustomerState();
    window.addEventListener('storage', syncCustomerState);
    window.addEventListener('customerLogin', syncCustomerState);
    window.addEventListener('customerLogout', syncCustomerState);
    return () => {
      window.removeEventListener('storage', syncCustomerState);
      window.removeEventListener('customerLogin', syncCustomerState);
      window.removeEventListener('customerLogout', syncCustomerState);
    };
  }, []);

  // Re-sync on route changes to catch any missed state updates
  useEffect(() => {
    syncCustomerState();
  }, [location.pathname]);

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/reviews', label: 'Reviews', icon: Star },
    { href: '/daily-reward', label: 'Rewards', icon: Gift, highlight: true },
    { href: '/reseller-plans', label: 'Membership', icon: Users },
  ];

  const isActive = (path) => location.pathname === path;

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/?search=${encodeURIComponent(query)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
      setTimeout(() => {
        const el = document.querySelector('[data-testid="products-section"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  };

  const isAdminRoute = location.pathname.startsWith('/panelgsnadminbackend');
  if (isAdminRoute) return null;

  return (
    <>
      {/* ========== DESKTOP / TABLET: Dynamic Island Top Nav (md+) ========== */}
      <div
        className="hidden md:flex fixed top-4 left-1/2 -translate-x-1/2 z-50 items-center gap-2 bg-black/90 border border-white/10 rounded-full px-5 py-2 shadow-2xl shadow-black/40"
        style={{ marginTop: notificationBarHeight }}
        data-testid="navbar"
      >
        <Link to="/" className="flex items-center mr-2" data-testid="nav-logo">
          <img src={LOGO_URL} alt="GSN" className="h-7" />
        </Link>

        <div className="w-px h-5 bg-white/10" />

        {navLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            data-testid={`nav-link-${link.label.toLowerCase().replace(' ', '-')}`}
            className={`px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 rounded-full ${
              link.highlight && !isActive(link.href)
                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                : isActive(link.href)
                  ? 'text-white bg-white/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <link.icon className="w-3.5 h-3.5" />
            {link.label}
          </Link>
        ))}

        <div className="w-px h-5 bg-white/10" />

        {/* Search */}
        {isSearchOpen ? (
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50 w-40"
              autoFocus
              data-testid="search-input"
            />
            <button type="button" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-white/40 hover:text-white p-1">
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <button onClick={() => setIsSearchOpen(true)} className="text-white/50 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-colors" data-testid="search-btn">
            <Search className="h-4 w-4" />
          </button>
        )}

        <CartSidebar />

        {customer ? (
          <Link
            to="/account"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            data-testid="customer-account-btn"
          >
            <User className="h-3.5 w-3.5" />
            Account
          </Link>
        ) : (
          <Button
            onClick={() => setShowAuthModal(true)}
            className="bg-white/10 hover:bg-white/15 text-white rounded-full px-4 py-1.5 text-sm font-medium h-auto"
            data-testid="customer-login-btn"
          >
            Sign In
          </Button>
        )}

      </div>

      {/* ========== MOBILE: Slim top bar + Bottom tab bar (<md) ========== */}
      {/* Mobile top bar - logo, search, cart */}
      <div className="md:hidden fixed left-0 right-0 z-40 bg-black/95 border-b border-white/[0.06]" style={{ top: notificationBarHeight }} data-testid="mobile-top-bar">
        <div className="flex items-center justify-between px-4 h-12">
          <Link to="/" className="flex-shrink-0" data-testid="nav-logo-mobile">
            <img src={LOGO_URL} alt="GSN" className="h-6" />
          </Link>
          <div className="flex items-center gap-1">
            {isSearchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center gap-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="bg-white/10 border border-white/15 rounded-full px-3 py-1 text-sm text-white placeholder:text-white/40 focus:outline-none w-36"
                  autoFocus
                  data-testid="search-input-mobile"
                />
                <button type="button" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-white/40 p-1">
                  <X className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <button onClick={() => setIsSearchOpen(true)} className="text-white/60 p-2 rounded-full" data-testid="search-btn-mobile">
                <Search className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setShowInstallModal(true)}
              className="text-white/50 p-2 rounded-full"
              data-testid="add-to-home-btn-mobile"
              title="Add to Home Screen"
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <CartSidebar />
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)]" data-testid="mobile-bottom-nav">
        <div className="grid grid-cols-5 h-14">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              data-testid={`nav-link-${link.label.toLowerCase().replace(' ', '-')}`}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
                link.highlight && !isActive(link.href)
                  ? 'text-amber-400'
                  : isActive(link.href)
                    ? 'text-white'
                    : 'text-white/40'
              }`}
            >
              <link.icon className={`h-5 w-5 ${isActive(link.href) ? 'text-amber-500' : ''}`} />
              <span className="text-[10px] font-medium leading-none">{link.label}</span>
            </Link>
          ))}
          {customer ? (
            <button
              onClick={() => navigate('/account')}
              data-testid="customer-account-btn-mobile"
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${isActive('/account') ? 'text-white' : 'text-white/40'}`}
            >
              <User className={`h-5 w-5 ${isActive('/account') ? 'text-amber-500' : ''}`} />
              <span className="text-[10px] font-medium leading-none">Account</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              data-testid="customer-login-btn-mobile"
              className="flex flex-col items-center justify-center gap-0.5 text-white/40"
            >
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">Sign In</span>
            </button>
          )}
        </div>
      </nav>

      <CustomerAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(customerData) => setCustomer(customerData)}
      />

      {/* Add to Home Screen Modal */}
      <Dialog open={showInstallModal} onOpenChange={setShowInstallModal}>
        <DialogContent className="w-[calc(100%-32px)] sm:max-w-[450px] p-0 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-white/10 text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Add to Home Screen</h2>
            <p className="text-white/60 text-sm mt-2">Install GameShop Nepal for quick access</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67a.643.643 0 00-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 002 18h20a10.78 10.78 0 00-4.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/></svg>
                </div>
                <h3 className="text-white font-semibold">Android (Chrome)</h3>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3 text-white/80"><span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span><span>Tap the <strong className="text-white">menu</strong> (3 dots) in the top right</span></li>
                <li className="flex items-start gap-3 text-white/80"><span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span><span>Tap <strong className="text-white">"Add to Home screen"</strong></span></li>
                <li className="flex items-start gap-3 text-white/80"><span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span><span>Tap <strong className="text-white">"Add"</strong> to confirm</span></li>
              </ol>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                </div>
                <h3 className="text-white font-semibold">iPhone / iPad (Safari)</h3>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3 text-white/80"><span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span><span>Open in <strong className="text-white">Safari</strong></span></li>
                <li className="flex items-start gap-3 text-white/80"><span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span><span>Tap <strong className="text-white">Share</strong> (square with arrow)</span></li>
                <li className="flex items-start gap-3 text-white/80"><span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span><span>Tap <strong className="text-white">"Add to Home Screen"</strong></span></li>
              </ol>
            </div>
          </div>
          <div className="p-4 border-t border-white/10">
            <Button onClick={() => setShowInstallModal(false)} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">Got it!</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
