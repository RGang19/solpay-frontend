export type InfraUser = {
  id: string;
  name: string | null;
  phone: string;
  wallet_address: string;
  is_merchant: boolean;
  wallets?: InfraWallet[];
};

export type InfraWallet = {
  address: string;
  type: 'mobile_created' | 'attached' | 'primary' | string;
  label: string;
  source?: string;
  balance?: number;
  token?: string;
  canSend?: boolean;
  canReceive?: boolean;
  isPrimary: boolean;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export type InfraPayment = {
  id: string;
  amount: number;
  token: string;
  recipient_address: string;
  reference: string;
  status: string;
  checkout_url: string;
  signature?: string | null;
};

type SolanaProvider = {
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  signMessage(message: Uint8Array, encoding?: string): Promise<{ signature: Uint8Array }>;
  isPhantom?: boolean;
};

type SolanaProviderEntry = {
  key: string;
  name: string;
  icon: string;
  getProvider: () => SolanaProvider | undefined;
};

declare global {
  interface Window {
    solana?: SolanaProvider & { isPhantom?: boolean };
    phantom?: { solana?: SolanaProvider };
    backpack?: SolanaProvider;
    solflare?: SolanaProvider & { isSolflare?: boolean };
    glowSolana?: SolanaProvider;
    coin98?: { sol?: SolanaProvider };
    xnft?: { solana?: SolanaProvider };
  }
}

export const WALLET_PROVIDERS: SolanaProviderEntry[] = [
  {
    key: 'phantom',
    name: 'Phantom',
    icon: '👻',
    getProvider: () => window.phantom?.solana || (window.solana?.isPhantom ? window.solana : undefined),
  },
  {
    key: 'backpack',
    name: 'Backpack',
    icon: '🎒',
    getProvider: () => window.backpack,
  },
  {
    key: 'solflare',
    name: 'Solflare',
    icon: '🔆',
    getProvider: () => window.solflare?.isSolflare ? window.solflare : undefined,
  },
  {
    key: 'glow',
    name: 'Glow',
    icon: '✨',
    getProvider: () => window.glowSolana,
  },
  {
    key: 'coin98',
    name: 'Coin98',
    icon: '🪙',
    getProvider: () => window.coin98?.sol,
  },
];

export const detectWalletProvider = (providerKey?: string): { provider: SolanaProvider; name: string; icon: string } | null => {
  if (providerKey) {
    const entry = WALLET_PROVIDERS.find((p) => p.key === providerKey);
    if (entry) {
      const provider = entry.getProvider();
      if (provider) return { provider, name: entry.name, icon: entry.icon };
    }
  }
  // Auto-detect: return first available
  for (const entry of WALLET_PROVIDERS) {
    const provider = entry.getProvider();
    if (provider) return { provider, name: entry.name, icon: entry.icon };
  }
  return null;
};

export const getAvailableProviders = (): SolanaProviderEntry[] => {
  return WALLET_PROVIDERS.filter((entry) => {
    try {
      return !!entry.getProvider();
    } catch {
      return false;
    }
  });
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_URL = (import.meta.env.VITE_WS_URL || API_URL).replace(/^http/, 'ws');

const request = async <T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data as T;
};

export const infraClient = {
  sendPhoneOtp(phone: string) {
    return request<{ message: string; otp: string }>('/api/auth/send-otp', {
      method: 'POST',
      body: { phone },
    });
  },

  loginWithPhone(phone: string, otp: string) {
    return request<{ token: string; user: InfraUser; expiresAt?: string }>('/api/auth/verify-otp', {
      method: 'POST',
      body: { phone, otp },
    });
  },

  async loginWithWallet(providerKey?: string) {
    const detected = detectWalletProvider(providerKey);
    if (!detected) {
      throw new Error('No Solana wallet found. Install Phantom, Backpack, Solflare, or another compatible wallet.');
    }

    const { provider, name } = detected;
    const connected = await provider.connect();
    const walletAddress = connected.publicKey.toBase58();
    const challenge = await request<{ message: string; nonce: string }>('/api/auth/wallet/challenge', {
      method: 'POST',
      body: { walletAddress },
    });
    const signed = await provider.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
    const session = await request<{ token: string; user: InfraUser }>('/api/auth/wallet/verify', {
      method: 'POST',
      body: {
        walletAddress,
        nonce: challenge.nonce,
        signature: Array.from(signed.signature),
      },
    });
    return { ...session, providerName: name };
  },

  attachPhoneToWallet(token: string, phone: string, otp: string) {
    return request<{ user: InfraUser; message: string; token?: string; expiresAt?: string }>('/api/auth/phone/attach', {
      method: 'POST',
      token,
      body: { phone, otp },
    });
  },

  async attachWalletBySignature(token: string, providerKey?: string) {
    const detected = detectWalletProvider(providerKey);
    if (!detected) {
      throw new Error('No Solana wallet found. Install a compatible wallet extension.');
    }

    const { provider, name } = detected;
    const connected = await provider.connect();
    const walletAddress = connected.publicKey.toBase58();

    // Request challenge
    const challenge = await request<{ message: string; nonce: string }>('/api/auth/wallet/challenge', {
      method: 'POST',
      body: { walletAddress },
    });

    // Sign the challenge message
    const signed = await provider.signMessage(new TextEncoder().encode(challenge.message), 'utf8');

    // Attach wallet
    const result = await request<{ user: InfraUser; message: string }>('/api/auth/wallet/attach', {
      method: 'POST',
      token,
      body: {
        walletAddress,
        nonce: challenge.nonce,
        signature: Array.from(signed.signature),
        label: `${name} wallet`,
      },
    });

    return { ...result, providerName: name, walletAddress };
  },

  detachWallet(token: string, walletAddress: string) {
    return request<{ user: InfraUser; message: string }>('/api/auth/wallet/detach', {
      method: 'POST',
      token,
      body: { walletAddress },
    });
  },

  async getCurrentUser(token: string) {
    const response = await request<{ user: InfraUser }>('/api/auth/session/me', { token });
    return response.user;
  },

  async getNotifications(token: string) {
    const response = await request<{ notifications: NotificationItem[] }>('/api/notifications', { token });
    return response.notifications;
  },

  sendNotification(token: string, payload: { userId: string; title: string; body: string; type?: string }) {
    return request<{ notification: NotificationItem }>('/api/notifications', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  subscribeNotifications(token: string, handler: (notification: NotificationItem) => void) {
    const socket = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`);
    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification.created') handler(data.payload);
    });
    return () => socket.close();
  },

  createPayment(token: string, payload: { amount: number; recipientAddress?: string; label?: string; message?: string }) {
    return request<{ payment: InfraPayment }>('/api/infra/payments', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  sendMoney(token: string, payload: { phone: string; amount: number; token?: 'SOL' | 'USDC'; fromWallet?: string }) {
    return request<{ message: string; transaction: { id: string; tx_hash: string; amount: number; status: string } }>('/api/payments/send', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  verifyPayment(token: string, paymentId: string) {
    return request<{ payment: InfraPayment; verified?: boolean }>(`/api/infra/payments/${paymentId}/verify`, {
      method: 'POST',
      token,
    });
  },
};
