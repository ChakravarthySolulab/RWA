# RWA Commodities Tokenization Platform

A Real World Asset (RWA) tokenization platform for commodities (Gold, Silver, Oil, etc.) built with Solidity smart contracts, Hardhat, Node.js/Express backend, and MongoDB.

## Deployed Contract

| Property | Value |
|----------|-------|
| **Network** | Polygon Amoy Testnet |
| **Contract Address** | `0x0dEAcc5599530b13D18E7C6e405F52a20c64DA0C` |
| **Token Name** | Gold Commodity Token |
| **Symbol** | GLDT |
| **Decimals** | 18 |
| **Verified** | Yes |
| **Polygonscan** | [View Contract](https://amoy.polygonscan.com/address/0x0dEAcc5599530b13D18E7C6e405F52a20c64DA0C#code) |

## Features

### Smart Contract (RWAToken.sol)
- ERC20 token with 18 decimals
- Role-based access control (Admin, Issuer, Investor)
- Whitelist-based transfer compliance
- Pause/Unpause functionality
- Asset metadata storage (commodity type, quantity, storage location, certifications)
- Mint/Burn with reason logging

### Backend API
- MetaMask wallet authentication (signature verification + JWT)
- Asset onboarding and verification workflows
- Token operations (mint, burn, transfer, balance)
- Whitelist management
- Compliance controls (pause/unpause)
- Blockchain event synchronization

## Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- MetaMask wallet with Amoy testnet MATIC
- Polygonscan API key (for contract verification)

## Project Structure

```
RWA/
├── contracts/
│   └── RWAToken.sol          # Main token contract
├── scripts/
│   ├── deploy.js             # Deployment script
│   ├── e2e-test.js           # End-to-end test (with backend)
│   └── test-contract.js      # Contract-only E2E test
├── test/
│   └── RWAToken.test.js      # Unit tests (35 tests)
├── backend/
│   └── src/
│       ├── config/           # Database & blockchain config
│       ├── controllers/      # API controllers
│       ├── middleware/       # Auth & validation
│       ├── models/           # MongoDB schemas (User, Asset, Transaction)
│       ├── routes/           # API routes
│       ├── services/         # Event sync service
│       └── app.js            # Express application
├── artifacts/                # Compiled contract ABIs
├── hardhat.config.js
├── package.json
└── .env
```

## Quick Start

### Using Deployed Contract

The contract is already deployed and verified on Amoy testnet. To interact:

1. Add Amoy testnet to MetaMask (Chain ID: 80002, RPC: https://rpc-amoy.polygon.technology)
2. Get test MATIC from [Polygon Faucet](https://faucet.polygon.technology/)
3. Import the contract address: `0x0dEAcc5599530b13D18E7C6e405F52a20c64DA0C`

### Fresh Deployment

### 1. Install Dependencies

```bash
# Install root dependencies (Hardhat, OpenZeppelin)
npm install

# Install backend dependencies
npm run backend:install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```env
# Get testnet MATIC from https://faucet.polygon.technology/
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_wallet_private_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# MongoDB - start local instance or use Atlas
MONGODB_URI=mongodb://localhost:27017/rwa_commodities

# JWT secret for API authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h

PORT=3000
NODE_ENV=development
```

### 3. Compile & Test Contracts

```bash
# Compile contracts
npm run compile

# Run unit tests
npm run test
```

### 4. Deploy to Amoy Testnet

```bash
# Deploy contract
npm run deploy:amoy

# Copy the CONTRACT_ADDRESS from output to .env
```

### 5. Start Backend Server

```bash
# Start MongoDB (if using local)
mongod

# Start backend in development mode
npm run backend:dev
```

### 6. Run E2E Tests

```bash
node scripts/e2e-test.js
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/nonce/:address` | Get signing nonce |
| POST | `/api/auth/connect` | Connect wallet with signature |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update user profile |

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assets` | Create new asset |
| GET | `/api/assets` | List all assets |
| GET | `/api/assets/:id` | Get asset by ID |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset |
| PUT | `/api/assets/:id/verify` | Verify asset (admin) |

### Tokens
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tokens/info` | Get token info |
| GET | `/api/tokens/balance/:address` | Get token balance |
| POST | `/api/tokens/mint` | Mint tokens (issuer) |
| POST | `/api/tokens/burn` | Burn tokens |
| POST | `/api/tokens/transfer` | Transfer tokens |

### Whitelist
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/whitelist/:address` | Check whitelist status |
| POST | `/api/whitelist/add` | Add to whitelist (admin) |
| POST | `/api/whitelist/remove` | Remove from whitelist |
| POST | `/api/whitelist/batch` | Batch add to whitelist |

### Compliance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compliance/status` | Get pause status |
| POST | `/api/compliance/pause` | Pause contract (admin) |
| POST | `/api/compliance/unpause` | Unpause contract (admin) |
| POST | `/api/compliance/roles/grant` | Grant role |
| POST | `/api/compliance/roles/revoke` | Revoke role |

## MetaMask Authentication Flow

1. **Get Nonce**: `GET /api/auth/nonce/0x...`
2. **Sign Message**: Use MetaMask to sign the returned message
3. **Connect**: `POST /api/auth/connect` with address and signature
4. **Use Token**: Include JWT in `Authorization: Bearer <token>` header

## Token Issuance Flow

1. **Create Asset**: Submit asset details via `/api/assets`
2. **Upload Documents**: Add certification documents
3. **Verify Asset**: Admin verifies asset via `/api/assets/:id/verify`
4. **Whitelist Investor**: Add investor address to whitelist
5. **Mint Tokens**: Issue tokens to whitelisted investor
6. **Transfer**: Investor can transfer to other whitelisted addresses

## Smart Contract Roles

| Role | Permissions |
|------|-------------|
| DEFAULT_ADMIN | Grant/revoke all roles |
| ADMIN_ROLE | Manage whitelist, pause/unpause |
| ISSUER_ROLE | Mint new tokens |

## Testing

### Unit Tests (35 passing)

```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:coverage
```

**Test Coverage:**
- Deployment (5 tests)
- Whitelisting (6 tests)
- Minting (5 tests)
- Burning (3 tests)
- Transfers (4 tests)
- Pause/Unpause (4 tests)
- Role Management (5 tests)
- Metadata Management (2 tests)
- Integration Tests (1 test)

### E2E Tests

```bash
# Contract-only E2E test (no backend required)
node scripts/test-contract.js

# Full E2E test (requires backend running)
node scripts/e2e-test.js
```

## Deployment Networks

- **Localhost**: `npm run deploy:local` (requires `npm run node` first)
- **Amoy Testnet**: `npm run deploy:amoy`

## Contract Verification

The deployed contract is already verified. For new deployments:

```bash
npx hardhat verify --network amoy <CONTRACT_ADDRESS> \
  "Gold Commodity Token" "GLDT" "GOLD" "oz" 10000 \
  "Secure Vault, London, UK" "QmInitialCertificationHashPlaceholder"
```

**Current Contract:** [Verified on Polygonscan](https://amoy.polygonscan.com/address/0x0dEAcc5599530b13D18E7C6e405F52a20c64DA0C#code)

## Security Considerations

- Private keys should never be committed to git
- Use environment variables for sensitive data
- Whitelist-only transfers provide compliance control
- Pause functionality for emergency situations
- Role-based access prevents unauthorized operations

## License

MIT
