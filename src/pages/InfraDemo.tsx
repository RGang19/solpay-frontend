import { useEffect, useMemo, useRef, useCallback, useState, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Bell, CheckCircle2, ChevronDown, Code2, Copy, CreditCard, KeyRound, Link, LogOut, Phone, Plus, QrCode, Radio, ScanLine, Send, Shield, Unlink, Wallet } from 'lucide-react';
import { infraClient, getAvailableProviders, WALLET_PROVIDERS, type InfraPayment, type InfraUser, type InfraWallet, type NotificationItem } from '@/lib/infraClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const shortAddress = (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`;
const formatSol = (value?: number) => `${(value || 0).toLocaleString('en-US', { maximumFractionDigits: 6 })} SOL`;

const sdkSnippet = `import { SolanaAppInfraClient } from '@solana-app-infra/sdk';

const infra = new SolanaAppInfraClient({ apiUrl: 'https://api.yourapp.com' });

const walletSession = await infra.auth.loginWithWallet(window.solana);
infra.setToken(walletSession.token);

await infra.auth.sendPhoneOtp('+15551234567');
const mobileSession = await infra.auth.loginWithPhone('+15551234567', '123456');
infra.setToken(mobileSession.token);

await infra.auth.attachPhoneToWallet('+15551234567', '123456');
await infra.auth.detachWallet('attached-wallet-address');

const payment = await infra.payments.createPayment({ amount: 0.05 });
await infra.payments.sendMoney({ phone: '+15559876543', amount: 0.01 });

infra.notifications.subscribeNotifications((event) => {
  console.log(event.type, event.payload);
});`;

const apiSnippet = `POST /api/auth/wallet/challenge
POST /api/auth/wallet/verify
POST /api/auth/send-otp
POST /api/auth/verify-otp
POST /api/auth/phone/attach
POST /api/auth/wallet/detach
GET  /api/notifications
POST /api/infra/payments
POST /api/infra/payments/:id/verify
WS   /ws?token=<jwt>`;

