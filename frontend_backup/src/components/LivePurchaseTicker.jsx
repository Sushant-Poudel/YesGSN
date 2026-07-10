import { useEffect, useState } from 'react';
import { ShoppingBag, MapPin } from 'lucide-react';
import { recentPurchasesAPI } from '@/lib/api';

export default function LivePurchaseTicker() {
  const [purchases, setPurchases] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await recentPurchasesAPI.get(10);
        setPurchases(res.data);
      } catch (error) {
        console.error('Failed to fetch recent purchases:', error);
      }
    };
    fetchPurchases();
    
    // Refresh purchases every 5 minutes
    const refreshInterval = setInterval(fetchPurchases, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (purchases.length === 0) return;

    // Show first notification after 3 seconds
    const initialDelay = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, 3000);

    // Cycle through purchases
    const cycleInterval = setInterval(() => {
      setIsAnimating(false);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % purchases.length);
        setIsAnimating(true);
      }, 500);
    }, 8000); // Show each for 8 seconds

    // Hide after 5 seconds of showing
    const hideTimeout = setInterval(() => {
      setTimeout(() => {
        setIsAnimating(false);
      }, 5000);
    }, 8000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(cycleInterval);
      clearInterval(hideTimeout);
    };
  }, [purchases.length]);

  if (purchases.length === 0 || !isVisible) return null;

  const currentPurchase = purchases[currentIndex];

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 transition-all duration-500 ${
        isAnimating ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}
    >
      <div className="bg-card border border-white/10 rounded-lg shadow-xl p-3 max-w-[300px] backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="h-5 w-5 text-green-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium">
              <span className="text-gold-500">{currentPurchase.name}</span> just purchased
            </p>
            <p className="text-white/80 text-xs truncate mt-0.5">
              {currentPurchase.product}
            </p>
            <div className="flex items-center gap-2 mt-1 text-white/50 text-[10px]">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {currentPurchase.location}
              </span>
              <span>•</span>
              <span>{currentPurchase.time_ago}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
