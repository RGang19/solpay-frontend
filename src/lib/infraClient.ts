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

type PhantomProvider = {
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  signMessage(message: Uint8Array, encoding?: string): Promise<{ signature: Uint8Array }>;
};

declare global {
  interface Window {
    solana?: PhantomProvider & { isPhantom?: boolean };
  }
}

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
    return request<{ message: string }>('/api/auth/send-otp', {
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

  async loginWithWallet() {
    const provider = window.solana;
    if (!provider) {
      throw new Error('Install Phantom or another window.solana wallet to use wallet login.');
    }

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
    return session;
  },

  attachPhoneToWallet(token: string, phone: string, otp: string) {
    return request<{ user: InfraUser; message: string; token?: string; expiresAt?: string }>('/api/auth/phone/attach', {
      method: 'POST',
      token,
      body: { phone, otp },
    });
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

  sendMoney(token: string, payload: { phone: string; amount: number; token?: 'SOL' | 'USDC' }) {
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
