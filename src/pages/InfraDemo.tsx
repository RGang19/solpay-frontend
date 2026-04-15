import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Bell, CheckCircle2, Code2, Copy, CreditCard, KeyRound, LogOut, Radio, Send, Unlink, Wallet } from 'lucide-react';
import { infraClient, type InfraPayment, type InfraUser, type NotificationItem } from '@/lib/infraClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const shortAddress = (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`;
const formatSol = (value?: number) => `${(value || 0).toLocaleString('en-US', { maximumFractionDigits: 6 })} SOL`;

const sdkSnippet = `import { SolanaAppInfraClient } from '@solana-app-infra/sdk';

const infra = new SolanaAppInfraClient({ apiUrl: 'https://api.yourapp.com' });

const session = await infra.auth.loginWithWallet(window.solana);
infra.setToken(session.token);

await infra.auth.sendPhoneOtp('+15551234567');
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
      await infraClient.sendPhoneOtp(phone.trim());
      toast({ title: 'OTP sent', description: 'Use 123456 for the demo OTP backend.' });
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
        title: 'Phone account ready',
        description: `Wallet created: ${shortAddress(session.user.wallet_address)}`,
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

  const sendMoney = async () => {
    if (!token || !sendRecipient.trim()) return;
    setIsBusy(true);
    try {
      const response = await infraClient.sendMoney(token, {
        phone: sendRecipient.trim(),
        amount: Number(sendAmount),
        token: 'SOL',
      });
      toast({ title: 'Money sent', description: `Transaction ${shortAddress(response.transaction.tx_hash)}` });
      const currentUser = await infraClient.getCurrentUser(token);
      setUser(currentUser);
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
                <Button onClick={login} disabled={isBusy} className="rounded-md bg-emerald-400 text-black hover:bg-emerald-300">
                  <Wallet className="mr-2 h-4 w-4" /> {user ? 'Reconnect wallet' : 'Sign in with wallet'}
                </Button>
                <a href="#docs" className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
                  View integration docs
                </a>
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

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-8 lg:grid-cols-3">
        <Panel title="Authentication" icon={KeyRound}>
          <p className="text-sm text-zinc-300">
            Wallet users can attach a phone number after OTP verification. Phone-first users can create an account and custodial Solana wallet from OTP login.
          </p>
          <div className="mt-4 space-y-3">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-md bg-white/10" placeholder="Mobile number" />
            <Input value={otp} onChange={(event) => setOtp(event.target.value)} className="rounded-md bg-white/10" placeholder="OTP, demo is 123456" />
            <div className="grid gap-2 sm:grid-cols-3">
              <Button onClick={sendOtp} disabled={isBusy || !phone.trim()} className="rounded-md bg-white text-black hover:bg-zinc-200">
                Send OTP
              </Button>
              <Button onClick={continueWithPhone} disabled={isBusy || !phone.trim() || !otp.trim()} className="rounded-md border border-white/20 bg-transparent hover:bg-white/10">
                Create with phone
              </Button>
              <Button onClick={attachPhone} disabled={isBusy || !user || !phone.trim() || !otp.trim()} className="rounded-md bg-emerald-400 text-black hover:bg-emerald-300">
                Attach to wallet
              </Button>
            </div>
          </div>
          {user && (
            <div className="mt-4 space-y-2 rounded-md bg-white/5 p-3 text-sm text-zinc-200">
              <p>User ID: {user.id}</p>
              <p>Phone: {user.phone.startsWith('wallet:') ? 'Not attached yet' : user.phone}</p>
              <div className="space-y-2 pt-2">
                {(user.wallets || [{ address: user.wallet_address, label: 'Primary wallet', isPrimary: true, type: 'primary' }]).map((wallet) => (
                  <div key={wallet.address} className="rounded-md border border-white/10 bg-black/30 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-300">{wallet.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">{formatSol(wallet.balance)}</span>
                        <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-zinc-300">
                          {wallet.isPrimary ? 'Primary' : 'Attached'}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => copyWallet(wallet.address)} className="mt-2 flex w-full items-start justify-between gap-2 rounded-md bg-white/5 p-2 text-left hover:bg-white/10">
                      <span className="break-all text-xs text-zinc-300">{wallet.address}</span>
                      <Copy className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                    </button>
                    <p className="mt-2 text-xs text-zinc-500">
                      {wallet.canSend ? 'Can send and receive through mobile number.' : 'Can receive and show balance here. Sign this wallet directly to spend from it.'}
                      {copiedWallet === wallet.address ? ' Copied.' : ''}
                    </p>
                    {!wallet.isPrimary && (
                      <Button
                        onClick={() => detachWallet(wallet.address)}
                        disabled={isBusy}
                        className="mt-3 w-full rounded-md border border-red-300/30 bg-red-400/10 text-red-100 hover:bg-red-400/20"
                      >
                        <Unlink className="mr-2 h-4 w-4" /> Detach external wallet
                      </Button>
                    )}
                    {wallet.isPrimary && (
                      <p className="mt-3 rounded-md bg-emerald-400/10 p-2 text-xs text-emerald-100">
                        Primary mobile-created wallet stays attached to this phone number.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
        <Panel title="Send By Mobile" icon={Send}>
          <p className="mb-4 text-sm text-zinc-300">
            Send SOL from the mobile-created primary wallet to another registered mobile number or a direct Solana address.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Input value={sendRecipient} onChange={(event) => setSendRecipient(event.target.value)} className="rounded-md bg-white/10" placeholder="Mobile number or wallet address" />
            <Input value={sendAmount} onChange={(event) => setSendAmount(event.target.value)} className="rounded-md bg-white/10" placeholder="SOL" />
          </div>
          <Button onClick={sendMoney} disabled={!user || !sendRecipient.trim() || Number(sendAmount) <= 0 || isBusy} className="mt-3 w-full rounded-md bg-emerald-400 text-black hover:bg-emerald-300">
            Send money
          </Button>
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
