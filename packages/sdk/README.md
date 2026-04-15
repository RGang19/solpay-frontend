# Solana App Infrastructure SDK

TypeScript SDK for Solana apps that need wallet login, mobile-number onboarding, linked wallets, notifications, and payments.

## Install

```bash
npm install @solana-app-infra/sdk
```

## Create Client

```ts
import { SolanaAppInfraClient } from '@solana-app-infra/sdk';

const infra = new SolanaAppInfraClient({
  apiUrl: 'https://api.example.com',
});
```

## Auth

Login with a Solana wallet:

```ts
const walletSession = await infra.auth.loginWithWallet(window.solana);
infra.setToken(walletSession.token);
```

Login with a mobile number:

```ts
await infra.auth.sendPhoneOtp('+15551234567');
const mobileSession = await infra.auth.loginWithPhone('+15551234567', '123456');
infra.setToken(mobileSession.token);
```

Attach a signed wallet to a mobile account:

```ts
const linked = await infra.auth.attachPhoneToWallet('+15551234567', '123456');
console.log(linked.user.wallets);
```

Detach an external linked wallet:

```ts
await infra.auth.detachWallet('attached-wallet-address');
```

The primary mobile-created wallet cannot be detached from its phone number.

## Notifications

```ts
const notifications = await infra.notifications.getNotifications();

infra.notifications.subscribeNotifications((event) => {
  console.log(event.type, event.payload);
});

await infra.notifications.sendNotification(userId, {
  type: 'payment.confirmed',
  title: 'Payment confirmed',
  body: 'Your checkout was paid.',
});
```

## Payments

Send money by mobile number or wallet address:

```ts
await infra.payments.sendMoney({
  phone: '+15559876543',
  amount: 0.01,
  token: 'SOL',
});
```

Create and verify a Solana Pay request:

```ts
const { payment } = await infra.payments.createPayment({
  amount: 0.05,
  label: 'Demo checkout',
});

await infra.payments.verifyPayment(payment.id);
```

## Exposed Methods

Auth:

- `sendPhoneOtp(phone)`
- `loginWithPhone(phone, otp)`
- `loginWithWallet(wallet)`
- `attachPhoneToWallet(phone, otp)`
- `detachWallet(walletAddress)`
- `verifySession()`
- `getCurrentUser()`

Notifications:

- `sendNotification(userId, payload)`
- `subscribeNotifications(handler)`
- `getNotifications()`
- `markNotification(id, read)`

Payments:

- `createPayment(payload)`
- `sendMoney(payload)`
- `verifyPayment(paymentId)`
- `getPaymentStatus(paymentId)`
