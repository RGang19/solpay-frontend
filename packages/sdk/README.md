# Solana App Infrastructure SDK

Reusable TypeScript SDK for wallet authentication, real-time notifications, and Solana Pay payment intents.

```ts
import { SolanaAppInfraClient } from '@solana-app-infra/sdk';

const infra = new SolanaAppInfraClient({
  apiUrl: 'https://api.example.com',
});

const session = await infra.auth.loginWithWallet(window.solana);
infra.setToken(session.token);

const payment = await infra.payments.createPayment({
  amount: 0.05,
  label: 'Demo checkout',
});

infra.notifications.subscribeNotifications((event) => {
  console.log(event.type, event.payload);
});
```
