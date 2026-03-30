import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ParticleBackground from '@/components/ParticleBackground';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SOL_TO_USD = 150;

type UserProfile = {
  id: string;
  phone: string;
  wallet_address: string;
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

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

const formatShortAddress = (value: string) =>
  value.length > 18 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;

const getCounterpartyLabel = (transaction: TransactionItem, currentUserId: string) => {
  const isSent = transaction.sender_id === currentUserId;
  const counterparty = isSent ? transaction.receiver : transaction.sender;
  return counterparty?.phone || counterparty?.wallet_address || 'External wallet';
};

const History = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/');
      return;
    }

    const loadHistory = async () => {
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

        if (!userResponse.ok) {
          throw new Error(userData.error || 'Failed to load user profile');
        }

        if (!transactionResponse.ok) {
          throw new Error(transactionData.error || 'Failed to load transaction history');
        }

        setUser(userData);
        setTransactions(Array.isArray(transactionData) ? transactionData : []);
      } catch (error) {
        toast({
          title: 'Could not load history',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      }
    };

    void loadHistory();
  }, [navigate, toast]);

  const summary = useMemo(() => {
    if (!user) {
      return { sent: 0, received: 0 };
    }

    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.sender_id === user.id) {
          acc.sent += transaction.amount;
        }
        if (transaction.receiver_id === user.id) {
          acc.received += transaction.amount;
        }
        return acc;
      },
      { sent: 0, received: 0 }
    );
  }, [transactions, user]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 max-w-md mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-xl font-heading font-semibold text-foreground">Transaction History</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <div className="glass-card p-4 text-center">
            <ArrowUpRight className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total Sent</p>
            <p className="text-lg font-heading font-bold text-foreground">{summary.sent.toFixed(4)} SOL</p>
          </div>
          <div className="glass-card p-4 text-center">
            <ArrowDownLeft className="w-5 h-5 text-secondary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total Received</p>
            <p className="text-lg font-heading font-bold text-foreground">{summary.received.toFixed(4)} SOL</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <div className="space-y-1">
            {user && transactions.length > 0 ? (
              transactions.map((transaction, index) => {
                const isReceived = transaction.receiver_id === user.id;
                const tokenLabel = transaction.token || 'SOL';
                const explorerUrl = `https://solscan.io/tx/${transaction.tx_hash}?cluster=devnet`;
                const label = formatShortAddress(getCounterpartyLabel(transaction, user.id));

                return (
                  <motion.div
                    key={transaction.id || transaction.tx_hash}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + index * 0.04 }}
                    className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-sm">
                        {isReceived ? <ArrowDownLeft className="w-4 h-4 text-secondary" /> : <ArrowUpRight className="w-4 h-4 text-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{label}</p>
                          <a 
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline font-medium"
                          >
                            Explorer
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDateTime(transaction.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isReceived ? 'text-secondary' : 'text-foreground'}`}>
                        {isReceived ? '+' : '-'}{transaction.amount.toFixed(tokenLabel === 'USDC' ? 2 : 4)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">{tokenLabel}</p>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No transactions found for this wallet yet.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default History;
