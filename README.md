# Laxo

EthGlobal's 2026 HackMoney Submission

Laxo is a prediction market platform for forex currencies, powered by Yellow Network's state channels for instant off-chain transactions and on-chain settlement via smart contracts.

## Features

- **10 Currency Prediction Markets**: USDC, EURC, JPYC, BRLA, MXNB, QCAD, AUDF, KRW1, PHPC, ZARU
- **Yellow SDK Integration**: Off-chain transactions via Nitrolite protocol (ERC-7824)
- **Instant Transactions**: Zero gas fees for position taking through state channels
- **On-Chain Settlement**: Final settlements executed via smart contracts
- **Oracle-Based Resolution**: Markets resolve using price oracles

## Project Structure

```
Laxo/
├── contracts/              # Smart contracts (Hardhat)
│   ├── contracts/src/      # Solidity contracts
│   ├── test/              # Contract tests
│   ├── scripts/            # Deployment scripts
│   └── hardhat.config.js   # Hardhat configuration
├── frontend/               # Next.js frontend
│   ├── app/               # Next.js app directory
│   └── lib/yellow/        # Yellow SDK integration
└── README.md
```

## Prerequisites

- Node.js 16+ and npm
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH (for contract deployment)
- Alchemy/Infura account (for RPC endpoint)

## Setup

### Frontend

From the repo root:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Smart Contracts

From the repo root:

```bash
cd contracts
npm install
```

## Smart Contract Deployment

### 1. Configure Environment

Create a `.env` file in the `contracts/` directory:

```bash
cd contracts
cp env.example .env
```

Edit `.env` with your values:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**Important**: Never commit your `.env` file or private keys to version control.

### 2. Compile Contracts

```bash
cd contracts
npm run compile
```

### 3. Run Tests

```bash
npm run test
```

### 4. Deploy to Sepolia Testnet

```bash
npm run deploy:sepolia
```

This will:
- Deploy `YellowIntegration` contract
- Deploy `MarketFactory` contract
- Deploy `MockERC20` (if no collateral token specified)
- Create prediction markets for all 10 currency pairs
- Save deployment addresses to `deployments/` directory
- Verify contracts on Etherscan (if API key provided)

### 5. Verify Contracts (Optional)

If verification didn't run during deployment:

```bash
npm run verify
```

## Yellow SDK Integration

### Overview

Laxo uses Yellow Network's Nitrolite protocol (ERC-7824) for off-chain state channel transactions. This enables:

- **Instant Payments**: No waiting for block confirmations
- **Zero Gas Fees**: Off-chain transactions don't require gas
- **Session-Based Spending**: Users can take positions instantly
- **On-Chain Settlement**: Final settlements are executed via smart contracts

### Architecture

```
User → Yellow SDK → ClearNode (State Channel) → Off-chain Transactions
                                              ↓
                                    Smart Contract Settlement
```

### Usage in Frontend

The Yellow SDK is integrated in `frontend/lib/yellow/`:

- **`yellowClient.js`**: Main client for connecting to Yellow Network
- **`yellowSession.js`**: Session management for prediction markets

Example usage:

```javascript
import { getYellowClient } from '@/lib/yellow/yellowClient'
import { createMarketSession } from '@/lib/yellow/yellowSession'

// Initialize client
const client = getYellowClient({
  endpoint: 'wss://clearnet-sandbox.yellow.com/ws' // Sandbox for testing
})

// Connect wallet and Yellow Network
await client.setupWallet()
await client.connect()

// Create session for a market
const session = createMarketSession(marketAddress, { client })
await session.initialize()

// Take position off-chain (instant, no gas)
await session.takePosition('long', '1000000') // 1 USDC
```

### Yellow Network Endpoints

- **Sandbox** (Testing): `wss://clearnet-sandbox.yellow.com/ws`
- **Production**: `wss://clearnet.yellow.com/ws`

## Smart Contracts

### PredictionMarket.sol

Main contract for individual prediction markets:

- Market creation with target price and resolution time
- Position taking (Long/Short)
- Oracle-based resolution
- Payout claiming for winners

### MarketFactory.sol

Factory contract for creating and managing multiple markets:

- Create markets for different currency pairs
- Batch market creation
- Query markets by currency pair

### YellowIntegration.sol

Helper contract for ERC-7824 state channel integration:

- Record off-chain positions
- Finalize settlements on-chain
- Track session data

## Testing

### Smart Contracts

```bash
cd contracts
npm run test
```

Tests cover:
- Market creation
- Position taking (Long/Short)
- Market resolution
- Payout claiming
- Yellow integration

### Frontend

