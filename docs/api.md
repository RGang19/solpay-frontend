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
