import { describe, it, expect, vi, beforeEach } from 'vitest';
import { infraClient } from '@/lib/infraClient';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('infraClient.sendPhoneOtp', () => {
  it('should call the send-otp endpoint with the phone number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'OTP sent successfully', otp: '482910' }),
    });

    const result = await infraClient.sendPhoneOtp('+15551234567');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/auth/send-otp');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ phone: '+15551234567' });
    expect(result.otp).toBeDefined();
    expect(result.otp).toHaveLength(6);
  });

  it('should throw an error on failed request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Phone number is required' }),
    });

    await expect(infraClient.sendPhoneOtp('')).rejects.toThrow('Phone number is required');
  });
});

describe('infraClient.loginWithPhone', () => {
  it('should call verify-otp and return token and user', async () => {
    const mockUser = {
      id: 'user123',
      phone: '+15551234567',
      wallet_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgCsU',
      name: null,
      is_merchant: false,
      wallets: [{
        address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgCsU',
        type: 'mobile_created',
        label: 'Mobile-created custodial wallet',
        balance: 0.5,
        isPrimary: true,
      }],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        message: 'Login successful',
        token: 'jwt-token-123',
        user: mockUser,
      }),
    });

    const result = await infraClient.loginWithPhone('+15551234567', '123456');

    expect(result.token).toBe('jwt-token-123');
    expect(result.user.id).toBe('user123');
    expect(result.user.wallets).toHaveLength(1);
    expect(result.user.wallets![0].isPrimary).toBe(true);
  });
});

describe('infraClient.sendMoney', () => {
  it('should call the send endpoint with correct payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        message: 'Money sent',
        transaction: {
          id: 'tx123',
          tx_hash: '5K2c...abcd',
          amount: 0.01,
          status: 'SUCCESS',
        },
      }),
    });

    const result = await infraClient.sendMoney('jwt-token', {
      phone: '+15559876543',
      amount: 0.01,
      token: 'SOL',
      fromWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgCsU',
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer jwt-token');
    const body = JSON.parse(options.body);
    expect(body.phone).toBe('+15559876543');
    expect(body.amount).toBe(0.01);
    expect(body.fromWallet).toBeDefined();
    expect(result.transaction.status).toBe('SUCCESS');
  });

  it('should handle send failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Insufficient balance' }),
    });

    await expect(
      infraClient.sendMoney('jwt-token', { phone: '+15559876543', amount: 1000 })
    ).rejects.toThrow('Insufficient balance');
  });
});

describe('infraClient.getCurrentUser', () => {
  it('should fetch and return the user object', async () => {
    const mockUser = {
      id: 'user123',
      phone: '+15551234567',
      wallet_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgCsU',
      name: 'Test User',
      is_merchant: false,
      wallets: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: mockUser }),
    });

    const user = await infraClient.getCurrentUser('jwt-token');
    expect(user.id).toBe('user123');
    expect(user.phone).toBe('+15551234567');
  });
});

describe('infraClient.detachWallet', () => {
  it('should call detach endpoint with wallet address', async () => {
    const mockUser = {
      id: 'user123',
      phone: '+15551234567',
      wallet_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgCsU',
      wallets: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        message: 'Wallet detached',
        user: mockUser,
      }),
    });

    const result = await infraClient.detachWallet('jwt-token', 'ExternalWalletAddress123');

    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body).walletAddress).toBe('ExternalWalletAddress123');
    expect(result.message).toBe('Wallet detached');
  });

  it('should reject detaching primary wallet', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: 'Primary mobile-created wallet cannot be detached from its phone account',
      }),
    });

    await expect(
      infraClient.detachWallet('jwt-token', 'PrimaryWallet123')
    ).rejects.toThrow('Primary mobile-created wallet cannot be detached');
  });
});

describe('infraClient.createPayment', () => {
  it('should create a Solana Pay payment request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        payment: {
          id: 'pay123',
          amount: 0.05,
          token: 'SOL',
          reference: 'ref-uuid-123',
          status: 'PENDING',
          checkout_url: 'solana:https://...',
          recipient_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgCsU',
        },
      }),
    });

    const result = await infraClient.createPayment('jwt-token', {
      amount: 0.05,
      label: 'Demo checkout',
      message: 'Order #1001',
    });

    expect(result.payment.id).toBe('pay123');
    expect(result.payment.status).toBe('PENDING');
    expect(result.payment.checkout_url).toBeDefined();
  });
});

describe('infraClient.verifyPayment', () => {
  it('should verify a payment reference', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        payment: { id: 'pay123', status: 'CONFIRMED' },
        verified: true,
      }),
    });

    const result = await infraClient.verifyPayment('jwt-token', 'pay123');

    expect(result.verified).toBe(true);
    expect(result.payment.status).toBe('CONFIRMED');
  });
});
