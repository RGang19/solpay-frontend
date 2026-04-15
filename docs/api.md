# API Overview

## Auth

`POST /api/auth/wallet/challenge`

Creates a nonce and message for wallet login.

```json
{ "walletAddress": "..." }
```

`POST /api/auth/wallet/verify`

Verifies the signed message and returns a JWT.

```json
{ "walletAddress": "...", "nonce": "...", "signature": [1, 2, 3] }
```

`GET /api/auth/session/me`

Returns the current authenticated user.

`POST /api/auth/send-otp`

Sends a phone OTP. The demo backend uses `123456`.

```json
{ "phone": "+15551234567" }
```

`POST /api/auth/verify-otp`

Logs in an existing phone user, or creates a new account with a custodial Solana wallet if the phone is new.

```json
{ "phone": "+15551234567", "otp": "123456" }
```

`POST /api/auth/phone/attach`

Attaches a verified phone number to the authenticated wallet user.
If the phone already owns a mobile-created wallet, the signed wallet is added as an attached wallet under the same phone account and the response includes both wallets.

```json
{ "phone": "+15551234567", "otp": "123456" }
```

`POST /api/auth/wallet/detach`

Detaches an external linked wallet from the authenticated phone account. The primary mobile-created wallet cannot be detached.

```json
{ "walletAddress": "..." }
```

## Notifications

`GET /api/notifications`

Returns notification history for the authenticated user.

`POST /api/notifications`

Creates and pushes a live notification.

```json
{
  "userId": "...",
  "type": "payment.confirmed",
  "title": "Payment confirmed",
  "body": "Your checkout was paid."
}
```

`PATCH /api/notifications/:id`

Updates read state.

```json
{ "read": true }
```

`WS /ws?token=<jwt>`

Streams notification events.

## Payments

`POST /api/payments/send`

Sends money from the user's mobile-created custodial wallet to a registered phone number or a direct Solana wallet address.

```json
{
  "phone": "+15551234567",
  "amount": 0.01,
  "token": "SOL"
}
```

`POST /api/infra/payments`

Creates a Solana Pay request with a unique reference.

```json
{
  "amount": 0.05,
  "token": "SOL",
  "recipientAddress": "...",
  "label": "Checkout",
  "message": "Order #1001"
}
```

`GET /api/infra/payments/:id`

Returns payment status.

`POST /api/infra/payments/:id/verify`

Checks Solana RPC for a confirmed transaction against the payment reference and pushes a notification on success.