const InfraDemo = () => {
  const { toast } = useToast();
  const [token, setToken] = useState(() => localStorage.getItem('infraToken') || '');
  const [user, setUser] = useState<InfraUser | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [payment, setPayment] = useState<InfraPayment | null>(null);
  const [amount, setAmount] = useState('0.01');
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('0.001');
  const [requestAmount, setRequestAmount] = useState('0.01');
  const [copiedWallet, setCopiedWallet] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [sendMode, setSendMode] = useState<'phone' | 'wallet' | 'qr'>('phone');
  const [selectedFromWallet, setSelectedFromWallet] = useState<string>('');
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const qrScannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const [showAttachWallet, setShowAttachWallet] = useState(false);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  useEffect(() => {
    if (!token) return;

    const loadSession = async () => {
      try {
        const currentUser = await infraClient.getCurrentUser(token);
        const currentNotifications = await infraClient.getNotifications(token);
        setUser(currentUser);
        setNotifications(currentNotifications);
      } catch {
        localStorage.removeItem('infraToken');
        setToken('');
      }
    };

    void loadSession();
    return infraClient.subscribeNotifications(token, (notification) => {
      setNotifications((items) => [notification, ...items]);
      toast({ title: notification.title, description: notification.body });
    });
  }, [toast, token]);

  const login = async () => {
    setIsBusy(true);
    try {
      const session = await infraClient.loginWithWallet();
      localStorage.setItem('infraToken', session.token);
      setToken(session.token);
      setUser(session.user);
      toast({ title: 'Wallet authenticated', description: shortAddress(session.user.wallet_address) });
    } catch (error) {
      toast({
        title: 'Wallet login failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const sendOtp = async () => {
    if (!phone.trim()) return;
    setIsBusy(true);
    try {
      const response = await infraClient.sendPhoneOtp(phone.trim());
      if (response.otp) {
        setOtp(response.otp);
      }
      toast({ title: 'OTP sent', description: `Your OTP is: ${response.otp}` });
    } catch (error) {
      toast({
        title: 'Could not send OTP',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const continueWithPhone = async () => {
    if (!phone.trim() || !otp.trim()) return;
    setIsBusy(true);
    try {
      const session = await infraClient.loginWithPhone(phone.trim(), otp.trim());
      localStorage.setItem('infraToken', session.token);
      setToken(session.token);
      setUser(session.user);
      toast({
        title: 'Mobile login successful',
        description: `Primary wallet: ${shortAddress(session.user.wallet_address)}`,
      });
    } catch (error) {
      toast({
        title: 'Phone login failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const attachPhone = async () => {
    if (!token || !phone.trim() || !otp.trim()) return;
    setIsBusy(true);
    try {
      const response = await infraClient.attachPhoneToWallet(token, phone.trim(), otp.trim());
      if (response.token) {
        localStorage.setItem('infraToken', response.token);
        setToken(response.token);
      }
      setUser(response.user);
      toast({
        title: 'Phone attached',
        description: response.user.wallets && response.user.wallets.length > 1
          ? 'This phone now shows the mobile-created wallet and the attached Solana wallet.'
          : `${phone.trim()} is now linked to this wallet.`,
      });
    } catch (error) {
      toast({
        title: 'Could not attach phone',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const createPayment = async () => {
    if (!token) return;
    setIsBusy(true);
    try {
      const response = await infraClient.createPayment(token, {
        amount: Number(amount),
        recipientAddress: recipient || undefined,
        label: 'Solana App Infra demo',
        message: 'SDK checkout payment',
      });
      setPayment(response.payment);
      toast({ title: 'Payment request created', description: 'Open the Solana Pay link or scan the QR.' });
    } catch (error) {
      toast({
        title: 'Payment creation failed',
        description: error instanceof Error ? error.message : 'Check your backend env',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const createPaymentRequest = async () => {
    if (!token) return;
    setAmount(requestAmount);
    setIsBusy(true);
    try {
      const response = await infraClient.createPayment(token, {
        amount: Number(requestAmount),
        recipientAddress: recipient || undefined,
        label: 'Mobile wallet payment request',
        message: `Request from ${user?.phone?.startsWith('wallet:') ? 'Solana wallet' : user?.phone || 'Solana App Infra'}`,
      });
      setPayment(response.payment);
      toast({ title: 'Payment request ready', description: 'Share the QR or Solana Pay link to receive money.' });
    } catch (error) {
      toast({
        title: 'Payment request failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const userWallets: InfraWallet[] = useMemo(() => {
    if (!user) return [];
    return user.wallets || [{ address: user.wallet_address, label: 'Primary wallet', isPrimary: true, type: 'primary', canSend: true }];
  }, [user]);

  // Auto-select primary wallet when user loads
  useEffect(() => {
    if (userWallets.length > 0 && !selectedFromWallet) {
      const primary = userWallets.find((w) => w.isPrimary);
      setSelectedFromWallet(primary?.address || userWallets[0].address);
    }
  }, [userWallets, selectedFromWallet]);

  const selectedWalletInfo = useMemo(
    () => userWallets.find((w) => w.address === selectedFromWallet) || userWallets[0],
    [userWallets, selectedFromWallet],
  );

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!qrScannerRef.current) return;
    setIsScanning(true);
    setScanResult('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader-send');
      html5QrCodeRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => {
          // Extract wallet address from Solana Pay URL or use raw text
          let address = decodedText;
          if (decodedText.startsWith('solana:')) {
            address = decodedText.replace('solana:', '').split('?')[0];
          }
          setSendRecipient(address);
          setScanResult(address);
          void scanner.stop().then(() => scanner.clear()).catch(() => {});
          html5QrCodeRef.current = null;
          setIsScanning(false);
          setSendMode('wallet');
          toast({ title: 'QR Scanned', description: `Address: ${shortAddress(address)}` });
        },
        () => {},
      );
    } catch (err) {
      setIsScanning(false);
      toast({ title: 'Scanner Error', description: 'Could not access camera.', variant: 'destructive' });
    }
  }, [toast]);

  // Clean up scanner on unmount
  useEffect(() => () => { void stopScanner(); }, [stopScanner]);

  const sendMoney = async () => {
    if (!token || !sendRecipient.trim()) return;
    setIsBusy(true);
    try {
      const response = await infraClient.sendMoney(token, {
        phone: sendRecipient.trim(),
        amount: Number(sendAmount),
        token: 'SOL',
        fromWallet: selectedFromWallet || undefined,
      });
      toast({ title: 'Money sent', description: `Transaction ${shortAddress(response.transaction.tx_hash)}` });
      const currentUser = await infraClient.getCurrentUser(token);
      setUser(currentUser);
      setSendRecipient('');
      setScanResult('');
    } catch (error) {
      toast({
        title: 'Send failed',
        description: error instanceof Error ? error.message : 'The primary mobile-created wallet needs Devnet SOL.',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const copyWallet = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedWallet(address);
    setTimeout(() => setCopiedWallet(''), 1600);
    toast({ title: 'Wallet copied', description: 'Full wallet address copied.' });
  };

  const logout = () => {
    localStorage.removeItem('infraToken');
    setToken('');
    setUser(null);
    setNotifications([]);
    setPayment(null);
    toast({ title: 'Logged out', description: 'Your local demo session was cleared.' });
  };

  const detachWallet = async (walletAddress: string) => {
    if (!token) return;
    setIsBusy(true);
    try {
      const response = await infraClient.detachWallet(token, walletAddress);
      setUser(response.user);
      toast({ title: 'Wallet detached', description: 'The external wallet was removed from this phone account.' });
    } catch (error) {
      toast({
        title: 'Detach failed',
        description: error instanceof Error ? error.message : 'Primary mobile wallet cannot be detached.',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const attachWallet = async (providerKey?: string) => {
    if (!token) return;
    setIsBusy(true);
    try {
      const response = await infraClient.attachWalletBySignature(token, providerKey);
      setUser(response.user);
      setShowAttachWallet(false);
      toast({
        title: `${response.providerName} wallet attached`,
        description: `${shortAddress(response.walletAddress)} linked to your account.`,
      });
    } catch (error) {
      toast({
        title: 'Attach failed',
        description: error instanceof Error ? error.message : 'Could not attach wallet.',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const verifyPayment = async () => {
    if (!token || !payment) return;
    setIsBusy(true);
    try {
      const response = await infraClient.verifyPayment(token, payment.id);
      setPayment(response.payment);
      toast({
        title: response.verified ? 'Payment confirmed' : 'Still waiting',
        description: response.verified ? 'A live notification was pushed.' : 'No confirmed transaction found yet.',
      });
    } catch (error) {
      toast({
        title: 'Verification failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const sendTestNotification = async () => {
    if (!token || !user) return;
    await infraClient.sendNotification(token, {
      userId: user.id,
      type: 'demo.event',
      title: 'Live SDK notification',
      body: 'A third-party app can send this through the API or SDK.',
    });
  };

  return (
    <main className="min-h-screen bg-[#0b0d0e] text-white">
      <section className="border-b border-white/10 bg-[url('https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center">
        <div className="bg-black/75">
          <div className="mx-auto grid min-h-[68vh] max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="text-left">
              <p className="mb-4 inline-flex items-center gap-2 rounded-md border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-100">
                <Radio size={16} /> Solana developer infrastructure
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
                Wallet auth, live notifications, and Solana Pay through one SDK.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-zinc-200">
                A reusable infrastructure layer for Solana apps that need onboarding, user communication, and native checkout without rebuilding the same plumbing every time.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                {token && user ? (
                  <>
                    <Button onClick={logout} className="rounded-md border border-white/20 bg-transparent hover:bg-white/10">
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                    <a href="#docs" className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
                      View integration docs
                    </a>
                  </>
                ) : (
                  <>
                    <Button onClick={login} disabled={isBusy} className="rounded-md bg-emerald-400 text-black hover:bg-emerald-300">
                      <Wallet className="mr-2 h-4 w-4" /> Login with wallet
                    </Button>
                    <a href="#auth" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200">
                      Login with mobile number
                    </a>
                    <a href="#docs" className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
                      View integration docs
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-md border border-white/15 bg-black/60 p-5 text-left shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-zinc-300">Demo session</span>
                <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-xs text-emerald-200">{token ? 'connected' : 'not connected'}</span>
              </div>
              <div className="space-y-3">
                <StatusRow icon={KeyRound} label="Auth" value={user ? shortAddress(user.wallet_address) : 'Wallet signature required'} />
                <StatusRow icon={Bell} label="Notifications" value={`${notifications.length} total, ${unreadCount} unread`} />
                <StatusRow icon={CreditCard} label="Payments" value={payment ? payment.status : 'No payment request'} />
              </div>
              {token && (
                <Button onClick={logout} className="mt-4 w-full rounded-md border border-white/20 bg-transparent hover:bg-white/10">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="auth" className="mx-auto grid max-w-7xl gap-5 px-6 py-8 lg:grid-cols-3">
        <Panel title="Authentication" icon={KeyRound}>
          {token && user ? (
            <div className="space-y-4">
              {/* User info header */}
              <div className="rounded-md bg-white/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} className="text-emerald-400" />
                  <span className="text-sm text-emerald-200 font-medium">Authenticated</span>
                </div>
                <p className="text-xs text-zinc-400">User ID: <span className="text-zinc-300 font-mono">{user.id}</span></p>
                <p className="text-xs text-zinc-400 mt-1">Phone: <span className="text-zinc-300">{user.phone.startsWith('wallet:') ? 'Not attached yet' : user.phone}</span></p>
              </div>

              {/* Wallets section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    <Wallet size={14} /> Wallets
                  </p>
                  <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded font-mono">
                    {(user.wallets || []).length || 1} / 10
                  </span>
                </div>

                <div className="space-y-2">
                  {(user.wallets || [{ address: user.wallet_address, label: 'Primary wallet', isPrimary: true, type: 'primary' }]).map((wallet) => {
                    // Detect provider name from label
                    const providerName = (() => {
                      const label = (wallet.label || '').toLowerCase();
                      if (label.includes('phantom')) return { name: 'Phantom', icon: '👻' };
                      if (label.includes('backpack')) return { name: 'Backpack', icon: '🎒' };
                      if (label.includes('solflare')) return { name: 'Solflare', icon: '🔆' };
                      if (label.includes('glow')) return { name: 'Glow', icon: '✨' };
                      if (label.includes('coin98')) return { name: 'Coin98', icon: '🪙' };
                      if (label.includes('metamask')) return { name: 'MetaMask', icon: '🦊' };
                      if (wallet.isPrimary && wallet.type === 'mobile_created') return { name: 'Custodial', icon: '📱' };
                      if (wallet.isPrimary) return { name: 'Primary', icon: '🔑' };
                      return { name: 'Solana', icon: '◎' };
                    })();

                    return (
                      <div key={wallet.address} className="rounded-md border border-white/10 bg-black/30 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg leading-none">{providerName.icon}</span>
                            <div className="min-w-0">
                              <p className="text-sm text-white font-medium truncate">{providerName.name}</p>
                              <p className="text-[10px] text-zinc-500">{wallet.label}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200 font-mono">{formatSol(wallet.balance)}</span>
                            <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${wallet.isPrimary ? 'bg-blue-400/15 text-blue-200' : 'bg-white/10 text-zinc-400'}`}>
                              {wallet.isPrimary ? 'Primary' : 'Attached'}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => copyWallet(wallet.address)} className="w-full flex items-center justify-between gap-2 rounded bg-white/5 p-2 text-left hover:bg-white/10 transition-colors">
                          <span className="break-all text-[10px] text-zinc-400 font-mono">{wallet.address}</span>
                          <Copy className="h-3 w-3 shrink-0 text-zinc-500" />
                        </button>
                        {copiedWallet === wallet.address && (
                          <p className="text-[10px] text-emerald-300 mt-1">Copied to clipboard</p>
                        )}
                        {!wallet.isPrimary && (
                          <Button
                            onClick={() => detachWallet(wallet.address)}
                            disabled={isBusy}
                            className="mt-2 w-full rounded-md border border-red-300/20 bg-red-400/10 text-red-200 hover:bg-red-400/20 text-xs h-8"
                          >
                            <Unlink className="mr-1.5 h-3 w-3" /> Detach
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attach New Wallet */}
              {((user.wallets || []).length || 1) < 10 && (
                <div className="rounded-md border border-dashed border-white/15 bg-white/5 p-3">
                  {!showAttachWallet ? (
                    <Button
                      onClick={() => setShowAttachWallet(true)}
                      className="w-full rounded-md border border-white/20 bg-transparent hover:bg-white/10 text-sm"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Attach New Wallet
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white flex items-center gap-2">
                          <Link size={14} /> Connect & Sign
                        </p>
                        <button onClick={() => setShowAttachWallet(false)} className="text-xs text-zinc-500 hover:text-white transition-colors">
                          Cancel
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Select a wallet provider below. You'll sign a message to prove ownership — no transaction is sent.
                      </p>
                      <div className="space-y-2">
                        {WALLET_PROVIDERS.map((entry) => {
                          const available = (() => { try { return !!entry.getProvider(); } catch { return false; } })();
                          return (
                            <button
                              key={entry.key}
                              onClick={() => void attachWallet(entry.key)}
                              disabled={!available || isBusy}
                              className={`w-full flex items-center justify-between gap-2 rounded-md border p-3 text-left transition-all ${
                                available
                                  ? 'border-white/10 bg-black/30 hover:bg-white/10 cursor-pointer'
                                  : 'border-white/5 bg-black/20 opacity-40 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{entry.icon}</span>
                                <div>
                                  <p className="text-sm text-white font-medium">{entry.name}</p>
                                  <p className="text-[10px] text-zinc-500">{available ? 'Detected — click to connect & sign' : 'Not installed'}</p>
                                </div>
                              </div>
                              {available && <Wallet size={14} className="text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-zinc-500 text-center">
                        Don't see your wallet? Make sure the browser extension is installed and enabled.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-300">
                Choose wallet login or mobile-number login. Mobile login creates a custodial Solana wallet the first time and reuses it on every later login.
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-medium text-white">Login with wallet</p>
                  <p className="mt-1 text-xs text-zinc-400">Connect a Solana wallet and sign a message. No transaction is sent.</p>
                  <Button onClick={login} disabled={isBusy} className="mt-3 w-full rounded-md bg-emerald-400 text-black hover:bg-emerald-300">
                    <Wallet className="mr-2 h-4 w-4" /> Login with wallet
                  </Button>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-medium text-white">Login with mobile number</p>
                  <p className="mt-1 text-xs text-zinc-400">Use OTP login. New mobile numbers get one primary mobile-created wallet.</p>
                  <div className="mt-3 space-y-3">
                    <Input value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-md bg-white/10" placeholder="Mobile number" />
                    <Input value={otp} onChange={(event) => setOtp(event.target.value)} className="rounded-md bg-white/10" placeholder="OTP, demo is 123456" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button onClick={sendOtp} disabled={isBusy || !phone.trim()} className="rounded-md bg-white text-black hover:bg-zinc-200">
                        Send OTP
                      </Button>
                      <Button onClick={continueWithPhone} disabled={isBusy || !phone.trim() || !otp.trim()} className="rounded-md bg-emerald-400 text-black hover:bg-emerald-300">
                        Login with mobile
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-medium text-white">Attach wallet to mobile account</p>
                  <p className="mt-1 text-xs text-zinc-400">After wallet login, verify a mobile number to keep both wallets under the same account.</p>
                  <Button onClick={attachPhone} disabled={isBusy || !user || !phone.trim() || !otp.trim()} className="mt-3 w-full rounded-md border border-white/20 bg-transparent hover:bg-white/10">
                    Attach current wallet
                  </Button>
                </div>
              </div>
            </>
          )}
        </Panel>

        <Panel title="Notifications" icon={Bell}>
          <div className="flex items-center gap-2">
            <Button onClick={sendTestNotification} disabled={!user} className="rounded-md bg-white text-black hover:bg-zinc-200">
              Push test event
            </Button>
            <span className="text-sm text-zinc-400">WebSocket powered</span>
          </div>
          <div className="mt-4 max-h-60 space-y-2 overflow-auto">
            {notifications.map((item) => (
              <div key={item.id} className="rounded-md border border-white/10 bg-white/5 p-3 text-left">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-zinc-400">{item.body}</p>
              </div>
            ))}
            {notifications.length === 0 && <p className="text-sm text-zinc-400">Live events will appear here.</p>}
          </div>
        </Panel>

        <Panel title="Payments" icon={CreditCard}>
          <div className="space-y-3">
            <Input value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-md bg-white/10" placeholder="Amount in SOL" />
            <Input value={recipient} onChange={(event) => setRecipient(event.target.value)} className="rounded-md bg-white/10" placeholder="Recipient wallet, optional" />
            <Button onClick={createPayment} disabled={!user || isBusy} className="w-full rounded-md bg-emerald-400 text-black hover:bg-emerald-300">
              Create Solana Pay request
            </Button>
          </div>
          {payment && (
            <div className="mt-4 space-y-3">
              <div className="rounded-md bg-white p-3">
                <QRCodeSVG value={payment.checkout_url} className="h-full w-full" />
              </div>
              <a className="block break-all text-sm text-emerald-200" href={payment.checkout_url}>Open Solana Pay link</a>
              <Button onClick={verifyPayment} disabled={isBusy} className="w-full rounded-md border border-white/20 bg-transparent hover:bg-white/10">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Verify payment
              </Button>
            </div>
          )}
        </Panel>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-10 lg:grid-cols-2">
        <Panel title="Send Money" icon={Send}>
          <p className="mb-4 text-sm text-zinc-300">
            Send SOL to a mobile number, wallet address, or scan a QR code.
          </p>

          {/* Send Mode Tabs */}
          <div className="flex rounded-md border border-white/10 bg-white/5 p-1 mb-4">
            <button
              onClick={() => { setSendMode('phone'); void stopScanner(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium transition-all ${sendMode === 'phone' ? 'bg-emerald-400 text-black shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              <Phone size={14} /> Mobile
            </button>
            <button
              onClick={() => { setSendMode('wallet'); void stopScanner(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium transition-all ${sendMode === 'wallet' ? 'bg-emerald-400 text-black shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              <Wallet size={14} /> Wallet
            </button>
            <button
              onClick={() => { setSendMode('qr'); void startScanner(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium transition-all ${sendMode === 'qr' ? 'bg-emerald-400 text-black shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              <QrCode size={14} /> Scan QR
            </button>
          </div>

          {/* From Wallet Selector */}
          {user && userWallets.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5">Send from</p>
              <div className="relative">
                <button
                  onClick={() => setShowWalletSelector(!showWalletSelector)}
                  className="w-full flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${selectedWalletInfo?.isPrimary ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{selectedWalletInfo?.label || 'Select wallet'}</p>
                      <p className="text-[10px] text-zinc-500 font-mono truncate">{selectedFromWallet ? shortAddress(selectedFromWallet) : '...'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-emerald-200 bg-emerald-400/10 px-2 py-0.5 rounded">{formatSol(selectedWalletInfo?.balance)}</span>
                    <ChevronDown size={14} className={`text-zinc-400 transition-transform ${showWalletSelector ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {showWalletSelector && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-md border border-white/10 bg-[#121619] shadow-2xl overflow-hidden">
                    {userWallets.map((w) => (
                      <button
                        key={w.address}
                        onClick={() => { setSelectedFromWallet(w.address); setShowWalletSelector(false); }}
                        className={`w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 ${w.address === selectedFromWallet ? 'bg-white/5' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${w.isPrimary ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                          <div className="min-w-0">
                            <p className="text-sm text-white font-medium truncate">{w.label}</p>
                            <p className="text-[10px] text-zinc-500 font-mono truncate">{shortAddress(w.address)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-emerald-200">{formatSol(w.balance)}</span>
                          {w.address === selectedFromWallet && <CheckCircle2 size={14} className="text-emerald-400" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phone input */}
          {sendMode === 'phone' && (
            <div className="space-y-3">
              <Input
                value={sendRecipient}
                onChange={(e) => setSendRecipient(e.target.value)}
                className="rounded-md bg-white/10"
                placeholder="+1234567890"
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <Input
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="rounded-md bg-white/10"
                  placeholder="Amount in SOL"
                />
                <Button
                  onClick={sendMoney}
                  disabled={!user || !sendRecipient.trim() || Number(sendAmount) <= 0 || isBusy}
                  className="rounded-md bg-emerald-400 text-black hover:bg-emerald-300"
                >
                  Send
                </Button>
              </div>
              <p className="text-[10px] text-zinc-500">Recipient must have a registered SolPay account.</p>
            </div>
          )}

          {/* Wallet address input */}
          {sendMode === 'wallet' && (
            <div className="space-y-3">
              <Input
                value={sendRecipient}
                onChange={(e) => setSendRecipient(e.target.value)}
                className="rounded-md bg-white/10 font-mono text-xs"
                placeholder="Solana wallet address (base58)"
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <Input
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="rounded-md bg-white/10"
                  placeholder="Amount in SOL"
                />
                <Button
                  onClick={sendMoney}
                  disabled={!user || !sendRecipient.trim() || Number(sendAmount) <= 0 || isBusy}
                  className="rounded-md bg-emerald-400 text-black hover:bg-emerald-300"
                >
                  Send
                </Button>
              </div>
              <p className="text-[10px] text-zinc-500">Send directly to any Solana wallet address on Devnet.</p>
            </div>
          )}

          {/* QR Scanner */}
          {sendMode === 'qr' && (
            <div className="space-y-3">
              <div
                id="qr-reader-send"
                ref={qrScannerRef}
                className="rounded-md overflow-hidden border border-white/10 bg-black min-h-[240px] flex items-center justify-center"
              >
                {!isScanning && !scanResult && (
                  <div className="text-center p-6">
                    <ScanLine size={32} className="mx-auto mb-2 text-zinc-500" />
                    <p className="text-sm text-zinc-400">Camera scanner will activate</p>
                    <Button
                      onClick={() => void startScanner()}
                      className="mt-3 rounded-md bg-emerald-400 text-black hover:bg-emerald-300"
                    >
                      <QrCode className="mr-2 h-4 w-4" /> Start Scanner
                    </Button>
                  </div>
                )}
              </div>
              {scanResult && (
                <div className="rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-300 mb-1">Scanned Address</p>
                  <p className="text-xs text-emerald-100 font-mono break-all">{scanResult}</p>
                </div>
              )}
              {scanResult && (
                <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                  <Input
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="rounded-md bg-white/10"
                    placeholder="Amount in SOL"
                  />
                  <Button
                    onClick={sendMoney}
                    disabled={!user || !sendRecipient.trim() || Number(sendAmount) <= 0 || isBusy}
                    className="rounded-md bg-emerald-400 text-black hover:bg-emerald-300"
                  >
                    Send
                  </Button>
                </div>
              )}
              {isScanning && (
                <Button onClick={() => void stopScanner()} className="w-full rounded-md border border-white/20 bg-transparent hover:bg-white/10">
                  Stop Scanner
                </Button>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Receive And Request" icon={Wallet}>
          <p className="mb-4 text-sm text-zinc-300">
            Receive by sharing your mobile number, copying a wallet address, or creating a Solana Pay request.
          </p>
          <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm">
            <p className="text-zinc-400">Mobile receive handle</p>
            <p className="mt-1 break-all text-zinc-100">{user?.phone && !user.phone.startsWith('wallet:') ? user.phone : 'Attach a mobile number to receive by phone.'}</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_10rem]">
            <Input value={requestAmount} onChange={(event) => setRequestAmount(event.target.value)} className="rounded-md bg-white/10" placeholder="Request amount" />
            <Button onClick={createPaymentRequest} disabled={!user || Number(requestAmount) <= 0 || isBusy} className="rounded-md bg-white text-black hover:bg-zinc-200">
              Request payment
            </Button>
          </div>
          {payment && (
            <div className="mt-4 rounded-md border border-white/10 bg-black/30 p-3">
              <p className="text-sm text-zinc-300">Shareable payment request</p>
              <p className="mt-1 break-all text-xs text-emerald-200">{payment.checkout_url}</p>
            </div>
          )}
        </Panel>
      </section>

      <section id="docs" className="border-t border-white/10 bg-zinc-950 px-6 py-10 text-left">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
          <Panel title="SDK Usage" icon={Code2}>
            <pre className="overflow-auto rounded-md bg-black p-4 text-sm text-zinc-200"><code>{sdkSnippet}</code></pre>
          </Panel>
          <Panel title="API Surface" icon={Radio}>
            <pre className="overflow-auto rounded-md bg-black p-4 text-sm text-zinc-200"><code>{apiSnippet}</code></pre>
            <p className="mt-4 text-sm text-zinc-300">The demo is a consumer of the same backend APIs and package shape intended for third-party Solana apps.</p>
          </Panel>
        </div>
      </section>
    </main>
  );
};

const Panel = ({ title, icon: Icon, children }: { title: string; icon: typeof KeyRound; children: ReactNode }) => (
  <div className="rounded-md border border-white/10 bg-[#121619] p-5 text-left shadow-xl">
    <div className="mb-4 flex items-center gap-3">
      <span className="rounded-md bg-emerald-400/15 p-2 text-emerald-200"><Icon size={18} /></span>
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
    {children}
  </div>
);

const StatusRow = ({ icon: Icon, label, value }: { icon: typeof KeyRound; label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/5 p-3">
    <div className="flex items-center gap-3 text-zinc-200">
      <Icon size={18} />
      <span>{label}</span>
    </div>
    <span className="max-w-[12rem] truncate text-sm text-zinc-400">{value}</span>
  </div>
);

export default InfraDemo;
