import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ParticleBackground from '@/components/ParticleBackground';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Phone, Wallet, QrCode, ScanLine, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SOL_TO_USD = 150;
const USDC_TO_USD = 1;

type SendResponse = {
  message: string;
  transaction: {
    id: string;
    amount: number;
    tx_hash: string;
    status: string;
  };
};

type TransactionItem = {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  sender?: { phone?: string; wallet_address?: string };
  receiver?: { phone?: string; wallet_address?: string };
};

type UserProfile = {
  id: string;
  phone: string;
};

type RecentContact = {
  label: string;
  value: string;
  kind: 'phone' | 'wallet';
};

type LocationState = {
  address?: string;
};

type RecipientMode = 'phone' | 'wallet' | 'qr' | 'contacts';

const modeOptions: Array<{
  id: RecipientMode;
  label: string;
  description: string;
  icon: typeof Phone;
}> = [
  {
    id: 'phone',
    label: 'Mobile Number',
    description: 'Send to a registered phone number',
    icon: Phone,
  },
  {
    id: 'wallet',
    label: 'Wallet Address',
    description: 'Paste a Solana wallet address',
    icon: Wallet,
  },
  {
    id: 'qr',
    label: 'QR Payment',
    description: 'Scan a QR and pay instantly',
    icon: QrCode,
  },
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'Pick from recent payees',
    icon: Users,
  },
];

