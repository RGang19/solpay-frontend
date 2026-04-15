# API Overview

Base URL in local development: `http://localhost:3001`

Authenticated endpoints require:

```http
Authorization: Bearer <jwt>
```

## Auth

### Create Wallet Login Challenge

`POST /api/auth/wallet/challenge`

Creates a nonce and human-readable message for Solana wallet login.

Request:

```json
{ "walletAddress": "..." }
```

Response:

```json
{
  "walletAddress": "...",
  "nonce": "...",
  "message": "Sign in to Solana App Infrastructure SDK...",
  "expiresAt": "2026-04-15T12:00:00.000Z"
}
```

### Verify Wallet Login

`POST /api/auth/wallet/verify`

Verifies the signed message and returns a JWT session. If the wallet is already linked to a phone account, that phone account is returned.

Request:

```json
{
  "walletAddress": "...",
  "nonce": "...",
  "signature": [1, 2, 3]
}
```

### Send Mobile OTP

`POST /api/auth/send-otp`

Sends a mobile OTP. The demo backend uses `123456`.

Request:

```json
{ "phone": "+15551234567" }
```

### Login With Mobile Number

`POST /api/auth/verify-otp`

Logs in with a mobile number after OTP verification. Existing phone users get the same account and wallet list. New phone numbers get one primary custodial Solana wallet.

Request:

```json
{ "phone": "+15551234567", "otp": "123456" }
```

### Get Current Session

`GET /api/auth/session/me`

Returns the authenticated user, full wallet list, wallet roles, send/receive capabilities, and live SOL balances.

Example wallet item:

```json
{
  "address": "...",
  "type": "mobile_created",
  "label": "Mobile-created custodial wallet",
  "balance": 0.25,
  "token": "SOL",
  "canSend": true,
  "canReceive": true,
  "isPrimary": true
}
```

### Attach Wallet To Mobile Account

`POST /api/auth/phone/attach`

Attaches the currently authenticated signed wallet to a verified mobile number.

If the phone already owns a mobile-created wallet, the signed wallet is added as an attached wallet under the same phone account. The primary mobile-created wallet is not replaced.

Request:

```json
{ "phone": "+15551234567", "otp": "123456" }
```

### Detach External Wallet

`POST /api/auth/wallet/detach`

Detaches an external linked wallet from the authenticated phone account. The primary mobile-created wallet cannot be detached.

Request:

```json
{ "walletAddress": "..." }
```

## Notifications

### List Notifications

`GET /api/notifications`

Returns notification history for the authenticated user.

### Send Notification

`POST /api/notifications`

Creates, stores, and pushes a live notification.

Request:

```json
{
  "userId": "...",
  "type": "payment.confirmed",
  "title": "Payment confirmed",
  "body": "Your checkout was paid.",
  "data": {
    "paymentId": "..."
  }
}
```

### Update Read State

`PATCH /api/notifications/:id`

Request:

```json
{ "read": true }
```

### WebSocket Stream

`WS /ws?token=<jwt>`

Streams real-time notification events for the authenticated user.

## Payments

### Send Money

`POST /api/payments/send`

Sends SOL or USDC from the user's primary mobile-created custodial wallet to a registered phone number or direct Solana wallet address.

Request:

```json
{
  "phone": "+15551234567",
  "amount": 0.01,
  "token": "SOL"
}
```

Notes:

- Phone recipients resolve to their primary mobile-created wallet.
- Direct Solana addresses are supported.
- Attached external wallets are displayed and can receive, but spending from them requires signing with that wallet directly.

### Create Solana Pay Request

`POST /api/infra/payments`

Creates a Solana Pay request with a unique reference.

Request:

```json
{
  "amount": 0.05,
  "token": "SOL",
  "recipientAddress": "...",
  "label": "Checkout",
  "message": "Order #1001"
}
```

Response includes `checkout_url`, `reference`, `status`, and payment metadata.

### Get Payment Status

`GET /api/infra/payments/:id`

Returns the current payment status.

### Verify Payment

`POST /api/infra/payments/:id/verify`

Checks Solana RPC for a confirmed transaction against the payment reference. On success, the payment status updates and a notification is pushed.
