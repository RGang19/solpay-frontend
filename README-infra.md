# Solana App Infrastructure SDK

A reusable developer infrastructure stack for Solana applications. It gives app builders three primitives in one toolkit:

- Wallet-based authentication with signed-message verification and JWT sessions
- Real-time in-app notifications with stored read state and WebSocket delivery
- Solana Pay payment intents with reference tracking, backend verification, and automatic payment notifications

This is infrastructure for other apps, not a single-purpose consumer wallet.

## Why It Matters

Most Solana apps rebuild the same foundation: wallet login, user sessions, product notifications, checkout links, payment verification, and status updates. This project packages those pieces into a composable SDK and backend so teams can ship app-specific value faster.

Useful for wallets, creator tools, commerce apps, gaming apps, SaaS dashboards, marketplaces, and any Solana product that needs onboarding plus payments.

## Architecture

```txt
sol-pay/
  Sol-pay-Backend-main/     Express + TypeScript API, Prisma, WebSocket notifications
  solpay-frontend-main/     React demo app consuming the infra APIs
  packages/sdk/             Reusable TypeScript SDK for third-party apps
  docs/                     Hackathon and integration docs
```

Backend modules:

- `auth`: wallet challenge, signature verification, user creation, JWT/session handling
- `notifications`: stored notifications, read/unread updates, real-time push
- `payments`: Solana Pay URL creation, reference tracking, backend verification

SDK modules:

- `auth.loginWithWallet()`
- `auth.verifySession()`
- `auth.getCurrentUser()`
- `notifications.sendNotification()`
- `notifications.subscribeNotifications()`
- `notifications.getNotifications()`
- `payments.createPayment()`
- `payments.verifyPayment()`
- `payments.getPaymentStatus()`

## Local Setup

Use Node 20.

```bash
cd Sol-pay-Backend-main
source ~/.nvm/nvm.sh && nvm use 20
npm install
npx prisma generate
npm run dev
```

```bash
cd solpay-frontend-main
source ~/.nvm/nvm.sh && nvm use 20
npm install
npm run dev
```

Open `http://localhost:8080`.

## Demo Flow

1. Connect Phantom or another `window.solana` wallet.
2. Sign the login challenge.
3. Backend verifies the signature, creates a user, and returns a JWT.
4. Create a Solana Pay payment request.
5. Scan or open the payment link.
6. Verify the payment on the backend.
7. A real-time notification appears in the demo.

## Business Model

- Free open-source SDK and self-hosted backend
- Paid hosted APIs for teams that do not want to operate infra
- Developer dashboard for notification analytics, auth usage, and payment monitoring
- Usage-based pricing for hosted notifications, sessions, and payment verification
- Enterprise support for app teams building at scale

## Open Source And Composability

The SDK is designed as a generic TypeScript package and the backend exposes standard REST/WebSocket APIs. Apps can use one module or all three, and the Solana Pay references remain normal Solana primitives that can be inspected independently.
