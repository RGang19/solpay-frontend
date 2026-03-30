import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleBackground from '@/components/ParticleBackground';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  QrCode, 
  Clock, 
  Send, 
  LogOut, 
  Wallet, 
  ShoppingBag, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  DollarSign,
  Pencil,
  X 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SOL_TO_USD = 150;

type UserProfile = {
  id: string;
  name?: string | null;
  phone: string;
  wallet_address: string;
  balance: number;
  usdcBalance: number;
  is_merchant: boolean;
};

type TransactionItem = {
  id: string;
  amount: number;
  tx_hash: string;
  token: string;
  created_at: string;
  sender_id: string | null;
  receiver_id: string | null;
  sender?: { phone?: string; wallet_address?: string };
  receiver?: { phone?: string; wallet_address?: string };
};

type PaymentRequest = {
  id: string;
  amount: number;
  token: string;
  status: string;
  label: string | null;
  message: string | null;
  created_at: string;
};

const quickActions = [
  { icon: Send, label: 'Send', color: 'from-primary to-accent', path: '/send' },
  { icon: ArrowDownLeft, label: 'Receive', color: 'from-secondary to-accent', path: '/receive' },
  { icon: QrCode, label: 'Scan QR', color: 'from-accent to-primary', path: '/scan' },
  { icon: Clock, label: 'History', color: 'from-primary to-secondary', path: '/history' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

const formatShortAddress = (value: string) =>
  value.length > 14 ? `${value.slice(0, 4)}...${value.slice(-4)}` : value;

const formatRelativeTime = (value: string) => {
  const diffMs = new Date(value).getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.round(diffMs / (1000 * 60));
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(days, 'day');
};

const getCounterpartyLabel = (transaction: TransactionItem, currentUserId: string) => {
  const isSent = transaction.sender_id === currentUserId;
  const counterparty = isSent ? transaction.receiver : transaction.sender;
  return counterparty?.phone || counterparty?.wallet_address || 'External wallet';
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeView, setActiveView] = useState<'personal' | 'merchant'>('personal');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/');
      return;
    }

    const loadDashboard = async () => {
      try {
        const [userResponse, transactionResponse] = await Promise.all([
          fetch(`${API_URL}/api/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/transactions/all`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const userData = await userResponse.json();
        const transactionData = await transactionResponse.json();

        if (!userResponse.ok) throw new Error(userData.error || 'Failed to load user profile');
        if (!transactionResponse.ok) throw new Error(transactionData.error || 'Failed to load transactions');

        setUser(userData);
        setNameDraft(userData.name || '');
        setTransactions(Array.isArray(transactionData) ? transactionData : []);
      } catch (error) {
        toast({
          title: 'Could not load dashboard',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, [navigate, toast]);

  useEffect(() => {
    if (activeView === 'merchant' && user?.is_merchant) {
      const fetchRequests = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;
        try {
          const response = await fetch(`${API_URL}/api/requests/merchant`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          const data = await response.json();
          if (response.ok) setPaymentRequests(data);
        } catch (e) {
          console.error(e);
        }
      };
      void fetchRequests();
    }
  }, [activeView, user?.is_merchant]);

  const recentTransactions = user ? transactions.slice(0, 5) : [];
  const displayName = user?.name?.trim() || user?.phone || 'SolanaPay';

  const handleSaveName = async () => {
    const token = localStorage.getItem('authToken');
    if (!token || !user || isSavingName) return;
    setIsSavingName(true);
    try {
      const response = await fetch(`${API_URL}/api/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save name');
      const updatedUser = { ...user, ...data.user, balance: user.balance, usdcBalance: user.usdcBalance, is_merchant: user.is_merchant };
      setUser(updatedUser);
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      setIsEditingName(false);
      toast({ title: 'Name updated', description: 'Your profile name was saved successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleToggleMerchant = async () => {
    const token = localStorage.getItem('authToken');
    if (!token || !user || isSavingName) return;
    setIsSavingName(true);
    try {
      const newStatus = !user.is_merchant;
      const response = await fetch(`${API_URL}/api/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_merchant: newStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to toggle merchant mode');
      const updatedUser = { ...user, is_merchant: newStatus };
      setUser(updatedUser);
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      toast({
        title: newStatus ? 'Merchant Mode Enabled' : 'Merchant Mode Disabled',
        description: newStatus ? 'You can now create payment requests.' : 'Switched to personal mode.',
      });
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    navigate('/');
  };

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/checkout/${id}`;
    void navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Link Copied', description: 'Share this link with your customer.' });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A051C]">
      <ParticleBackground />

      <div className="relative z-10 max-w-md mx-auto px-4 py-6 min-h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex-1 mr-4">
            <p className="text-sm text-muted-foreground font-medium mb-1">Welcome back</p>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  autoFocus
                  className="h-10 bg-white/5 border-white/20 rounded-xl text-lg font-bold text-white px-3 min-w-[120px]"
                />
                <button
                  onClick={() => void handleSaveName()}
                  disabled={isSavingName}
                  className="w-10 h-10 rounded-xl bg-secondary/20 border border-secondary/20 flex items-center justify-center text-secondary hover:bg-secondary/30 transition-colors shrink-0"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <h2 className="text-2xl font-heading font-bold text-white leading-none">
                  {displayName}
                </h2>
                <button
                  onClick={() => {
                    setNameDraft(user?.name || '');
                    setIsEditingName(true);
                  }}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-white/10"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-white" />
                </button>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-[0.2em] mt-2 opacity-60">
              {user?.phone}
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 flex items-center justify-center shadow-lg">
              <span className="text-lg font-bold gradient-text">
                {(user?.name?.trim() || user?.phone || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* View Switcher */}
        <div className="flex p-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl mb-8 self-center w-full max-w-[280px]">
          <button
            onClick={() => setActiveView('personal')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeView === 'personal' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" /> Wallet
          </button>
          <button
            onClick={() => setActiveView('merchant')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeView === 'merchant' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Merchant
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeView === 'personal' ? (
            <motion.div
              key="personal"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col flex-1"
            >
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-glow p-6 mb-6 gradient-border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">SOL Balance</p>
                    <h1 className="text-3xl font-heading font-bold text-white">{isLoading ? '...' : (user?.balance || 0).toFixed(4)} SOL</h1>
                    <p className="text-xs text-muted-foreground mt-1">≈ {formatCurrency((user?.balance || 0) * SOL_TO_USD)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">USDC</p>
                    <h1 className="text-2xl font-heading font-bold text-secondary">{isLoading ? '...' : (user?.usdcBalance || 0).toFixed(2)}</h1>
                  </div>
                </div>
                {user && (
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Wallet Address</p>
                    <p className="text-xs text-muted-foreground break-all font-mono">{user.wallet_address}</p>
                  </div>
                )}
              </motion.div>

              <div className="grid grid-cols-4 gap-3 mb-6">
                {quickActions.map((action) => (
                  <button key={action.label} onClick={() => navigate(action.path)} className="flex flex-col items-center gap-2 group">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-active:scale-95 transition-transform`}>
                      <action.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{action.label}</span>
                  </button>
                ))}
              </div>

              <div className="glass-card p-4 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-semibold text-white">Recent Transactions</h3>
                  <button onClick={() => navigate('/history')} className="text-xs text-primary font-bold">See all</button>
                </div>
                <div className="space-y-1">
                  {recentTransactions.map((tx) => {
                    const isReceived = tx.receiver_id === user?.id;
                    const label = user ? getCounterpartyLabel(tx, user.id) : 'TX';
                    return (
                      <div key={tx.id || tx.tx_hash} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                            {isReceived ? <ArrowDownLeft className="w-4 h-4 text-secondary" /> : <ArrowUpRight className="w-4 h-4 text-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{formatShortAddress(label)}</p>
                            <p className="text-[10px] text-muted-foreground">{formatRelativeTime(tx.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${isReceived ? 'text-secondary' : 'text-white'}`}>{isReceived ? '+' : '-'}{tx.amount.toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono">{tx.token}</p>
                        </div>
                      </div>
                    );
                  })}
                  {recentTransactions.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="merchant"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col flex-1"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-heading font-bold text-white">Payment Links</h3>
                  <button onClick={() => navigate('/merchant')} className="text-xs px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg flex items-center gap-2">
                    <Plus className="w-3 h-3" /> New Link
                  </button>
                </div>
                <div className="space-y-4">
                  {paymentRequests.map((req) => (
                    <div key={req.id} className="glass-card p-4 group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-bold text-white">{req.label || 'Payment'}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{req.id.slice(0, 8)}</p>
                        </div>
                        <div className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${req.status === 'PAID' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>{req.status}</div>
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-white">{req.amount}</span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase font-mono">{req.token}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => copyLink(req.id)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">{copiedId === req.id ? <Check className="w-3 h-3 text-secondary" /> : <Copy className="w-3 h-3 text-muted-foreground" />}</button>
                          <button onClick={() => window.open(`/checkout/${req.id}`, '_blank')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ExternalLink className="w-3 h-3 text-muted-foreground" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {paymentRequests.length === 0 && <div className="text-center py-12 glass-card border-dashed"><p className="text-sm text-muted-foreground">No active links.</p></div>}
                </div>
                <div className="glass-card p-4 border-t border-white/5 mt-8 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Business Tools</p>
                    <p className="text-xs text-muted-foreground">Active and Ready</p>
                  </div>
                  <div className="w-10 h-6 bg-primary/20 rounded-full relative">
                    <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;
