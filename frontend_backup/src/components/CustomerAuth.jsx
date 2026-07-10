import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, KeyRound, Loader2, Phone, X, User } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_8ec93a6a-4f80-4dde-b760-4bc71482fa44/artifacts/4uqt5osn_Staff.zip%20-%201.png";

// Google Icon SVG Component
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function CustomerAuthModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('email'); // 'email', 'otp', or 'complete-profile'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingGoogleCustomer, setPendingGoogleCustomer] = useState(null);
  const [pendingToken, setPendingToken] = useState(null);

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      const response = await axios.post(`${API_URL}/customers/google-auth`, {
        credential: credentialResponse.credential
      });
      
      // Check if profile completion is needed
      if (response.data.needs_profile_completion) {
        // Store token and customer data temporarily
        setPendingToken(response.data.token);
        setPendingGoogleCustomer(response.data.customer);
        setName(response.data.customer.name || '');
        setWhatsappNumber(response.data.customer.whatsapp_number || '');
        setStep('complete-profile');
        toast.info('Please complete your profile to continue');
      } else {
        // Profile is complete, proceed with login
        localStorage.setItem('customer_token', response.data.token);
        localStorage.setItem('customer_info', JSON.stringify(response.data.customer));
        
        // Dispatch custom event to notify Navbar of login
        window.dispatchEvent(new Event('customerLogin'));
        
        toast.success(`Welcome${response.data.customer.name ? ', ' + response.data.customer.name : ''}!`);
        onSuccess && onSuccess(response.data.customer);
        onClose();
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error(error.response?.data?.detail || 'Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!whatsappNumber.trim()) {
      toast.error('Please enter your WhatsApp number');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/customers/complete-profile`,
        { name: name.trim(), whatsapp_number: whatsappNumber.trim() },
        { headers: { Authorization: `Bearer ${pendingToken}` } }
      );
      
      // Now complete the login
      localStorage.setItem('customer_token', pendingToken);
      localStorage.setItem('customer_info', JSON.stringify(response.data.customer));
      
      // Dispatch custom event to notify Navbar of login
      window.dispatchEvent(new Event('customerLogin'));
      
      toast.success(`Welcome, ${response.data.customer.name}!`);
      onSuccess && onSuccess(response.data.customer);
      onClose();
      
      // Reset state
      setPendingToken(null);
      setPendingGoogleCustomer(null);
      setName('');
      setWhatsappNumber('');
      setStep('email');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google login failed. Please try again.');
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/customer/send-otp`, {
        email: email.toLowerCase().trim(),
        name: name || email.split('@')[0],
        whatsapp_number: whatsappNumber || 'pending'
      });
      
      if (response.data.otp) {
        toast.success(`OTP sent! Debug mode: ${response.data.otp}`, { duration: 10000 });
      } else {
        toast.success('OTP sent to your email! Check your inbox.');
      }
      setStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/customer/verify-otp`, {
        email: email.toLowerCase().trim(),
        otp: otp
      });
      
      const customer = response.data.customer;
      const token = response.data.token;
      
      // Check if profile is incomplete (no name or no whatsapp number)
      if (!customer.name || !customer.whatsapp_number) {
        setPendingToken(token);
        setPendingGoogleCustomer(customer);
        setName(customer.name || '');
        setWhatsappNumber(customer.whatsapp_number || whatsappNumber || '');
        setStep('complete-profile');
        toast.info('Almost there! Please complete your profile');
        return;
      }
      
      localStorage.setItem('customer_token', token);
      localStorage.setItem('customer_info', JSON.stringify(customer));
      
      // Dispatch custom event to notify Navbar of login
      window.dispatchEvent(new Event('customerLogin'));
      
      toast.success('Login successful! Welcome back');
      onSuccess && onSuccess(customer);
      onClose();
      
      setEmail('');
      setName('');
      setOtp('');
      setStep('email');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/customer/send-otp`, {
        email: email.toLowerCase().trim(),
        name: name || email.split('@')[0],
        whatsapp_number: whatsappNumber || 'pending'
      });
      toast.success('New OTP sent!');
      setOtp('');
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-32px)] sm:max-w-[400px] p-0 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden" data-testid="customer-auth-modal">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-white/40 hover:text-white/70 transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
              <img src={LOGO_URL} alt="GSN" className="h-10 w-auto" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">
              {step === 'email' ? 'Welcome Back' : step === 'otp' ? 'Enter OTP' : 'Complete Your Profile'}
            </h2>
            <p className="text-white/50 mt-1 text-sm">
              {step === 'email' 
                ? 'Sign in to your account'
                : step === 'otp'
                  ? `We've sent a 6-digit code to ${email}`
                  : 'Please provide your details to continue'
              }
            </p>
          </div>

          {step === 'complete-profile' ? (
            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div>
                <Label htmlFor="profile-name" className="text-white/70 font-medium text-sm">Your Name *</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    id="profile-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pl-10 h-11 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 placeholder:text-white/30"
                    required
                    data-testid="profile-name-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="profile-whatsapp" className="text-white/70 font-medium text-sm">WhatsApp Number *</Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    id="profile-whatsapp"
                    type="tel"
                    placeholder="Enter your WhatsApp number"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pl-10 h-11 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 placeholder:text-white/30"
                    required
                    data-testid="profile-whatsapp-input"
                  />
                </div>
                <p className="text-xs text-white/40 mt-1.5">We'll use this to send you order updates</p>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-11 rounded-xl mt-2"
                disabled={loading || !name.trim() || !whatsappNumber.trim()}
                data-testid="complete-profile-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>

              {pendingGoogleCustomer?.email && (
                <p className="text-center text-white/30 text-xs mt-4">
                  Signed in as {pendingGoogleCustomer.email}
                </p>
              )}
            </form>
          ) : step === 'email' ? (
            <>
              {/* Form */}
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-white/70 font-medium text-sm">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/5 border-white/10 text-white pl-10 h-11 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 placeholder:text-white/30"
                      required
                      data-testid="customer-email-input"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-11 rounded-xl mt-2"
                  disabled={loading}
                  data-testid="send-otp-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    'Sign In with OTP'
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-white/30 text-xs">OR</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              {/* Google Sign In */}
              <div className="flex justify-center" data-testid="google-login-container">
                {googleLoading ? (
                  <div className="w-full h-11 rounded-xl bg-white/5 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-white/50" />
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false}
                    theme="filled_black"
                    size="large"
                    width="100%"
                    text="continue_with"
                    shape="pill"
                  />
                )}
              </div>

              <p className="text-center text-white/30 text-xs mt-5">
                Sign in with your email or Google account
              </p>
            </>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <Label htmlFor="otp" className="text-white/70 font-medium text-sm">Enter OTP</Label>
                <div className="relative mt-1.5">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="bg-white/5 border-white/10 text-white pl-10 h-11 rounded-xl text-center text-lg font-mono tracking-widest focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 placeholder:text-white/30"
                    maxLength={6}
                    required
                    data-testid="otp-input"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-white/30 mt-2 text-center">
                  Code expires in 10 minutes
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-11 rounded-xl"
                disabled={loading || otp.length !== 6}
                data-testid="verify-otp-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </Button>

              <div className="flex items-center justify-between text-sm pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                  }}
                  className="text-white/50 hover:text-white/70"
                >
                  ← Change Email
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-amber-500 hover:text-amber-400 font-medium disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if customer is logged in
export function useCustomerAuth() {
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    const customerInfo = localStorage.getItem('customer_info');
    
    if (token && customerInfo) {
      try {
        setCustomer(JSON.parse(customerInfo));
      } catch (e) {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_info');
      }
    }
    setIsLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    setCustomer(null);
    toast.success('Logged out successfully');
  };

  const login = (customerData) => {
    setCustomer(customerData);
  };

  return { customer, isLoading, logout, login, isAuthenticated: !!customer };
}
