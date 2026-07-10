import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * AdBanner - Display ads from the ad management system
 * 
 * @param {string} position - Ad position (home_banner, home_sidebar, product_inline, etc.)
 * @param {string} className - Additional CSS classes
 * @param {boolean} closeable - Whether the ad can be closed
 */
export function AdBanner({ position, className = '', closeable = false }) {
  const [ad, setAd] = useState(null);
  const [visible, setVisible] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const impressionTracked = useRef(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const response = await axios.get(`${API_URL}/ads/active?position=${position}`);
        if (response.data && response.data.length > 0) {
          // Get the first (highest priority) ad for this position
          setAd(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching ad:', error);
      }
    };

    fetchAd();
  }, [position]);

  // Track impression when ad becomes visible
  useEffect(() => {
    if (ad && loaded && !impressionTracked.current) {
      impressionTracked.current = true;
      axios.post(`${API_URL}/ads/${ad.id}/impression`).catch(() => {});
    }
  }, [ad, loaded]);

  const handleClick = () => {
    if (ad && ad.target_url) {
      // Track click (fire and forget - don't block navigation)
      axios.post(`${API_URL}/ads/${ad.id}/click`).catch(() => {});
      // Open target URL immediately
      window.open(ad.target_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClose = (e) => {
    e.stopPropagation();
    setVisible(false);
  };

  if (!ad || !visible) return null;

  return (
    <div 
      className={`relative cursor-pointer overflow-hidden rounded-xl ${className}`}
      onClick={handleClick}
      data-testid={`ad-banner-${position}`}
    >
      <img
        src={ad.image_url}
        alt={ad.alt_text || ad.name}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          e.target.style.display = 'none';
          setVisible(false);
        }}
      />
      
      {/* Ad label */}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white/70">
        Ad
      </div>
      
      {/* Close button */}
      {closeable && (
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1 rounded-full hover:bg-black/80 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      )}
    </div>
  );
}

/**
 * AdPopup - Popup advertisement
 */
export function AdPopup({ delay = 5000, showOnce = true }) {
  const [ad, setAd] = useState(null);
  const [visible, setVisible] = useState(false);
  const impressionTracked = useRef(false);

  useEffect(() => {
    // Check if already shown
    if (showOnce && sessionStorage.getItem('ad_popup_shown')) {
      return;
    }

    const fetchAd = async () => {
      try {
        const response = await axios.get(`${API_URL}/ads/active?position=popup`);
        if (response.data && response.data.length > 0) {
          setAd(response.data[0]);
          
          // Show after delay
          setTimeout(() => {
            setVisible(true);
            if (showOnce) {
              sessionStorage.setItem('ad_popup_shown', 'true');
            }
          }, delay);
        }
      } catch (error) {
        console.error('Error fetching popup ad:', error);
      }
    };

    fetchAd();
  }, [delay, showOnce]);

  // Track impression when visible
  useEffect(() => {
    if (ad && visible && !impressionTracked.current) {
      impressionTracked.current = true;
      axios.post(`${API_URL}/ads/${ad.id}/impression`).catch(() => {});
    }
  }, [ad, visible]);

  const handleClick = () => {
    if (ad && ad.target_url) {
      // Track click (fire and forget - don't block navigation)
      axios.post(`${API_URL}/ads/${ad.id}/click`).catch(() => {});
      // Open target URL immediately
      window.open(ad.target_url, '_blank', 'noopener,noreferrer');
    }
    setVisible(false);
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!ad || !visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative max-w-lg w-full animate-in zoom-in-95 duration-300">
        <button
          onClick={handleClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div 
          className="relative rounded-2xl overflow-hidden cursor-pointer shadow-2xl"
          onClick={handleClick}
        >
          <img
            src={ad.image_url}
            alt={ad.alt_text || ad.name}
            className="w-full h-auto"
          />
          
          {/* Ad label */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white/70">
            Advertisement
          </div>
        </div>
        
        <p className="text-center text-white/50 text-sm mt-3">
          Click anywhere on the ad or press X to close
        </p>
      </div>
    </div>
  );
}

/**
 * InlineAd - Ad that appears between content
 */
export function InlineAd({ position = 'product_inline', className = '' }) {
  const [ad, setAd] = useState(null);
  const impressionTracked = useRef(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const response = await axios.get(`${API_URL}/ads/active?position=${position}`);
        if (response.data && response.data.length > 0) {
          setAd(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching ad:', error);
      }
    };

    fetchAd();
  }, [position]);

  useEffect(() => {
    if (ad && !impressionTracked.current) {
      impressionTracked.current = true;
      axios.post(`${API_URL}/ads/${ad.id}/impression`).catch(() => {});
    }
  }, [ad]);

  const handleClick = () => {
    if (ad && ad.target_url) {
      // Track click (fire and forget - don't block navigation)
      axios.post(`${API_URL}/ads/${ad.id}/click`).catch(() => {});
      // Open target URL immediately
      window.open(ad.target_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!ad) return null;

  return (
    <div 
      className={`relative cursor-pointer overflow-hidden rounded-xl border border-white/10 ${className}`}
      onClick={handleClick}
    >
      <img
        src={ad.image_url}
        alt={ad.alt_text || ad.name}
        className="w-full h-auto"
      />
      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white/50">
        Sponsored
      </div>
    </div>
  );
}

export default AdBanner;
