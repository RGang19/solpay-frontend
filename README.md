# SolPay - Solana Payment Gateway

SolPay is a modern, secure, and user-friendly payment gateway built on Solana's Devnet. It enables seamless peer-to-peer and merchant-to-customer transactions using SOL and SPL tokens.

## Key Features

- **Mobile Number Based Transfers**: Send SOL and SPL tokens directly to registered mobile numbers. No need for complex wallet addresses; if the user is in our database, the transfer is instant.
- **Wallet Integration**: Manage your Solana assets with secure custodial-to-custodial or custodial-to-mainnet transfers.
- **Send & Receive**: Instantly send SOL or SPL tokens (like USDC) by scanning a QR code or entering a wallet address/phone number.
- **Merchant Mode**: Turn your profile into a shopfront. Generate payment links, track customer payments, and manage business tools directly from the dashboard.
- **Split Dashboard**: A unified experience for both personal wallet management and merchant business tools.
- **Real-time Status tracking**: Monitor payment link statuses (Pending/Paid) in live time.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, Prisma (MongoDB)
- **Blockchain**: Solana Web3.js, SPL-Token
- **Styling**: Shadcn UI & Lucide Icons

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or bun
- Solana Devnet wallet (for testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd solpay-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:3001
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```

5. **Access the app**
   Open [http://localhost:8080](http://localhost:8080) in your browser.

## Usage

### Sending Money by Mobile Number

SolPay makes transfers easier than ever:
1. Navigate to **Send Money**.
2. Enter a **Mobile Number** instead of a public key.
3. If the number is registered, the system will automatically resolve it to their SolPay custodial wallet.
4. Select the Token (SOL or USDC) and amount.
5. Click **Send** to complete the transaction on Devnet.

### Receiving Money

1. Navigate to **Receive**.
2. Your QR code and wallet address are displayed.
3. You can receive both **SOL** and **all SPL tokens** (like USDC) at this single address.

### Merchant Checkout

1. Create a payment request in **Merchant Tools**.
2. Share the generated link with your customer.
3. The customer can pay via their SolPay dashboard or any standard Solana wallet.

## Development

### Building for Production

```bash
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC
