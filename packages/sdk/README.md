# Solana App Infrastructure SDK

Reusable TypeScript SDK for wallet authentication, real-time notifications, and Solana Pay payment intents.

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
console.log(linked.user.wallets); // mobile-created wallet plus any attached wallets

await infra.auth.detachWallet('attached-wallet-address');

const payment = await infra.payments.createPayment({
  amount: 0.05,
  label: 'Demo checkout',
});

await infra.payments.sendMoney({
  phone: '+15559876543',
  amount: 0.01,
  token: 'SOL',
});

infra.notifications.subscribeNotifications((event) => {
  console.log(event.type, event.payload);
});
```
