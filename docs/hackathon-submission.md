# Hackathon Submission Narrative

## One-Line Pitch

We built a reusable Solana infrastructure stack that helps any app handle wallet authentication, mobile-number onboarding, real-time notifications, and native payments with a simple SDK.

## Problem

Solana apps need the same core infrastructure before they can deliver their real product: onboarding, wallet identity, sessions, notifications, payment requests, transaction verification, and status updates. Teams often rebuild these pieces from scratch, which slows development and creates inconsistent user experiences.

Mobile-first onboarding is also still painful. A user may start with a phone number, later connect a Phantom wallet, and then expect both identities to work together. Most apps either force a wallet-first flow or create fragmented accounts.

## Solution

Solana App Infrastructure SDK is a reusable infra layer for Solana apps. It gives developers two onboarding choices:

- Login with wallet signature
- Login with mobile number OTP

The phone-number flow creates exactly one primary mobile-created custodial wallet per phone number. If the same user later attaches an external Solana wallet, both wallets remain visible under the same mobile account. The user can detach external wallets, but the primary mobile-created wallet remains protected and tied to the phone account.

The same platform also provides live notifications, Solana Pay payment requests, backend verification, mobile-number transfers, copyable wallet addresses, and live wallet balances.

## What We Built

- Express + TypeScript backend
- MongoDB persistence through Prisma
- Wallet-signature auth with nonce challenges
- Mobile OTP login
- One primary wallet per mobile number
- External wallet linking and user-controlled detach
- JWT sessions
- Real-time notifications over WebSockets
- Notification history and read state
- Solana Pay payment request creation
- Solana Pay reference verification
- Mobile-number and wallet-address transfers
- React demo app
- TypeScript SDK package
- Public API and integration docs

## Demo Flow

1. User chooses `Login with wallet` or `Login with mobile number`.
2. Wallet login verifies a signed message.
3. Mobile login verifies OTP and creates one primary wallet for new phone numbers.
4. User links an external Solana wallet to the same mobile account.
5. Demo shows both wallets, full addresses, copy actions, balances, and wallet roles.
6. User can detach the external wallet if they choose.
7. User sends money by mobile number or wallet address.
8. User creates a Solana Pay payment request.
9. Backend verifies the payment reference.
10. A notification appears in real time.

## Architecture

```txt
React Demo App
  -> TypeScript SDK
  -> Express API
  -> Prisma + MongoDB
  -> Solana RPC
  -> WebSocket notification stream
```

Backend services:

- Auth service for wallet signatures, OTP login, sessions, linked wallets
- Notification service for stored events and live push
- Payment service for Solana Pay requests, transfers, and verification

SDK modules:

- `auth`
- `notifications`
- `payments`

## Why Solana

Solana's speed and low fees make the full loop feel natural: users can log in, create a payment request, verify a transfer, and receive a notification quickly. Solana Pay references and wallet signatures are composable primitives, so the platform fits naturally into the ecosystem instead of hiding it behind a closed system.

## Ecosystem Impact

This is useful for:

- Wallets
- Creator apps
- Commerce apps
- Gaming apps
- Marketplaces
- SaaS dashboards
- Hackathon teams
- Any Solana app that needs onboarding, messaging, and payments

Instead of rebuilding auth, notifications, and payment infrastructure, developers can integrate the SDK and focus on their app-specific product.

## UX Value

The demo highlights practical user experience improvements:

- Wallet or mobile login
- Mobile-created wallet for users without a wallet
- External wallet linking for users who already have one
- Clear wallet roles and balances
- Copyable full wallet addresses
- Mobile-number transfers
- Solana Pay requests
- Real-time payment notifications
- Logout and wallet detach controls

## Novelty

The differentiated angle is the combination of onboarding, wallet identity, notifications, and payments in one Solana-specific infrastructure layer.

This is stronger than a standalone auth SDK because it handles the full app lifecycle:

- Identify the user
- Keep the user reachable
- Let the user receive and send value
- Confirm payments
- Notify the user instantly

## Open Source And Composability

The project is designed for open-source use:

- Self-hostable backend
- TypeScript SDK
- REST and WebSocket APIs
- Solana wallet signatures
- Solana Pay references
- Normal wallet addresses and transaction verification

Apps can adopt one module or the entire stack.

## Business Potential

The open-source core can grow into a developer platform:

- Free self-hosted SDK and backend
- Paid hosted APIs
- Usage-based notification and payment verification pricing
- Developer dashboard for auth, payment, and notification analytics
- Team management and API keys
- Enterprise support for production Solana apps

## Roadmap

- Redis adapter for multi-instance notification fanout
- API keys and tenant isolation
- Webhook delivery for server-to-server events
- SPL token payment verification beyond the current MVP
- Developer dashboard
- Email OTP and social login adapters
- Wallet spend flow for attached external wallets through direct signing
