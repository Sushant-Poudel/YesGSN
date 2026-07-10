import { useState, useEffect, useCallback } from 'react';
import { Clock, Zap } from 'lucide-react';

export function FlashSaleTimer({ endTime, label = 'FLASH SALE' }) {
  const calculateTimeLeft = useCallback(() => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const difference = end - now;

    if (difference <= 0) {
      return { expired: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
      expired: false
    };
  }, [endTime]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  if (timeLeft.expired) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-600 to-amber-500 rounded-lg p-3 animate-pulse-slow" data-testid="flash-sale-timer">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-300 animate-bounce" />
          <span className="text-white font-bold uppercase tracking-wider text-sm">{label}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-white/80" />
          <span className="text-white/80 text-xs mr-2">Ends in:</span>
          
          <div className="flex items-center gap-1">
            {timeLeft.days > 0 && (
              <>
                <TimeBlock value={timeLeft.days} label="D" />
                <span className="text-white/60">:</span>
              </>
            )}
            <TimeBlock value={timeLeft.hours} label="H" />
            <span className="text-white/60">:</span>
            <TimeBlock value={timeLeft.minutes} label="M" />
            <span className="text-white/60">:</span>
            <TimeBlock value={timeLeft.seconds} label="S" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeBlock({ value, label }) {
  return (
    <div className="bg-black/30 rounded px-2 py-1 min-w-[40px] text-center">
      <span className="text-white font-mono font-bold text-lg">{String(value).padStart(2, '0')}</span>
      <span className="text-white/60 text-[10px] ml-0.5">{label}</span>
    </div>
  );
}

// Flash Sale Badge for product cards
export function FlashSaleBadge({ endTime, small = false }) {
  const calculateTimeLeft = useCallback(() => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const difference = end - now;

    if (difference <= 0) {
      return { expired: true };
    }

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      hours,
      minutes,
      expired: false
    };
  }, [endTime]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute for badge

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  if (timeLeft.expired) {
    return null;
  }

  if (small) {
    return (
      <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold animate-pulse flex items-center gap-1">
        <Zap className="w-3 h-3" />
        {timeLeft.hours}h {timeLeft.minutes}m
      </div>
    );
  }

  return (
    <div className="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold animate-pulse flex items-center gap-1">
      <Zap className="w-3 h-3" />
      <span>FLASH: {timeLeft.hours}h {timeLeft.minutes}m left</span>
    </div>
  );
}

// CSS animation (add to App.css)
export const flashSaleStyles = `
@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.9; }
}
.animate-pulse-slow {
  animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
`;

export default FlashSaleTimer;
