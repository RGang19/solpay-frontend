export type SolanaWallet = {
  publicKey?: { toBase58(): string } | string;
  connect(): Promise<{ publicKey?: { toBase58(): string } | string } | void>;
  signMessage(message: Uint8Array, encoding?: string): Promise<Uint8Array | { signature: Uint8Array }>;
};

export type InfraUser = {
  id: string;
  name: string | null;
  phone: string;
  wallet_address: string;
  is_merchant: boolean;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
  updated_at: string;
};

export type InfraPayment = {
  id: string;
  user_id: string;
  amount: number;
  token: string;
  recipient_address: string;
  reference: string;
  label?: string | null;
  message?: string | null;
  memo?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | string;
  checkout_url: string;
  signature?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type LoginResponse = {
  token: string;
  expiresAt: string;
  user: InfraUser;
};

export type ClientOptions = {
  apiUrl: string;
  wsUrl?: string;
  token?: string;
};

const readWalletAddress = (wallet: SolanaWallet, connected?: { publicKey?: SolanaWallet['publicKey'] }) => {
  const publicKey = connected?.publicKey || wallet.publicKey;
  if (!publicKey) throw new Error('Wallet public key is missing');
  return typeof publicKey === 'string' ? publicKey : publicKey.toBase58();
};

export class SolanaAppInfraClient {
  private apiUrl: string;
  private wsUrl: string;
  private token?: string;

  constructor(options: ClientOptions) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '');
    this.wsUrl = options.wsUrl || this.apiUrl.replace(/^http/, 'ws');
    this.token = options.token;
  }

  setToken(token: string) {
    this.token = token;
  }

  auth = {
    sendPhoneOtp: (phone: string) =>
      this.request<{ message: string }>('/api/auth/send-otp', {
        method: 'POST',
        body: { phone },
        auth: false,
      }),
    loginWithPhone: async (phone: string, otp: string): Promise<LoginResponse> => {
      const session = await this.request<LoginResponse>('/api/auth/verify-otp', {
        method: 'POST',
        body: { phone, otp },
        auth: false,
      });
      this.setToken(session.token);
      return session;
    },
    loginWithWallet: async (wallet: SolanaWallet): Promise<LoginResponse> => {
      const connected = await wallet.connect();
      const walletAddress = readWalletAddress(wallet, connected || undefined);
      const challenge = await this.request<{ message: string; nonce: string }>('/api/auth/wallet/challenge', {
        method: 'POST',
        body: { walletAddress },
        auth: false,
      });

      const signed = await wallet.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
      const signature = signed instanceof Uint8Array ? Array.from(signed) : Array.from(signed.signature);
      const session = await this.request<LoginResponse>('/api/auth/wallet/verify', {
        method: 'POST',
        body: { walletAddress, signature, nonce: challenge.nonce },
        auth: false,
      });
      this.setToken(session.token);
      return session;
    },
    attachPhoneToWallet: (phone: string, otp: string) =>
      this.request<{ user: InfraUser; message: string }>('/api/auth/phone/attach', {
        method: 'POST',
        body: { phone, otp },
      }),
    verifySession: () => this.request<{ user: InfraUser }>('/api/auth/session/me'),
    getCurrentUser: async () => {
      const response = await this.request<{ user: InfraUser }>('/api/auth/session/me');
      return response.user;
    },
  };

  notifications = {
    sendNotification: (userId: string, payload: { title: string; body: string; type?: string; data?: Record<string, unknown> }) =>
      this.request<{ notification: NotificationItem }>('/api/notifications', {
        method: 'POST',
        body: { userId, ...payload },
      }),
    subscribeNotifications: (handler: (event: { type: string; payload: unknown }) => void) => {
      if (!this.token) throw new Error('Token is required before subscribing to notifications');
      const socket = new WebSocket(`${this.wsUrl}/ws?token=${encodeURIComponent(this.token)}`);
      socket.addEventListener('message', (event) => handler(JSON.parse(event.data)));
      return () => socket.close();
    },
    getNotifications: async () => {
      const response = await this.request<{ notifications: NotificationItem[] }>('/api/notifications');
      return response.notifications;
    },
    markNotification: (id: string, read: boolean) =>
      this.request<{ notification: NotificationItem }>(`/api/notifications/${id}`, {
        method: 'PATCH',
        body: { read },
      }),
  };

  payments = {
    createPayment: (payload: {
      amount: number;
      token?: 'SOL';
      recipientAddress?: string;
      label?: string;
      message?: string;
      memo?: string;
    }) =>
      this.request<{ payment: InfraPayment }>('/api/infra/payments', {
        method: 'POST',
        body: payload,
      }),
    verifyPayment: (paymentId: string) =>
      this.request<{ payment: InfraPayment; verified?: boolean }>(`/api/infra/payments/${paymentId}/verify`, {
        method: 'POST',
      }),
    getPaymentStatus: async (paymentId: string) => {
      const response = await this.request<{ payment: InfraPayment }>(`/api/infra/payments/${paymentId}`);
      return response.payment;
    },
  };

  private async request<T>(
    path: string,
    options: { method?: string; body?: unknown; auth?: boolean } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options.auth !== false && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.apiUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Solana App Infrastructure SDK request failed');
    }
    return data as T;
  }
}

export default SolanaAppInfraClient;
