import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Package, FolderOpen, Star, FileText, Share2, LogOut, Home, Menu, X, 
  HelpCircle, Bell, BookOpen, CreditCard, Ticket, Settings, BarChart3, Users, ShoppingCart, 
  Shield, Mail, Coins, Gift, UserPlus, Zap, ChevronDown, ChevronRight,
  Store, Megaphone, Palette, Wrench, ClipboardList, Image, Smartphone, Volume2, VolumeX, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';
import axios from 'axios';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_8ec93a6a-4f80-4dde-b760-4bc71482fa44/artifacts/4uqt5osn_Staff.zip%20-%201.png";

// Organized navigation structure with groups
const navGroups = [
  {
    id: 'main',
    label: null, // No label for main items
    items: [
      { path: '/panelgsnadminbackend', label: 'Dashboard', icon: LayoutDashboard, permission: null },
      { path: '/panelgsnadminbackend/analytics', label: 'Analytics', icon: BarChart3, permission: 'view_analytics' },
      { path: '/panelgsnadminbackend/orders', label: 'Orders', icon: ShoppingCart, permission: 'view_orders' },
      { path: '/panelgsnadminbackend/audit-logs', label: 'Audit Logs', icon: ClipboardList, permission: 'view_analytics' },
    ]
  },
  {
    id: 'store',
    label: 'Store',
    icon: Store,
    items: [
      { path: '/panelgsnadminbackend/products', label: 'Products', icon: Package, permission: 'view_products' },
      { path: '/panelgsnadminbackend/categories', label: 'Categories', icon: FolderOpen, permission: 'view_categories' },
      { path: '/panelgsnadminbackend/reviews', label: 'Reviews', icon: Star, permission: 'view_reviews' },
      { path: '/panelgsnadminbackend/trustpilot', label: 'Trustpilot', icon: Star, permission: 'view_settings' },
      { path: '/panelgsnadminbackend/reseller-plans', label: 'Membership', icon: Users, permission: 'view_settings' },
    ]
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    items: [
      { path: '/panelgsnadminbackend/customers', label: 'All Customers', icon: Users, permission: 'view_customers' },
      { path: '/panelgsnadminbackend/staff', label: 'Staff Management', icon: Shield, permission: 'manage_admins' },
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { path: '/panelgsnadminbackend/ads', label: 'Advertisements', icon: Image, permission: 'view_settings' },
      { path: '/panelgsnadminbackend/promo-codes', label: 'Promo Codes', icon: Ticket, permission: 'view_settings' },
      { path: '/panelgsnadminbackend/newsletter', label: 'Newsletter', icon: Mail, permission: 'view_settings' },
      { path: '/panelgsnadminbackend/notification-bar', label: 'Notification Bar', icon: Bell, permission: 'view_settings' },
    ]
  },
  {
    id: 'rewards',
    label: 'Rewards & Credits',
    icon: Gift,
    items: [
      { path: '/panelgsnadminbackend/credit-settings', label: 'Store Credits', icon: Coins, permission: 'view_settings' },
      { path: '/panelgsnadminbackend/daily-reward', label: 'Daily Rewards', icon: Gift, permission: 'view_settings' },
      { path: '/panelgsnadminbackend/referral', label: 'Referral Program', icon: UserPlus, permission: 'view_settings' },
      { path: '/panelgsnadminbackend/multiplier', label: 'Multiplier Events', icon: Zap, permission: 'view_settings' },
    ]
  },
  {
    id: 'content',
    label: 'Content',
    icon: Palette,
    items: [
      { path: '/panelgsnadminbackend/blog', label: 'Blog / Guides', icon: BookOpen, permission: 'view_blog' },
      { path: '/panelgsnadminbackend/pages', label: 'Pages', icon: FileText, permission: 'view_pages' },
      { path: '/panelgsnadminbackend/faqs', label: 'FAQs', icon: HelpCircle, permission: 'view_faqs' },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Wrench,
    items: [
      { path: '/panelgsnadminbackend/pricing', label: 'Pricing', icon: Settings, permission: 'view_settings' },
      { path: '/panelgsnadminbackend/payment-methods', label: 'Payment Methods', icon: CreditCard, permission: 'view_settings' },
      { path: '/panelgsnadminbackend/social-links', label: 'Social Links', icon: Share2, permission: 'view_settings' },
      { path: '/panelgsnadminbackend/webhooks', label: 'Webhooks', icon: Globe, permission: 'view_settings' },
    ]
  },
];

export default function AdminLayout({ children, title }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(['main']);
  const [userPermissions, setUserPermissions] = useState([]);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('admin_sound') !== 'off');
  const lastConfirmedCount = useRef(null);
  const audioCtxRef = useRef(null);

  // Play a "ting" notification sound using Web Audio API
  const playTing = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }, []);

  // Poll for new confirmed orders
  useEffect(() => {
    if (!soundEnabled) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const api = axios.create({ baseURL: process.env.REACT_APP_BACKEND_URL, headers: { Authorization: `Bearer ${token}` } });

    const check = async () => {
      try {
        const res = await api.get('/api/orders/new-confirmed-count');
        const newCount = res.data.count;
        if (lastConfirmedCount.current !== null && newCount > lastConfirmedCount.current) {
          playTing();
          toast('New order confirmed!', { icon: '🔔', duration: 4000 });
        }
        lastConfirmedCount.current = newCount;
      } catch (e) {}
    };

    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [soundEnabled, playTing]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('admin_sound', next ? 'on' : 'off');
    if (next) playTing(); // Test sound on enable
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authAPI.getMe();
        setUser(res.data);
        const permissions = res.data.permissions || [];
        setUserPermissions(permissions);
        setIsMainAdmin(res.data.is_main_admin || permissions.includes('all'));
        
        // Auto-expand group containing current page
        const currentPath = location.pathname;
        navGroups.forEach(group => {
          if (group.items.some(item => item.path === currentPath)) {
            setExpandedGroups(prev => [...new Set([...prev, group.id])]);
          }
        });
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, [location.pathname]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const hasPermission = (permission) => {
    if (!permission) return true;
    if (isMainAdmin) return true;
    return userPermissions.includes(permission);
  };

  const getVisibleItems = (items) => {
    return items.filter(item => hasPermission(item.permission));
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/panelgsnadminbackend/login');
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/"><img src={LOGO_URL} alt="GameShop Nepal" className="h-8" /></Link>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-white hover:text-gold-500" data-testid="admin-mobile-menu-btn">
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/80 z-40" onClick={closeSidebar} />}

      {/* Sidebar */}
      <aside className={`admin-sidebar fixed left-0 top-0 bottom-0 w-64 flex flex-col z-50 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} data-testid="admin-sidebar">
        
        {/* Desktop Logo */}
        <div className="hidden lg:flex p-5 border-b border-white/10 items-center gap-3">
          <img src={LOGO_URL} alt="GameShop Nepal" className="h-9" />
          <div>
            <p className="text-white font-bold text-sm">Admin Panel</p>
            <p className="text-gray-500 text-xs">{user?.username || 'Admin'}</p>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-heading text-white uppercase tracking-wider text-sm">Menu</span>
          <button onClick={closeSidebar} className="p-1 text-white/60 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navGroups.map((group) => {
            const visibleItems = getVisibleItems(group.items);
            if (visibleItems.length === 0) return null;

            const isExpanded = expandedGroups.includes(group.id);
            const hasActiveItem = visibleItems.some(item => location.pathname === item.path);
            const GroupIcon = group.icon;

            // Main items (no group header)
            if (!group.label) {
              return (
                <div key={group.id} className="px-3 mb-2">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link 
                        key={item.path} 
                        to={item.path} 
                        onClick={closeSidebar}
                        data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1 ${
                          isActive 
                            ? 'bg-amber-500/10 text-amber-500 border-l-2 border-amber-500' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              );
            }

            // Grouped items with collapsible header
            return (
              <div key={group.id} className="px-3 mb-1">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                    hasActiveItem ? 'text-amber-500' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="h-3.5 w-3.5" />
                    {group.label}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="mt-1 ml-2 border-l border-white/10 pl-2">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link 
                          key={item.path} 
                          to={item.path} 
                          onClick={closeSidebar}
                          data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                            isActive 
                              ? 'bg-amber-500/10 text-amber-500' 
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-white/10 space-y-1">
          {/* Sound Toggle */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleSound}
            className={`w-full justify-start h-9 ${soundEnabled ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            data-testid="admin-sound-toggle"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
            {soundEnabled ? 'Sound: On' : 'Sound: Off'}
          </Button>
          {/* Add to Home Screen - Mobile Only */}
          <div className="lg:hidden">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setShowInstallModal(true); closeSidebar(); }}
              className="w-full justify-start text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-9"
              data-testid="admin-add-to-home"
            >
              <Smartphone className="h-4 w-4 mr-2" />Add to Home Screen
            </Button>
          </div>
          <Link to="/" onClick={closeSidebar}>
            <Button variant="ghost" size="sm" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 h-9" data-testid="admin-view-site">
              <Home className="h-4 w-4 mr-2" />View Store
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9" data-testid="admin-logout">
            <LogOut className="h-4 w-4 mr-2" />Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6">{children}</div>
      </main>

      {/* Add to Home Screen Instructions Modal */}
      <Dialog open={showInstallModal} onOpenChange={setShowInstallModal}>
        <DialogContent className="w-[calc(100%-32px)] sm:max-w-[450px] p-0 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-white/10 text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Add to Home Screen</h2>
            <p className="text-white/60 text-sm mt-2">Install Admin Panel for quick access</p>
          </div>

          {/* Instructions */}
          <div className="p-6 space-y-6">
            {/* Android Instructions */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67a.643.643 0 00-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 002 18h20a10.78 10.78 0 00-4.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
                  </svg>
                </div>
                <h3 className="text-white font-semibold">Android (Chrome)</h3>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3 text-white/80">
                  <span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                  <span>Tap the <strong className="text-white">⋮ menu</strong> (3 dots) in the top right corner of Chrome</span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                  <span>Tap <strong className="text-white">"Add to Home screen"</strong> or <strong className="text-white">"Install app"</strong></span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                  <span>Tap <strong className="text-white">"Add"</strong> to confirm</span>
                </li>
              </ol>
            </div>

            {/* iOS Instructions */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <h3 className="text-white font-semibold">iPhone / iPad (Safari)</h3>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3 text-white/80">
                  <span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                  <span>Open this site in <strong className="text-white">Safari</strong> browser</span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                  <span>Tap the <strong className="text-white">Share button</strong> (square with arrow) at the bottom</span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                  <span>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <span className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                  <span>Tap <strong className="text-white">"Add"</strong> in the top right</span>
                </li>
              </ol>
            </div>

            {/* Benefits */}
            <div className="text-center pt-2">
              <p className="text-white/40 text-xs">
                ✓ Quick access from home screen<br/>
                ✓ Faster loading<br/>
                ✓ Works like a native app
              </p>
            </div>
          </div>

          {/* Close Button */}
          <div className="p-4 border-t border-white/10">
            <Button 
              onClick={() => setShowInstallModal(false)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
