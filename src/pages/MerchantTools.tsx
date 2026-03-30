import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleBackground from '@/components/ParticleBackground';
import { ArrowLeft, Plus, Copy, Check, ExternalLink, Clock, DollarSign, Send, ArrowDownLeft, QrCode, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

const MerchantTools = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('SOL');
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = async () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return;

    try {
      const response = await fetch(`${API_URL}/api/requests/merchant`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const authToken = localStorage.getItem('authToken');
    if (!authToken || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: Number(amount),
          token,
          label: label || null,
          message: message || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create request');

      toast({ title: 'Success', description: 'Payment link created successfully' });
      setIsCreating(false);
      setAmount('');
      setLabel('');
      setMessage('');
      fetchRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/checkout/${id}`;
    void navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Link Copied', description: 'Share this link with your customer.' });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 max-w-md mx-auto px-4 py-6 min-h-screen flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="text-xl font-heading font-semibold text-foreground">Merchant Tools</h2>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-3 mb-8"
        >
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                <action.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>

        <div className="flex items-center justify-between mb-4 border-t border-border/30 pt-6">
          <h3 className="font-heading font-semibold text-foreground">Payment Links</h3>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pb-20">
          {requests.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-border">
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">No Payment Links</h3>
              <p className="text-sm text-muted-foreground">Create your first reusable payment link to start accepting SOL or USDC.</p>
            </div>
          ) : (
            requests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 relative group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">{request.label || 'Payment Request'}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    request.status === 'PAID' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
                  }`}>
                    {request.status}
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-heading font-bold text-foreground">{request.amount}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{request.token}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyLink(request.id)}
                      className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      title="Copy Payment Link"
                    >
                      {copiedId === request.id ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <button
                      onClick={() => window.open(`/checkout/${request.id}`, '_blank')}
                      className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      title="View Checkout Page"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Modal for creating new request */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-0 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-background border-t border-border rounded-t-[2.5rem] p-8 pb-12 shadow-2xl overflow-hidden"
              >
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
                <h3 className="text-2xl font-heading font-bold text-foreground mb-6">New Payment Link</h3>
                
                <form onSubmit={handleCreateRequest} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-14 bg-muted/30 border border-border/50 rounded-2xl px-5 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <select
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-background border border-border rounded-lg px-2 py-1 text-xs font-bold"
                      >
                        <option value="SOL">SOL</option>
                        <option value="USDC">USDC</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Label (e.g. Order #123)</label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="Coffee payment"
                      className="w-full h-12 bg-muted/30 border border-border/50 rounded-2xl px-5 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Message (optional)</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Thanks for your business!"
                      className="w-full h-24 bg-muted/30 border border-border/50 rounded-2xl px-5 py-3 text-sm focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="flex-1 h-12 rounded-xl bg-muted/50 border border-border/50 text-foreground text-sm font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] btn-gradient h-12 rounded-xl text-white text-sm font-bold shadow-lg disabled:opacity-50"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Link'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MerchantTools;
