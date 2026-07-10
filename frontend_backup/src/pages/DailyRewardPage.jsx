import { useState, useEffect, useCallback } from 'react';
import { Gift, Flame, Calendar, Coins, Lock, CheckCircle, Star, Trophy, Users, Copy, Share2, Zap, UserPlus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useCustomer } from '@/components/CustomerAccount';
import CustomerAuthModal from '@/components/CustomerAuth';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DailyRewardPage() {
  const { customer } = useCustomer();
  const [rewardStatus, setRewardStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  
  // Referral state
  const [referralData, setReferralData] = useState(null);
  const [referralSettings, setReferralSettings] = useState(null);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  
  // Multiplier state
  const [activeMultiplier, setActiveMultiplier] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, multiplierRes, referralSettingsRes] = await Promise.all([
        axios.get(`${API}/daily-reward/settings`),
        axios.get(`${API}/multiplier/active`),
        axios.get(`${API}/referral/settings`)
      ]);
      setSettings(settingsRes.data);
      setActiveMultiplier(multiplierRes.data?.is_active ? multiplierRes.data : null);
      setReferralSettings(referralSettingsRes.data);

      if (customer?.email) {
        const [statusRes, referralRes] = await Promise.all([
          axios.get(`${API}/daily-reward/status?email=${encodeURIComponent(customer.email)}`),
          axios.get(`${API}/referral/code/${encodeURIComponent(customer.email)}`)
        ]);
        setRewardStatus(statusRes.data);
        setReferralData(referralRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customer?.email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyReferralCode = () => {
    if (referralData?.referral_code) {
      navigator.clipboard.writeText(referralData.referral_code);
      toast.success('Referral code copied to clipboard!');
    }
  };

  const handleApplyReferralCode = async () => {
    if (!referralCodeInput.trim()) {
      toast.error('Please enter a referral code');
      return;
    }

    if (referralData?.has_used_referral) {
      toast.error('You have already used a referral code');
      return;
    }

    setIsApplyingCode(true);
    try {
      const res = await axios.post(`${API}/referral/apply?referee_email=${encodeURIComponent(customer.email)}&referral_code=${encodeURIComponent(referralCodeInput.trim())}`);
      toast.success(res.data.message || 'Referral code applied successfully!');
      setReferralCodeInput('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to apply referral code');
    } finally {
      setIsApplyingCode(false);
    }
  };

  const handleClaim = async () => {
    if (!customer?.email) {
      setShowAuthModal(true);
      return;
    }

    setIsClaiming(true);
    try {
      const res = await axios.post(`${API}/daily-reward/claim?email=${encodeURIComponent(customer.email)}`);
      
      setJustClaimed(true);
      toast.success(res.data.message);
      
      // Refresh status
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to claim reward');
    } finally {
      setIsClaiming(false);
    }
  };

  const getStreakMilestones = () => {
    if (!settings?.streak_milestones) return [];
    return Object.entries(settings.streak_milestones)
      .map(([days, bonus]) => ({ days: parseInt(days), bonus }))
      .sort((a, b) => a.days - b.days);
  };

  const currentStreak = rewardStatus?.streak || 0;
  const canClaim = rewardStatus?.can_claim ?? false;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 mb-4">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-white uppercase tracking-tight">
              Daily <span className="text-gold-500">Rewards</span>
            </h1>
            <p className="text-white/60 mt-2">Login daily to earn free credits!</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !settings?.is_enabled ? (
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-8 text-center">
              <Lock className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h2 className="text-xl font-heading text-white mb-2">Daily Rewards Unavailable</h2>
              <p className="text-white/60">Daily rewards are currently disabled. Check back later!</p>
            </div>
          ) : !customer ? (
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-8 text-center">
              <Lock className="w-12 h-12 text-gold-500 mx-auto mb-4" />
              <h2 className="text-xl font-heading text-white mb-2">Login Required</h2>
              <p className="text-white/60 mb-6">Login to claim your daily rewards and build your streak!</p>
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="bg-gold-500 hover:bg-gold-600 text-black font-semibold px-8"
              >
                Login to Claim
              </Button>
            </div>
          ) : (
            <>
              {/* Main Reward Card */}
              <div className={`relative overflow-hidden rounded-2xl border-2 ${canClaim ? 'border-gold-500 bg-gradient-to-br from-zinc-900 to-zinc-800' : 'border-white/10 bg-zinc-900'} p-6 md:p-8 mb-6`}>
                {canClaim && (
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gold-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                )}
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-gold-500" />
                        <span className="text-white/60 text-sm">Today's Reward</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Coins className="w-10 h-10 text-gold-500" />
                        <span className="text-4xl md:text-5xl font-bold text-gold-500">
                          Rs {settings?.reward_amount || 10}
                        </span>
                      </div>
                      {rewardStatus?.next_streak && settings?.streak_bonus_enabled && (
                        <p className="text-white/40 text-sm mt-2">
                          Complete today to reach Day {rewardStatus.next_streak}!
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-center">
                      {canClaim ? (
                        <Button
                          onClick={handleClaim}
                          disabled={isClaiming}
                          className="bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-600 hover:to-amber-700 text-black font-bold text-lg px-10 py-6 rounded-xl transition-all hover:scale-105 shadow-lg shadow-gold-500/30"
                        >
                          {isClaiming ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                              Claiming...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Gift className="w-6 h-6" />
                              Claim Reward
                            </div>
                          )}
                        </Button>
                      ) : justClaimed ? (
                        <div className="flex flex-col items-center gap-2 animate-pulse">
                          <CheckCircle className="w-16 h-16 text-green-500" />
                          <span className="text-green-500 font-semibold">Claimed!</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="w-12 h-12 text-green-500" />
                          <span className="text-green-500 font-medium">Already Claimed</span>
                          <span className="text-white/40 text-sm">Come back tomorrow!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Streak Section */}
              <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-6 h-6 text-orange-500" />
                  <h2 className="font-heading text-xl font-bold text-white">Current Streak</h2>
                </div>

                <div className="flex items-center justify-center gap-4 py-6">
                  <div className="text-center">
                    <div className="text-5xl md:text-6xl font-bold text-orange-500">{currentStreak}</div>
                    <div className="text-white/60 text-sm mt-1">Days</div>
                  </div>
                  <Flame className={`w-12 h-12 ${currentStreak > 0 ? 'text-orange-500 animate-pulse' : 'text-white/20'}`} />
                </div>

                {currentStreak > 0 && (
                  <p className="text-center text-white/60 text-sm">
                    🔥 Keep it up! Don't break your streak!
                  </p>
                )}
              </div>

              {/* Streak Milestones */}
              {settings?.streak_bonus_enabled && getStreakMilestones().length > 0 && (
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-6 h-6 text-gold-500" />
                    <h2 className="font-heading text-xl font-bold text-white">Streak Bonuses</h2>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {getStreakMilestones().map(({ days, bonus }) => {
                      const isReached = currentStreak >= days;
                      const isNext = currentStreak < days && getStreakMilestones().findIndex(m => currentStreak < m.days) === getStreakMilestones().findIndex(m => m.days === days);
                      
                      return (
                        <div 
                          key={days}
                          className={`relative rounded-lg p-4 text-center border-2 transition-all ${
                            isReached 
                              ? 'border-green-500 bg-green-500/10' 
                              : isNext 
                                ? 'border-gold-500 bg-gold-500/10' 
                                : 'border-white/10 bg-white/5'
                          }`}
                        >
                          {isReached && (
                            <CheckCircle className="absolute -top-2 -right-2 w-6 h-6 text-green-500 bg-zinc-900 rounded-full" />
                          )}
                          <div className="flex items-center justify-center mb-2">
                            <Star className={`w-6 h-6 ${isReached ? 'text-green-500' : isNext ? 'text-gold-500' : 'text-white/30'}`} />
                          </div>
                          <div className={`font-bold text-lg ${isReached ? 'text-green-500' : isNext ? 'text-gold-500' : 'text-white/60'}`}>
                            Day {days}
                          </div>
                          <div className={`text-sm ${isReached ? 'text-green-400' : 'text-white/40'}`}>
                            +Rs {bonus} Bonus
                          </div>
                          {isNext && (
                            <div className="text-xs text-gold-500 mt-1">
                              {days - currentStreak} days left
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-center text-white/40 text-xs mt-4">
                    Reach streak milestones to earn bonus credits!
                  </p>
                </div>
              )}

              {/* Active Multiplier Banner */}
              {activeMultiplier && (
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 rounded-xl p-6 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center animate-pulse">
                        <Zap className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <p className="text-amber-500 font-bold text-lg">{activeMultiplier.name}</p>
                        <p className="text-white/60 text-sm">Limited Time Event Active!</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-amber-500">{activeMultiplier.multiplier}x</p>
                      <p className="text-white/40 text-xs">Reward Multiplier</p>
                    </div>
                  </div>
                  <p className="text-white/50 text-xs mt-3 text-center">
                    All rewards are multiplied during this event!
                  </p>
                </div>
              )}

              {/* Referral Section */}
              {referralSettings?.is_enabled && (
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-6 h-6 text-blue-500" />
                    <h2 className="font-heading text-xl font-bold text-white">Refer Friends & Earn</h2>
                  </div>

                  {/* Your Referral Code */}
                  <div className="bg-black/50 rounded-lg p-4 mb-4">
                    <p className="text-white/60 text-sm mb-2">Your Referral Code</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-zinc-800 border border-white/20 rounded-lg px-4 py-3 font-mono text-lg text-gold-500 tracking-wider">
                        {referralData?.referral_code || '--------'}
                      </div>
                      <Button
                        onClick={copyReferralCode}
                        variant="outline"
                        className="border-gold-500 text-gold-500 hover:bg-gold-500/10"
                        data-testid="copy-referral-btn"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <p className="text-white/40 text-xs mt-2">
                      Share this code with friends to earn Rs {referralSettings.referrer_reward} when they sign up!
                    </p>
                  </div>

                  {/* Referral Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-black/30 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-green-500">{referralData?.referral_count || 0}</p>
                      <p className="text-white/40 text-sm">Friends Referred</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-gold-500">Rs {referralData?.total_earned || 0}</p>
                      <p className="text-white/40 text-sm">Credits Earned</p>
                    </div>
                  </div>

                  {/* Apply Referral Code */}
                  {!referralData?.has_used_referral && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-white/60 text-sm mb-2 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Have a friend's code? Enter it below:
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={referralCodeInput}
                          onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                          placeholder="Enter referral code"
                          className="bg-black border-white/20 font-mono uppercase tracking-wider"
                          maxLength={10}
                          data-testid="referral-code-input"
                        />
                        <Button
                          onClick={handleApplyReferralCode}
                          disabled={isApplyingCode || !referralCodeInput.trim()}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          data-testid="apply-referral-btn"
                        >
                          {isApplyingCode ? 'Applying...' : 'Apply'}
                        </Button>
                      </div>
                      <p className="text-white/40 text-xs mt-2">
                        Get Rs {referralSettings.referee_reward} credits when you use a friend's code!
                      </p>
                    </div>
                  )}

                  {referralData?.has_used_referral && (
                    <div className="border-t border-white/10 pt-4">
                      <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm">You've already used a referral code</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Info Section */}
          <div className="mt-8 bg-zinc-900/50 border border-white/5 rounded-xl p-6">
            <h3 className="font-heading text-lg font-semibold text-white mb-3">How it works</h3>
            <ul className="space-y-2 text-white/60 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-gold-500">•</span>
                Login daily and claim your free credits
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-500">•</span>
                Rewards reset at 12:00 AM Nepal Time (NPT)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-500">•</span>
                Build a streak by claiming rewards on consecutive days
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-500">•</span>
                Reach streak milestones for bonus credits!
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-500">•</span>
                Missing a day will reset your streak to 0
              </li>
            </ul>
          </div>

          {/* WhatsApp Community */}
          <a
            href="https://chat.whatsapp.com/IflLM6p3peLAwoGraMeHAj"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/25 hover:bg-green-500/15 transition-colors"
            data-testid="whatsapp-community-link"
          >
            <div className="p-2.5 rounded-full bg-green-500/20 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-green-400">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.12 1.52 5.855L0 24l6.335-1.652A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82a9.78 9.78 0 01-5.29-1.546l-.38-.225-3.937 1.028 1.052-3.83-.248-.394A9.78 9.78 0 012.18 12c0-5.422 4.398-9.82 9.82-9.82 5.422 0 9.82 4.398 9.82 9.82 0 5.422-4.398 9.82-9.82 9.82z"/>
              </svg>
            </div>
            <div>
              <p className="text-green-400 font-semibold text-sm">Join our WhatsApp community for daily Giveaways!</p>
              <p className="text-white/40 text-xs mt-0.5">Tap to join</p>
            </div>
          </a>
        </div>
      </main>

      <Footer />

      <CustomerAuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={(customerData) => {
          setShowAuthModal(false);
          fetchData();
        }}
      />
    </div>
  );
}
