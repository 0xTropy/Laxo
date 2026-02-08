# Data Sources & Field Explanations

This document explains where all the data fields displayed in the prediction markets UI come from.

## Currency Price Data

### Current Price
- **Source**: Frankfurter API (primary) or ExchangeRate-API (fallback)
- **API Endpoint**: `https://api.frankfurter.app/latest?from={CURRENCY}&to=USD`
- **Update Frequency**: Every 30 seconds
- **Format**: Direct exchange rate (e.g., EUR/USD = 1.08 means 1 EUR = $1.08 USD)
- **Caching**: Prices are cached for 30 seconds to reduce API calls
- **Location**: `frontend/lib/oracle/priceFeed.js`

### Historical Price Data
- **Source**: Frankfurter API
- **API Endpoint**: `https://api.frankfurter.app/{startDate}..{endDate}?from={CURRENCY}&to=USD`
- **Time Range**: Last 24 hours (for chart initialization)
- **Update Frequency**: Fetched once on chart load, then updated via live subscription
- **Location**: `frontend/lib/oracle/priceFeed.js` → `fetchHistoricalPrices()`

## Market Data

### Target Price
- **Source**: User-defined when creating a market
- **Input**: User enters a target price in USD (e.g., "1.10" means $1.10 USD per unit of currency)
- **Storage**: Stored in local state (`markets` Map) and associated with each position
- **Location**: `frontend/components/CreateMarketModal.jsx` → `handleCreateMarket()`

### Resolution Time
- **Source**: User-defined when creating a market
- **Options**: 
  - Quick presets: 1 min, 5 min, 15 min, 30 min, 1 hour, 24 hours
  - Custom minutes input
  - Custom date/time picker
- **Storage**: Stored as Unix timestamp (seconds) in `market.resolutionTime`
- **Location**: `frontend/components/CreateMarketModal.jsx`

### Current Price (for winning/losing calculation)
- **Source**: Same as "Current Price" above (Frankfurter API)
- **Usage**: Compared against `targetPrice` to determine if Long/Short positions are winning
- **Logic**:
  - **Long winning**: `currentPrice >= targetPrice`
  - **Short winning**: `currentPrice < targetPrice`
- **Location**: `frontend/app/hub/forex-perps/page.jsx` → position display logic

## Position Data

### Position Amount
- **Source**: User input when taking a position
- **Default**: 1 USDC (converted to smallest units: 1 USDC = 1,000,000)
- **Conversion**: 
  - User enters amount in USDC (e.g., "1" = 1 USDC)
  - Converted to smallest unit: `amount * 1,000,000` (USDC has 6 decimals)
  - Stored as string: `"1000000"`
- **Location**: `frontend/app/hub/forex-perps/page.jsx` → `takePosition()`

### Position Type (Long/Short)
- **Source**: User selection when taking a position
- **Values**: `'long'` or `'short'`
- **Meaning**:
  - **Long**: Betting that price will go UP (above target)
  - **Short**: Betting that price will go DOWN (below target)
- **Location**: `frontend/app/hub/forex-perps/page.jsx` → `takePosition()`

### Position Status
- **Source**: Set when position is created
- **Values**: `'active'`, `'pending'`, `'resolved'`
- **Default**: `'active'` for all positions
- **Location**: `frontend/app/hub/forex-perps/page.jsx` → position tracking

## Balance Data

### USDC Balance
- **Source**: Yellow Network test wallet (for testnet)
- **Initial**: 0 USDC
- **Funding**: 
  - Manual addition via "Add USDC" button in WalletModal
  - Faucet links (Circle, ETHGlobal) - manual claiming required
- **Storage**: Cached in `localStorage` under `laxo_test_wallet`
- **Location**: `frontend/lib/yellow/yellowClient.js` → `testBalance.usdc`

## Chart Data

### Price Points
- **Source**: Historical price data from Frankfurter API
- **Processing**: 
  - Fetched as array of `{price, timestamp}` objects
  - Limited to last 50 data points for performance
  - Interpolated using bezier-like curves for smooth visualization
- **Location**: `frontend/components/PriceChart.jsx`

### Price Change Indicator
- **Source**: Calculated from first and last price in chart history
- **Calculation**:
  - `change = lastPrice - firstPrice`
  - `changePercent = (change / firstPrice) * 100`
- **Display**: Shows absolute change and percentage (color-coded: green for positive, red for negative)
- **Location**: `frontend/components/PriceChart.jsx`

## Market Creation Flow

1. **User clicks "Create Market"** → Opens `CreateMarketModal`
2. **User enters target price** → Stored as number (e.g., 1.10)
3. **User selects resolution time** → Converted to Unix timestamp
4. **Market created** → Added to `markets` Map in component state
5. **Market displayed** → Shows on currency card with "View Markets" button
6. **User takes position** → Links position to market via `marketId`

## Data Flow Summary

```
Frankfurter API → priceFeed.js → currentPrices Map → UI Display
                                    ↓
                            PriceChart Component
                                    ↓
                            Historical Data → Chart Visualization

User Input → CreateMarketModal → markets Map → Market Display
                                    ↓
                            User clicks Long/Short
                                    ↓
                            takePosition() → positions Map → Position Display
```

## Important Notes

1. **All prices are in USD**: The UI shows "Price (USD)" meaning how many USD = 1 unit of the currency
2. **Amounts are in USDC**: All betting amounts are denominated in USDC (USD Coin)
3. **Testnet only**: Currently using test wallets, not real blockchain transactions
4. **Off-chain positions**: Positions are tracked off-chain via Yellow Network state channels
5. **No real oracle yet**: Smart contracts use `MockPriceOracle` - production would use Pyth Network or Chainlink