const SendMoney = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [token, setToken] = useState<'SOL' | 'USDC'>('SOL');
  const [mode, setMode] = useState<RecipientMode>('phone');
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.address) {
      setRecipient(state.address);
      setMode('qr');
    }
  }, [location.state]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return;
    }

    const loadContacts = async () => {
      try {
        const [userResponse, transactionResponse] = await Promise.all([
          fetch(`${API_URL}/api/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/transactions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const userData = await userResponse.json();
        const transactionData = await transactionResponse.json();

        if (userResponse.ok) {
          setUser(userData);
        }

        if (transactionResponse.ok && Array.isArray(transactionData)) {
          setTransactions(transactionData);
        }
      } catch {
        // Contacts are a convenience feature; keep the send page usable even if this fetch fails.
      }
    };

    void loadContacts();
  }, []);

  const recentContacts = useMemo<RecentContact[]>(() => {
    if (!user) {
      return [];
    }

    const uniqueContacts = new Map<string, RecentContact>();

    for (const transaction of transactions) {
      const isSent = transaction.sender_id === user.id;
      const counterparty = isSent ? transaction.receiver : transaction.sender;
      if (!counterparty) {
        continue;
      }

      const phone = counterparty.phone?.trim();
      const wallet = counterparty.wallet_address?.trim();
      const value = phone || wallet;
      if (!value || uniqueContacts.has(value)) {
        continue;
      }

      uniqueContacts.set(value, {
        label: phone || wallet || 'Recent contact',
        value,
        kind: phone ? 'phone' : 'wallet',
      });
    }

    return Array.from(uniqueContacts.values()).slice(0, 10);
  }, [transactions, user]);

  const numericAmount = Number(amount);
  const canSend = recipient.trim().length > 0 && Number.isFinite(numericAmount) && numericAmount > 0;

  const getPlaceholder = () => {
    if (mode === 'phone') {
      return 'Enter mobile number';
    }
    if (mode === 'wallet') {
      return 'Paste full wallet address';
    }
    if (mode === 'contacts') {
      return 'Tap a recent contact below';
    }
    return 'Scanned wallet address will appear here';
  };

  const getHelperText = () => {
    if (mode === 'phone') {
      return 'Use the receiver phone number saved in the backend.';
    }
    if (mode === 'wallet') {
      return 'Use a full Solana wallet address for direct transfer.';
    }
    if (mode === 'contacts') {
      return recentContacts.length > 0
        ? 'Choose one of your recent payment contacts.'
        : 'Your recent contacts will appear here after you send or receive payments.';
    }
    return recipient
      ? 'QR scanned successfully. You can review the address before sending.'
      : 'Open the scanner to capture a wallet QR code.';
  };

  const handleSend = async () => {
    if (!canSend || isSending) {
      return;
    }

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      toast({
        title: 'Login required',
        description: 'Please log in before sending funds.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setIsSending(true);

    try {
      let finalRecipient = recipient.trim();
      if (finalRecipient.toLowerCase().startsWith('solana:')) {
        finalRecipient = finalRecipient.split(':')[1].split('?')[0];
      }

      const response = await fetch(`${API_URL}/api/payments/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          phone: finalRecipient,
          amount: numericAmount,
          token,
        }),
      });

      const data: SendResponse | { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(('error' in data && data.error) || 'Failed to send payment');
      }

      toast({
        title: 'Payment sent',
        description: `Sent ${numericAmount} ${token} successfully.`,
      });

      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Send failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleContactSelect = (contact: RecentContact) => {
    setRecipient(contact.value);
    setMode(contact.kind);
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
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-xl font-heading font-semibold text-foreground">Send Payment</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-glow p-6 mb-6 text-center"
        >
          <div className="flex justify-center gap-4 mb-4">
            {['SOL', 'USDC'].map((t) => (
              <button
                key={t}
                onClick={() => setToken(t as 'SOL' | 'USDC')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  token === t
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <input
              type="number"
              min="0"
              step={token === 'SOL' ? "0.000001" : "0.01"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-transparent text-4xl font-heading font-bold text-center w-40 outline-none gradient-text placeholder:text-muted-foreground/30"
              style={{ WebkitTextFillColor: 'inherit' }}
            />
            <span className={`text-lg font-medium transition-colors ${token === 'USDC' ? 'text-secondary' : 'text-muted-foreground'}`}>{token}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            ≈ ${((numericAmount || 0) * (token === 'SOL' ? SOL_TO_USD : USDC_TO_USD)).toFixed(2)} USD
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 mb-4"
        >
          <p className="text-sm font-heading font-semibold text-foreground mb-3">Choose Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            {modeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setMode(option.id)}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  mode === option.id
                    ? 'border-primary/60 bg-primary/10 shadow-[0_0_30px_rgba(236,72,153,0.15)]'
                    : 'border-border/50 bg-muted/20 hover:bg-muted/30'
                }`}
              >
                <option.icon className={`w-5 h-5 mb-3 ${mode === option.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-heading font-semibold text-foreground">Recent Recipient</h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{recentContacts.length} total</span>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none -mx-4 px-4">
            {recentContacts.map((contact) => (
              <button
                key={contact.value}
                onClick={() => handleContactSelect(contact)}
                className="flex flex-col items-center gap-2 min-w-[70px] group transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
                  recipient === contact.value 
                    ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(236,72,153,0.2)]' 
                    : 'bg-muted/30 border-border/50 hover:bg-muted/50 group-hover:border-primary/30'
                }`}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <span className="text-sm font-bold gradient-text">
                      {contact.kind === 'phone' ? 'P' : 'W'}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-medium truncate w-16 text-center transition-colors ${
                  recipient === contact.value ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {contact.label.length > 12 ? `${contact.label.slice(0, 4)}...` : contact.label}
                </span>
              </button>
            ))}
            {recentContacts.length === 0 && (
              <div className="w-full py-4 text-center glass-card border-dashed">
                <p className="text-xs text-muted-foreground">No recent recipients found</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 flex-1 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            {mode === 'phone' && <Phone className="w-5 h-5 text-primary" />}
            {mode === 'wallet' && <Wallet className="w-5 h-5 text-primary" />}
            {mode === 'qr' && <QrCode className="w-5 h-5 text-primary" />}
            {mode === 'contacts' && <Users className="w-5 h-5 text-primary" />}
            <div>
              <p className="text-sm font-medium text-foreground">
                {mode === 'phone' && 'Pay using mobile number'}
                {mode === 'wallet' && 'Pay using wallet address'}
                {mode === 'qr' && 'Pay using QR code'}
                {mode === 'contacts' && 'Pay using recent contacts'}
              </p>
              <p className="text-xs text-muted-foreground">{getHelperText()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={getPlaceholder()}
              readOnly={mode === 'qr' && !recipient}
              className="h-12 bg-muted/50 border-border/50 rounded-xl text-sm"
            />

            {mode === 'qr' && (
              <button
                onClick={() => navigate('/scan')}
                className="w-full rounded-xl border border-border/60 bg-muted/30 py-3 text-sm text-foreground transition hover:bg-muted/40 flex items-center justify-center gap-2"
              >
                <ScanLine className="w-4 h-4" />
                {recipient ? 'Scan Another QR' : 'Open QR Scanner'}
              </button>
            )}

            {mode === 'contacts' && (
              <div className="space-y-2">
                {recentContacts.length > 0 ? (
                  recentContacts.map((contact) => (
                    <button
                      key={contact.value}
                      onClick={() => handleContactSelect(contact)}
                      className={`w-full rounded-2xl border p-3 text-left transition-all ${
                        recipient === contact.value
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-border/40 bg-muted/20 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{contact.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{contact.value}</p>
                        </div>
                        <span className="text-[11px] rounded-full bg-muted/40 px-2 py-1 text-muted-foreground">
                          {contact.kind === 'phone' ? 'Phone' : 'Wallet'}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/40 bg-muted/10 p-4 text-center">
                    <p className="text-sm text-muted-foreground">No recent contacts yet.</p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-muted/20 border border-border/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Recipient Preview</p>
              <p className="text-base font-medium text-foreground break-all">
                {recipient || 'No recipient selected yet'}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSend}
          disabled={!canSend || isSending}
          className="btn-gradient h-14 text-base disabled:opacity-40 disabled:cursor-not-allowed w-full rounded-xl"
        >
          {isSending ? 'Sending...' : 'Pay Now'}
        </motion.button>
      </div>
    </div>
  );
};

export default SendMoney;
