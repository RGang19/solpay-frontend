# Solana App Infrastructure SDK

Reusable TypeScript SDK for wallet authentication, real-time notifications, and Solana Pay payment intents.

```ts
import { SolanaAppInfraClient } from '@solana-app-infra/sdk';

const infra = new SolanaAppInfraClient({
  apiUrl: 'https://api.example.com',
});

const session = await infra.auth.loginWithWallet(window.solana);
infra.setToken(session.token);

await infra.auth.sendPhoneOtp('+15551234567');
const linked = await infra.auth.attachPhoneToWallet('+15551234567', '123456');
console.log(linked.user.wallets); // mobile-created wallet plus any attached wallets

const payment = await infra.payments.createPayment({
  amount: 0.05,
  label: 'Demo checkout',
});

infra.notifications.subscribeNotifications((event) => {
  console.log(event.type, event.payload);
});
```
