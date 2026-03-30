import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ParticleBackground from '@/components/ParticleBackground';
import { ShieldCheck, ArrowRight, Wallet, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type PaymentRequest = {
  id: string;
  amount: number;
  token: string;
  status: string;
  label: string | null;
  message: string | null;
  merchant: {
    name: string | null;
    phone: string;
    wallet_address: string;
  };
};

const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await fetch(`${API_URL}/api/requests/${id}`);
        const data = await response.json();
        if (response.ok) {
          setRequest(data);
          if (data.status === 'PAID') setIsSuccess(true);
        } else {
          toast({
            title: 'Request not found',
            description: 'This payment link might be invalid or expired.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to fetch request:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) void fetchRequest();
  }, [id, toast]);

  const handlePay = async () => {
    if (!request || isProcessing) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      toast({
        title: 'Login Required',
        description: 'Please log in to your SolPay account to complete this payment.',
      });
      navigate('/', { state: { from: `/checkout/${id}` } });
      return;
    }

    setIsProcessing(true);
    try {
      // Use the existing payment endpoint but target the merchant's phone/address
      const response = await fetch(`${API_URL}/api/payments/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: request.merchant.phone,
          amount: request.amount,
          token: request.token,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Payment failed');

      // Update request status in backend to 'PAID'
      await fetch(`${API_URL}/api/requests/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'PAID', tx_hash: data.transaction.tx_hash }),
      });

      setIsSuccess(true);
      toast({
        title: 'Payment Successful',
        description: `Sent ${request.amount} ${request.token} to ${request.merchant.name || 'Merchant'}.`,
      });
    } catch (error) {
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Please check your balance and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(true); // Keep it "processing" visually until success state shows
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div>
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Invalid Request</h2>
          <p className="text-muted-foreground mb-6">This payment link is no longer active.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-gradient px-6 py-3 rounded-xl font-bold">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A051C]">
      <ParticleBackground />

      <div className="relative z-10 max-w-md mx-auto px-6 py-12 min-h-screen flex flex-col justify-center">
        {isSuccess ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-secondary/20 border-t-secondary animate-[spin_3s_linear_infinite]">
                 <CheckCircle2 className="w-12 h-12 text-secondary" />
            </div>
            <h2 className="text-3xl font-heading font-bold text-white mb-2">Payment Complete</h2>
            <p className="text-muted-foreground mb-8">Your transaction has been confirmed on Solana.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors"
            >
              Return Home
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-8"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20">
                <ShoppingBag className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-sm font-bold text-primary uppercase tracking-[0.2em] mb-2">Checkout</h1>
              <h2 className="text-3xl font-heading font-bold text-white">{request.merchant.name || 'SolPay Merchant'}</h2>
              <p className="text-muted-foreground text-sm mt-1">{request.merchant.phone}</p>
            </div>

            <div className="glass-card-glow p-8 text-center space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount to Pay</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-heading font-bold text-white">{request.amount}</span>
                  <span className="text-lg font-bold text-primary">{request.token}</span>
                </div>
              </div>
              
              {request.label && (
                <div className="pt-4 border-t border-white/5">
                  <p className="text-sm font-medium text-white">{request.label}</p>
                  {request.message && <p className="text-xs text-muted-foreground mt-1">{request.message}</p>}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <span>Secured by Solana Devnet Smart Contracts</span>
              </div>

              <button
                onClick={handlePay}
                disabled={isProcessing}
                className="w-full h-16 rounded-2xl btn-gradient flex items-center justify-center gap-3 text-white font-bold text-lg shadow-[0_0_40px_rgba(236,72,153,0.3)] disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : (
                  <>
                    <Wallet className="w-5 h-5" />
                    Pay Now
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/10 transition-all"
              >
                Cancel Payment
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
