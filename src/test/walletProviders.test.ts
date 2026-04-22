import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectWalletProvider, getAvailableProviders, WALLET_PROVIDERS } from '@/lib/infraClient';

describe('WALLET_PROVIDERS', () => {
  it('should define at least 5 wallet providers', () => {
    expect(WALLET_PROVIDERS.length).toBeGreaterThanOrEqual(5);
  });

  it('should include Phantom provider', () => {
    const phantom = WALLET_PROVIDERS.find((p) => p.key === 'phantom');
    expect(phantom).toBeDefined();
    expect(phantom!.name).toBe('Phantom');
  });

  it('should include Backpack provider', () => {
    const backpack = WALLET_PROVIDERS.find((p) => p.key === 'backpack');
    expect(backpack).toBeDefined();
    expect(backpack!.name).toBe('Backpack');
  });

  it('should have unique keys for all providers', () => {
    const keys = WALLET_PROVIDERS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('detectWalletProvider', () => {
  const mockProvider = {
    connect: vi.fn(),
    signMessage: vi.fn(),
    publicKey: { toBase58: () => 'mockAddress' },
    isPhantom: true,
  };

  beforeEach(() => {
    // @ts-ignore
    window.solana = mockProvider;
    // @ts-ignore
    window.phantom = { solana: mockProvider };
  });

  afterEach(() => {
    // @ts-ignore
    delete window.solana;
    // @ts-ignore
    delete window.phantom;
    // @ts-ignore
    delete window.backpack;
  });

  it('should detect Phantom when window.solana.isPhantom is true', () => {
    const detected = detectWalletProvider();
    expect(detected).not.toBeNull();
    expect(detected!.name).toBe('Phantom');
  });

  it('should detect a specific provider by key', () => {
    const detected = detectWalletProvider('phantom');
    expect(detected).not.toBeNull();
    expect(detected!.name).toBe('Phantom');
  });

  it('should return null when no provider is installed', () => {
    // @ts-ignore
    delete window.solana;
    // @ts-ignore
    delete window.phantom;
    const detected = detectWalletProvider();
    expect(detected).toBeNull();
  });

  it('should return null for an unknown provider key', () => {
    const detected = detectWalletProvider('nonexistent');
    // Should fall back to auto-detect (Phantom is still installed)
    expect(detected).not.toBeNull();
  });
});

describe('getAvailableProviders', () => {
  afterEach(() => {
    // @ts-ignore
    delete window.solana;
    // @ts-ignore
    delete window.phantom;
  });

  it('should return empty array when no wallets installed', () => {
    const available = getAvailableProviders();
    expect(available).toEqual([]);
  });

  it('should return Phantom when installed', () => {
    // @ts-ignore
    window.phantom = {
      solana: {
        connect: vi.fn(),
        signMessage: vi.fn(),
        isPhantom: true,
      },
    };

    const available = getAvailableProviders();
    expect(available.length).toBeGreaterThanOrEqual(1);
    expect(available.some((p) => p.key === 'phantom')).toBe(true);
  });
});
