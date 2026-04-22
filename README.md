# Solana App Infrastructure SDK

A reusable infrastructure stack for Solana apps that need onboarding, wallet identity, notifications, payments, and a developer-friendly SDK.

This is not a single-purpose consumer wallet. The demo app is a reference implementation that shows how another Solana app can consume the backend APIs and SDK.

## One-Line Pitch

We built a reusable Solana infrastructure stack that helps any app handle wallet authentication, mobile-number onboarding, real-time notifications, and native payments with a simple SDK.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React Demo App                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │  Wallet   │  │  Mobile  │  │  Send    │  │  Solana Pay        │  │
│  │  Login    │  │  OTP     │  │  Money   │  │  Checkout          │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────────┬──────────┘  │
│       │              │             │                   │             │
│       └──────────────┴─────────────┴───────────────────┘             │
│                              │                                       │
│                    TypeScript SDK Client                              │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ REST + WebSocket
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Express + TypeScript API                         │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────┐ │
│  │  Auth        │  │ Notifications│  │  Payments                   │ │
│  │  Service     │  │ Service      │  │  Service                    │ │
│  │             │  │              │  │                             │ │
│  │ • Wallet    │  │ • Store      │  │ • SOL / SPL transfers      │ │
│  │   Signature │  │ • WebSocket  │  │ • Solana Pay requests      │ │
│  │ • Mobile    │  │   Push       │  │ • Reference verification   │ │
│  │   OTP       │  │ • Read state │  │ • Phone → wallet lookup    │ │
│  │ • JWT       │  │              │  │                             │ │
│  │ • Multi-    │  │              │  │                             │ │
│  │   wallet    │  │              │  │                             │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────┬────────────────┘ │
│         │                │                        │                  │
│         └────────────────┴────────────────────────┘                  │
│                          │                                           │
│              ┌───────────┴───────────┐                               │
│              │    Prisma ORM         │                               │
│              └───────────┬───────────┘                               │
└──────────────────────────┼───────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
     ┌────────────────┐      ┌──────────────────┐
     │   MongoDB       │      │  Solana RPC       │
     │   Atlas         │      │  (Devnet/Mainnet) │
     │                 │      │                    │
     │  Users          │      │  Balance queries   │
     │  Sessions       │      │  Transfer signing  │
     │  Wallets        │      │  TX verification   │
     │  Transactions   │      │                    │
     │  Notifications  │      │                    │
     └────────────────┘      └──────────────────┘
```

## What It Provides

- Login with Solana wallet signature (Phantom, Backpack, Solflare, Glow, Coin98)
- Login with mobile number OTP (random 6-digit OTP)
- One primary mobile-created custodial wallet per phone number
- Attach up to 10 external wallets via signed message verification
- User-controlled detach for external linked wallets
- Primary mobile-created wallet protection, so it cannot be detached from its phone number
- Wallet provider detection (shows Phantom, Backpack, Solflare, MetaMask names/icons)
- Full wallet address display and copy actions
- Live SOL balances for primary and attached wallets
- Send money by mobile number, wallet address, or QR code scan
- Choose which wallet to send from
- Create Solana Pay payment requests
- Verify Solana Pay references on the backend
- Real-time in-app notifications over WebSockets
- TypeScript SDK for third-party apps
- Rate limiting on auth and payment endpoints
- Environment validation at startup

## Repository Structure

```txt
solpay-frontend/                  # This repo
├── src/
│   ├── pages/                    # InfraDemo, Login pages
│   ├── components/               # Reusable UI components
│   ├── lib/infraClient.ts        # API client with multi-wallet support
│   └── test/                     # Unit tests (vitest)
├── packages/sdk/                 # Reusable TypeScript SDK
├── docs/
│   ├── api.md                    # Full API reference
│   └── hackathon-submission.md   # Grant/hackathon narrative
├── .github/workflows/ci.yml     # CI pipeline
├── CONTRIBUTING.md               # Contributor guidelines
└── LICENSE                       # MIT License

