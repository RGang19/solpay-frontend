# Solana App Infrastructure SDK

A reusable infrastructure stack for Solana apps that need onboarding, wallet identity, notifications, payments, and a developer-friendly SDK.

This is not a single-purpose consumer wallet. The demo app is a reference implementation that shows how another Solana app can consume the backend APIs and SDK.

## One-Line Pitch

We built a reusable Solana infrastructure stack that helps any app handle wallet authentication, mobile-number onboarding, real-time notifications, and native payments with a simple SDK.

## What It Provides

- Login with Solana wallet signature
- Login with mobile number OTP
- One primary mobile-created custodial wallet per phone number
- Optional external wallet linking under the same phone account
- User-controlled detach for external linked wallets
- Primary mobile-created wallet protection, so it cannot be detached from its phone number
- Full wallet address display and copy actions
- Live SOL balances for primary and attached wallets
- Send money by mobile number or direct wallet address
- Create Solana Pay payment requests
- Verify Solana Pay references on the backend
- Real-time in-app notifications over WebSockets
- TypeScript SDK for third-party apps

## Repository Structure

```txt
sol-pay/
  Sol-pay-Backend-main/       Express + TypeScript API, Prisma, MongoDB, Solana RPC
  solpay-frontend-main/       React demo app and docs
  solpay-frontend-main/packages/sdk/
                              Reusable TypeScript SDK
  solpay-frontend-main/docs/  API and hackathon docs
```

## Core Modules

### Auth

Apps can choose either login path:

- `loginWithWallet()` connects a Solana wallet and verifies a signed nonce.
- `loginWithPhone()` verifies a mobile OTP and creates one custodial Solana wallet if the phone number is new.

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
- Create Solana Pay requests with `createPayment()`
- Verify payment references with `verifyPayment()`
- Show payment status with `getPaymentStatus()`

## Demo Flow

1. Choose `Login with wallet` or `Login with mobile number`.
2. Wallet login signs a challenge with Phantom or another `window.solana` wallet.
3. Mobile login verifies OTP and creates one primary custodial wallet for new phone numbers.
4. Attach a wallet to a mobile account with OTP verification.
5. View both wallets: the mobile-created wallet and any attached external wallets.
6. Copy full wallet addresses and view live SOL balances.
7. Detach external wallets when desired.
8. Send money by mobile number or wallet address.
9. Create a Solana Pay payment request.
10. Verify payment and receive a real-time notification.

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

## Local Setup

Use Node 20.

Backend:

```bash
cd Sol-pay-Backend-main
source ~/.nvm/nvm.sh && nvm use 20
npm install
npx prisma generate
npm run dev
```

Frontend:

```bash
cd solpay-frontend-main
source ~/.nvm/nvm.sh && nvm use 20
npm install
npm run dev
```

Open `http://localhost:8080`.

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

## Business Model

- Free open-source SDK and self-hosted backend
- Paid hosted APIs for teams that do not want to operate infrastructure
- Usage-based pricing for notifications, sessions, and payment verification
- Developer dashboard for auth usage, notification analytics, and payment monitoring
- Enterprise support for teams building at scale

## Open Source And Composability

The backend exposes standard REST and WebSocket APIs, and the SDK is a regular TypeScript package. Apps can adopt auth, notifications, payments, or the whole stack. Solana wallet signatures, wallet addresses, Solana Pay references, and transaction verification remain normal composable Solana primitives.