The frontend includes manual testing capabilities:
- Connect wallet and Yellow Network
- Take positions in markets
- View positions and balances
- Test off-chain transactions

## Requirements Checklist

### ✅ Yellow SDK / Nitrolite Protocol
- Installed `@erc7824/nitrolite` package
- Integrated Yellow SDK client wrapper
- Connected to ClearNode (sandbox/production)
- Implemented state channel sessions

### ✅ Off-chain Transaction Logic
- Instant payments via Yellow SDK
- Session-based spending for market positions
- Off-chain position updates
- Settlement finalized via smart contracts

### ✅ Working Prototype
- Deployed contracts to Sepolia testnet
- Frontend integration with Yellow SDK
- Prediction markets for 10 currencies
- Demonstrates instant transactions + on-chain settlement

### 📹 Demo Video
- Create 2-3 minute demo showing:
  - Wallet connection
  - Taking positions in prediction markets
  - Instant off-chain transactions (no gas)
  - On-chain settlement finalization
  - Multi-currency support

## Development

### Adding New Markets

Markets are created via `MarketFactory.createMarket()`:

```solidity
marketFactory.createMarket(
  "USDC/NEWPAIR",      // Currency pair
  collateralToken,      // Token address
  targetPrice,          // Target price (8 decimals)
  resolutionTime        // Unix timestamp
)
```

### Customizing Oracle

Update the oracle address in `MarketFactory`:

```solidity
marketFactory.setOracle(newOracleAddress)
```

## Troubleshooting

### Yellow SDK Connection Issues

- Ensure MetaMask is installed and unlocked
- Check network connectivity
- Verify endpoint URL (sandbox vs production)
- Check browser console for errors

### Contract Deployment Issues

- Verify `.env` file has correct values
- Ensure wallet has Sepolia ETH
- Check RPC URL is valid
- Verify gas prices are reasonable

### Frontend Issues

- Clear browser cache
- Check browser console for errors
- Verify wallet is connected
- Ensure Yellow Network connection is established

## Deployment

### Vercel Deployment

The frontend is configured for deployment on Vercel with automatic CI/CD via GitHub Actions.

#### Quick Deploy (Recommended)

1. **Connect your GitHub repository to Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the Next.js configuration

2. **Configure project settings:**
   - **Root Directory**: Set to `frontend`
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (runs automatically from rootDirectory)
   - **Output Directory**: `.next` (default)

3. **Set environment variables** (if needed):
   - `NEXT_PUBLIC_APP_URL`: Your production URL (optional, defaults to `/hub`)

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your app
   - You'll get a live URL like `https://your-project.vercel.app`

#### Manual Deployment via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project root
cd /path/to/Laxo

# Deploy (first time will prompt for configuration)
vercel

# Deploy to production
vercel --prod
```

#### CI/CD with GitHub Actions

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to Vercel on push to `main`.

**Setup:**

1. **Get Vercel credentials:**
   ```bash
   # Install Vercel CLI and login
   npm i -g vercel
   vercel login
   
   # Link your project (run from project root)
   vercel link
   ```

2. **Add GitHub Secrets:**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `VERCEL_TOKEN`: Get from [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
     - `VERCEL_ORG_ID`: Found in `.vercel/project.json` after running `vercel link`
     - `VERCEL_PROJECT_ID`: Found in `.vercel/project.json` after running `vercel link`
     - `NEXT_PUBLIC_APP_URL`: (Optional) Your production URL

3. **Deploy:**
   - Push to `main` branch → GitHub Actions will automatically deploy
   - Check deployment status in the "Actions" tab

#### Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

- `NEXT_PUBLIC_APP_URL` (optional): Production app URL, defaults to `/hub`

#### Deployment Configuration

The project uses `vercel.json` to configure:
- Root directory: `frontend`
- Framework: Next.js (auto-detected)
- Build settings: Standard Next.js build process

#### Preview Deployments

- Every push to a branch creates a preview deployment
- Pull requests automatically get preview URLs
- Production deployments happen on push to `main`

#### Troubleshooting Deployment

**Build fails:**
- Check Node.js version (requires 16+)
- Verify all dependencies are in `package.json`
- Check build logs in Vercel dashboard

**Environment variables not working:**
- Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding new environment variables

**Monorepo issues:**
- Verify `vercel.json` has correct `rootDirectory` set to `frontend`
- Ensure `package.json` is in the `frontend` directory

## License

MIT

## Links

- [Yellow Network Documentation](https://docs.yellow.org)
- [ERC-7824 Specification](https://erc7824.org)
- [Hardhat Documentation](https://hardhat.org/docs)