solpay-backend/                   # Separate repo
├── src/
│   ├── routes/                   # Auth, payments, notifications, etc.
│   ├── services/                 # Wallet, payment, realtime services
│   ├── middleware/               # JWT auth middleware
│   └── config/                   # Database config
├── prisma/schema.prisma          # MongoDB schema
├── .github/workflows/ci.yml     # CI pipeline
├── CONTRIBUTING.md               # Contributor guidelines
└── LICENSE                       # MIT License
```

## Core Modules

### Auth

Apps can choose either login path:

- `loginWithWallet()` connects a Solana wallet and verifies a signed nonce. Supports Phantom, Backpack, Solflare, Glow, and Coin98.
- `loginWithPhone()` verifies a mobile OTP and creates one custodial Solana wallet if the phone number is new.
- `attachWalletBySignature()` attaches additional wallets to an existing account via cryptographic signature. Up to 10 wallets per account.

If a user already has a mobile-created wallet and later attaches a signed Solana wallet, both wallets remain visible under the phone account until the user chooses to detach the external wallet.

### Notifications

Apps can store and stream notifications:

- Send app events with `sendNotification()`
- Subscribe to live events with `subscribeNotifications()`
- Fetch notification history with `getNotifications()`
- Mark notifications read or unread

### Payments

Apps can support both simple transfers and Solana Pay checkout:

- Send SOL by mobile number or wallet address with `sendMoney()`
- Scan QR codes to send to wallet addresses
- Select source wallet for outbound transfers
- Create Solana Pay requests with `createPayment()`
- Verify payment references with `verifyPayment()`
- Show payment status with `getPaymentStatus()`

## SDK Example

```ts
import { SolanaAppInfraClient } from '@solana-app-infra/sdk';

const infra = new SolanaAppInfraClient({
  apiUrl: 'https://api.example.com',
});

const walletSession = await infra.auth.loginWithWallet(window.solana);
infra.setToken(walletSession.token);

await infra.auth.sendPhoneOtp('+15551234567');
const mobileSession = await infra.auth.loginWithPhone('+15551234567', '123456');
infra.setToken(mobileSession.token);

const linked = await infra.auth.attachPhoneToWallet('+15551234567', '123456');
console.log(linked.user.wallets);

await infra.payments.sendMoney({
  phone: '+15559876543',
  amount: 0.01,
  token: 'SOL',
});

const payment = await infra.payments.createPayment({
  amount: 0.05,
  label: 'Demo checkout',
});

infra.notifications.subscribeNotifications((event) => {
  console.log(event.type, event.payload);
});
```

## Security

- **Rate Limiting**: Auth endpoints (10 req/15min), Payment endpoints (20 req/15min), General API (100 req/15min)
- **Wallet Authentication**: Ed25519 signature verification with nonce challenges
- **OTP**: Random 6-digit OTP per request (no hardcoded values)
- **Sessions**: JWT tokens with expiration
- **CORS**: Whitelist-based origin policy
- **Helmet**: HTTP security headers
- **Env Validation**: Backend fails fast if required env vars are missing

## Local Setup

Use Node 20.

Backend:

```bash
cd solpay-backend
source ~/.nvm/nvm.sh && nvm use 20
npm install
cp .env.example .env  # Fill in your values
npx prisma generate
npm run dev
```

Frontend:

```bash
cd solpay-frontend
source ~/.nvm/nvm.sh && nvm use 20
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment

Frontend:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

Backend:

```env
PORT=3001
DATABASE_URL="mongodb+srv://user:password@cluster.mongodb.net/solana-app-infra"
JWT_SECRET="replace-with-a-long-random-secret"
ENCRYPTION_KEY="replace-with-a-long-random-secret"
SOLANA_RPC_URL="https://api.devnet.solana.com"
MERCHANT_WALLET_ADDRESS=""
```

## Demo Flow

1. Choose `Login with wallet` or `Login with mobile number`.
2. Wallet login signs a challenge with Phantom or another Solana wallet.
3. Mobile login sends a random OTP (displayed on screen) and creates one primary wallet for new phone numbers.
4. Attach additional wallets via signed message (up to 10 wallets).
5. View all wallets with provider names (Phantom, Backpack, etc.), full addresses, balances, and roles.
6. Copy wallet addresses and detach external wallets when desired.
7. Send money by mobile number, wallet address, or scan a QR code.
8. Choose which wallet to send from.
9. Create a Solana Pay payment request.
10. Verify payment and receive a real-time notification.

## Docs

- API overview: [`docs/api.md`](docs/api.md)
- Hackathon submission narrative: [`docs/hackathon-submission.md`](docs/hackathon-submission.md)
- SDK docs: [`packages/sdk/README.md`](packages/sdk/README.md)
- Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Business Model

- Free open-source SDK and self-hosted backend
- Paid hosted APIs for teams that do not want to operate infrastructure
- Usage-based pricing for notifications, sessions, and payment verification
- Developer dashboard for auth usage, notification analytics, and payment monitoring
- Enterprise support for teams building at scale

## Open Source And Composability

The backend exposes standard REST and WebSocket APIs, and the SDK is a regular TypeScript package. Apps can adopt auth, notifications, payments, or the whole stack. Solana wallet signatures, wallet addresses, Solana Pay references, and transaction verification remain normal composable Solana primitives.

## License

MIT — see [LICENSE](LICENSE) for details.
