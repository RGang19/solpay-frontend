import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ParticleBackground from '@/components/ParticleBackground';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';

type VerifyOtpResponse = {
  token: string;
  user: {
    id: string;
    name?: string | null;
    phone: string;
    wallet_address: string;
  };
  message: string;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const normalizedPhone = phone.trim();
  const canSubmitPhone = normalizedPhone.length >= 10;
  const canSubmitOtp = otp.length === 6;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitPhone || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      if (data.otp) {
        setOtp(data.otp);
      }

      setStage('otp');
      toast({
        title: 'OTP sent',
        description: `Your OTP is: ${data.otp}`,
      });
    } catch (error) {
      toast({
        title: 'Could not send OTP',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitOtp || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: normalizedPhone, otp }),
      });

      const data: VerifyOtpResponse | { error?: string } = await response.json();

      if (!response.ok || !('token' in data)) {
        throw new Error(('error' in data && data.error) || 'Failed to verify OTP');
      }

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));

      toast({
        title: 'Login successful',
        description: `Welcome back, ${data.user.phone}`,
      });

      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Invalid OTP',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetOtpStage = () => {
    if (isLoading) {
      return;
    }

    setOtp('');
    setStage('phone');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ParticleBackground />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-secondary/10 blur-[120px] animate-pulse-glow" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card-glow p-8 md:p-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 gradient-border bg-muted/50">
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="grad" x1="2" y1="2" x2="22" y2="22">
                    <stop stopColor="hsl(320, 80%, 58%)" />
                    <stop offset="0.5" stopColor="hsl(270, 70%, 55%)" />
                    <stop offset="1" stopColor="hsl(185, 80%, 50%)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="text-3xl font-bold font-heading gradient-text">SolanaPay</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {stage === 'phone'
                ? 'Sign in with your phone number to continue'
                : `Enter the 6-digit OTP sent to ${normalizedPhone}`}
            </p>
          </motion.div>

          {stage === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 bg-muted/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={!canSubmitPhone || isLoading}
                className="w-full btn-gradient h-12 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Sending OTP...' : 'Continue'}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <label className="block text-sm font-medium text-foreground/80">
                  OTP
                </label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    containerClassName="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-12 w-12 rounded-l-xl border-border/60 bg-muted/40 text-base" />
                      <InputOTPSlot index={1} className="h-12 w-12 border-border/60 bg-muted/40 text-base" />
                      <InputOTPSlot index={2} className="h-12 w-12 border-border/60 bg-muted/40 text-base" />
                      <InputOTPSlot index={3} className="h-12 w-12 border-border/60 bg-muted/40 text-base" />
                      <InputOTPSlot index={4} className="h-12 w-12 border-border/60 bg-muted/40 text-base" />
                      <InputOTPSlot index={5} className="h-12 w-12 rounded-r-xl border-border/60 bg-muted/40 text-base" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  For this mock backend, the OTP is <span className="font-semibold text-foreground">123456</span>.
                </p>
              </motion.div>

              <div className="space-y-3">
                <motion.button
                  initial={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={!canSubmitOtp || isLoading}
                  className="w-full btn-gradient h-12 text-base disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Verifying...' : 'Login'}
                </motion.button>

                <button
                  type="button"
                  onClick={resetOtpStage}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl border border-border/60 bg-muted/30 text-sm text-foreground/80 transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Change phone number
                </button>
              </div>
            </form>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-xs text-muted-foreground mt-6"
          >
            Powered by <span className="gradient-text font-medium">Solana Blockchain</span>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
