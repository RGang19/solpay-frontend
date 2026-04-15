import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import ParticleBackground from '@/components/ParticleBackground';
import { ArrowLeft, Copy, Check, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type UserProfile = {
  id: string;
  phone: string;
  wallet_address: string;
};

const Receive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/');
      return;
    }

    const loadUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data: UserProfile | { error?: string } = await response.json();
        if (!response.ok || !('wallet_address' in data)) {
          throw new Error(('error' in data && data.error) || 'Failed to load wallet address');
        }

        setWalletAddress(data.wallet_address);
      } catch (error) {
        toast({
          title: 'Could not load wallet',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      }
    };

    void loadUser();
  }, [navigate, toast]);

  const handleCopy = async () => {
    if (!walletAddress) return;
    const text = walletAddress;

    const handleSuccess = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Address Copied', description: 'Wallet address copied to clipboard.' });
    };

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        handleSuccess();
      } catch (err) {
        // Fallback if clipboard API fails
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        handleSuccess();
      }
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        handleSuccess();
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleShare = async () => {
    if (!walletAddress) {
      return;
    }

    if (navigator.share) {
      await navigator.share({ title: 'My Solana Address', text: walletAddress });
    } else {
      await handleCopy();
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 max-w-md mx-auto px-4 py-6 min-h-screen flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-xl font-heading font-semibold text-foreground">Receive SOL</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="glass-card-glow p-8 mb-6 flex flex-col items-center gradient-border"
        >
          <p className="text-sm text-muted-foreground mb-5">
            Scan this QR code to send SOL
          </p>

          <div className="relative p-4 rounded-2xl bg-foreground mb-6">
            <QRCodeSVG
              value={walletAddress ? `solana:${walletAddress}` : 'solana:loading'}
              size={200}
              bgColor="hsl(210, 40%, 96%)"
              fgColor="hsl(240, 15%, 4%)"
              level="H"
              imageSettings={{
                src: '',
                height: 0,
                width: 0,
                excavate: false,
              }}
            />
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-secondary rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-secondary rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-xl" />
          </div>

          <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
          <div 
            className="flex items-center justify-center gap-2 cursor-pointer group/address bg-white/5 hover:bg-white/10 p-3 -m-3 rounded-2xl transition-all"
            onClick={handleCopy}
          >
            <p className="text-sm font-mono text-foreground/80 text-center break-all px-2 group-hover/address:text-foreground transition-colors flex-1">
              {walletAddress || 'Loading wallet address...'}
            </p>
            <div className="shrink-0 p-1.5 rounded-lg bg-white/10 border border-white/10 opacity-0 group-hover/address:opacity-100 transition-all">
              {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className="glass-card flex items-center justify-center gap-2 py-4 hover:bg-muted/30 transition-colors"
          >
            {copied ? (
              <Check className="w-5 h-5 text-secondary" />
            ) : (
              <Copy className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={`text-sm font-medium ${copied ? 'text-secondary' : 'text-muted-foreground'}`}>
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleShare}
            className="glass-card flex items-center justify-center gap-2 py-4 hover:bg-muted/30 transition-colors"
          >
            <Share2 className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Share</span>
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 glass-card p-4 flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-sm">💡</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Universal Address</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This address accepts **SOL** and all **SPL tokens** (like USDC). Assets are automatically managed in your secure wallet.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Receive;
