# Instant Profit Calculator

## Overview

A live trading dashboard for tracking new token launches in real-time. This tool allows traders to add any new token, load their actual buys from their wallet, see live price updates with embedded charts, and set profit targets with visual alerts.

---

## Purpose

When a new token launches (e.g., CHECKS, VIBESTR), traders need to:
1. Track their entry - exact cost basis from blockchain data
2. Monitor profit/loss - live updates as price changes
3. Plan exits - set targets and get alerts when hit
4. Make decisions fast - all data in one place, completely live

This tool fills the gap between Launch Simulator (historical data) and Exit Strategy (portfolio tracking for known tokens).

---

## Project Integration

### Routing Setup

**File:** `src/App.tsx` (lines 1-24)

Add new route to existing Routes configuration:

```typescript
// Add import at top
import InstantProfit from './pages/InstantProfit'

// Add route in Routes component
<Route path="/instant-profit" element={<InstantProfit />} />
```

Complete updated routing structure:
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing'
import LaunchSimulator from './pages/LaunchSimulator'
import LaunchStrategyPlanner from './pages/LaunchStrategyPlanner'
import ExitStrategy from './pages/ExitStrategy'
import AllMetrics from './pages/AllMetrics'
import InstantProfit from './pages/InstantProfit'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/launch-simulator" element={<LaunchSimulator />} />
        <Route path="/launch-strategy-planner" element={<LaunchStrategyPlanner />} />
        <Route path="/exit-strategy" element={<ExitStrategy />} />
        <Route path="/all-metrics" element={<AllMetrics />} />
        <Route path="/instant-profit" element={<InstantProfit />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

### Landing Page Card

**File:** `src/pages/Landing.tsx` (after line 108, before line 110)

Update grid from `md:grid-cols-2` to `md:grid-cols-3` on line 25:

```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
```

Add new card between Exit Strategy card (ends line 108) and All Strategies Overview (starts line 111):

```typescript
{/* Instant Profit Card */}
<Link to="/instant-profit" className="block group">
  <div className="border-punk glass-card rounded-lg p-10 h-full hover-lift hover-border transition-all duration-300">
    <div className="flex flex-col h-full">
      <h2 className="text-3xl font-black mb-5 text-white uppercase tracking-tight">
        INSTANT PROFIT
      </h2>
      
      <p className="text-gray-500 mb-8 text-sm leading-relaxed">
        Track live launches with real-time wallet data and profit targets
      </p>
      
      <ul className="space-y-4 mb-10 flex-grow">
        <li className="flex items-start gap-3">
          <span className="text-white font-bold">—</span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Dynamic Token Addition</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-white font-bold">—</span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Wallet Auto-Load (Etherscan)</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-white font-bold">—</span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Live Price Updates (5-10s)</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-white font-bold">—</span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Embedded Price Chart</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-white font-bold">—</span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Profit Targets with Alerts</span>
        </li>
      </ul>
      
      <button className="btn-punk w-full">
        Enter →
      </button>
    </div>
  </div>
</Link>
```

Design follows existing pattern:
- Uses `border-punk glass-card` classes (defined in `src/index.css` lines 75-86)
- Same typography: `text-3xl font-black` for title, `text-xs text-gray-400 uppercase` for features
- Same button: `btn-punk` class (defined in `src/index.css` lines 98-119)
- Same hover effects: `hover-lift hover-border` (defined in `src/index.css` lines 89-95)

---

## Feature Specification

### 1. Dynamic Token Addition
**Requirement:** Add ANY token address without hardcoding or config files

**Implementation:**

**API:** DexScreener `/latest/dex/tokens/{address}` endpoint
- **Endpoint:** `https://api.dexscreener.com/latest/dex/tokens/{tokenAddress}`
- **Method:** GET
- **No authentication required**

**Exact Response Structure** (verified from live API test):
```json
{
  "schemaVersion": "1.0.0",
  "pairs": [
    {
      "chainId": "ethereum",
      "dexId": "uniswap",
      "pairAddress": "0xbdb0f9c31367485f85e691f638345f3de673a78effaff71ce34bc7ff1d54fddc",
      "baseToken": {
        "address": "0xc50673EDb3A7b94E8CAD8a7d4E0cD68864E33eDF",
        "name": "PunkStrategy",
        "symbol": "PNKSTR"
      },
      "quoteToken": {
        "address": "0x0000000000000000000000000000000000000000",
        "name": "Ether",
        "symbol": "ETH"
      },
      "priceUsd": "0.1586",
      "marketCap": 152621730,
      "liquidity": {
        "usd": 8324372.42
      },
      "volume": {
        "h24": 5154605.66
      },
      "priceChange": {
        "h24": -16.78
      }
    }
  ]
}
```

**Function Implementation:**

**File:** `src/pages/InstantProfit.tsx`

```typescript
// Reuse existing function from src/api.ts
import { fetchDexByTokenAddress, type DexPair } from '../api'

async function loadTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
  try {
    // Fetch pairs from DexScreener
    const pairs = await fetchDexByTokenAddress(tokenAddress)
    
    if (!pairs || pairs.length === 0) {
      throw new Error('Token not found on DexScreener')
    }
    
    // Select pair with highest liquidity (same logic as existing code)
    const best = pairs.reduce((a, b) => 
      ((a?.liquidity?.usd ?? 0) >= (b?.liquidity?.usd ?? 0) ? a : b)
    )
    
    // Extract token info
    const tokenInfo: TokenInfo = {
      address: tokenAddress.toLowerCase(),
      name: best.baseToken.name,
      symbol: best.baseToken.symbol,
      poolId: best.pairAddress || '',
      currentPrice: best.priceUsd ? Number(best.priceUsd) : 0,
      marketCap: best.marketCap || 0,
      addedAt: Date.now()
    }
    
    return tokenInfo
  } catch (error) {
    console.error('Error loading token info:', error)
    return null
  }
}
```

**TypeScript Interface:**
```typescript
interface TokenInfo {
  address: string
  name: string
  symbol: string
  poolId: string
  currentPrice: number
  marketCap: number
  addedAt: number
}
```

**localStorage Persistence:**
```typescript
const STORAGE_KEY_TOKEN_INFO = 'instantProfit_tokenInfo'

// Save token info
function saveTokenInfo(info: TokenInfo) {
  localStorage.setItem(STORAGE_KEY_TOKEN_INFO, JSON.stringify(info))
}

// Load token info on page load
function loadSavedTokenInfo(): TokenInfo | null {
  const saved = localStorage.getItem(STORAGE_KEY_TOKEN_INFO)
  return saved ? JSON.parse(saved) : null
}
```

**Component State:**
```typescript
const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(loadSavedTokenInfo)
const [tokenAddress, setTokenAddress] = useState<string>('')
const [isLoadingToken, setIsLoadingToken] = useState<boolean>(false)
const [tokenError, setTokenError] = useState<string>('')
```

**UI Implementation:**

```typescript
{/* Token Input Section */}
<div className="glass-card border-punk rounded-lg p-6 mb-8">
  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">
    1. Add Token
  </h3>
  
  <div className="flex gap-4">
    <input
      type="text"
      value={tokenAddress}
      onChange={(e) => setTokenAddress(e.target.value)}
      placeholder="Token Contract Address (0x...)"
      className="flex-1 border border-gray-700 rounded-md px-4 py-2 bg-gray-800 text-white placeholder-gray-500"
    />
    <button
      onClick={handleLoadToken}
      disabled={isLoadingToken || !tokenAddress}
      className="btn-punk px-8"
    >
      {isLoadingToken ? 'Loading...' : 'Load Token'}
    </button>
  </div>
  
  {tokenError && (
    <div className="mt-3 p-3 bg-red-900/20 border border-red-700/30 rounded text-sm text-red-400">
      {tokenError}
    </div>
  )}
  
  {tokenInfo && (
    <div className="mt-4 p-4 border border-gray-700 rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-2xl font-bold">{tokenInfo.symbol}</div>
          <div className="text-sm text-gray-400">{tokenInfo.name}</div>
          <div className="text-xs text-gray-500 mt-1">{tokenInfo.address}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Current Price</div>
          <div className="text-xl font-bold">${tokenInfo.currentPrice.toFixed(4)}</div>
        </div>
      </div>
    </div>
  )}
</div>
```

**Event Handler:**
```typescript
async function handleLoadToken() {
  if (!tokenAddress) return
  
  setIsLoadingToken(true)
  setTokenError('')
  
  const info = await loadTokenInfo(tokenAddress)
  
  if (info) {
    setTokenInfo(info)
    saveTokenInfo(info)
    setTokenError('')
  } else {
    setTokenError('Token not found. Please check the address and try again.')
  }
  
  setIsLoadingToken(false)
}
```

**Validation:**
- Check for valid Ethereum address format (0x + 40 hex characters)
- Verify token exists on DexScreener
- Handle API errors gracefully
- Show clear error messages

**No Permanent Storage:**
- Token info stored only in localStorage (session-based)
- NOT added to `COINS` array in `src/components/StrategyOverview.tsx`
- NOT added to `POOL_CONFIG` in `src/geckoterminal.ts`
- Clearing localStorage removes the token

---

### 2. Entry Data (Wallet or Manual Input)
**Requirement:** Load actual buys from Etherscan transaction history OR manual entry for simulation

**Two Modes:**
1. **Wallet Mode:** Auto-load from blockchain (100% accurate)
2. **Manual Mode:** User inputs holdings and entry price (for planning/privacy)

---

#### Mode 1: Wallet Integration (Exact Blockchain Data)

**Implementation:**

**Reuse Existing System:** 
- **File:** `src/etherscan.ts`
- **Function:** `fetchWalletPortfolio(walletAddress: string, tokenAddress: string)`
- **Returns:** `WalletPortfolioData` type

**Exact Function Signature** (from `src/etherscan.ts` lines 75-86):
```typescript
export type WalletPortfolioData = {
  totalTokens: number // Net holdings (buys - sells)
  avgEntryPrice: number // Weighted average entry price in USD
  totalInvestedUSD: number // Total USD spent on buys
  totalReceivedUSD: number // Total USD received from sells
  realizedProfitLoss: number // Realized P/L from completed sells
  transactionCount: number // Number of transactions
  firstBuyTimestamp: number | null // Timestamp of first purchase
  lastActivityTimestamp: number | null // Timestamp of last activity
  errors: string[] // List of errors encountered during calculation
  warnings: string[] // List of warnings (e.g., missing ETH data)
}

export async function fetchWalletPortfolio(
  walletAddress: string,
  tokenContractAddress: string
): Promise<WalletPortfolioData | null>
```

**How It Works:**

1. **Fetch ERC-20 Transfers** (Etherscan API)
   - Endpoint: `?module=account&action=tokentx&address={wallet}&contractaddress={token}`
   - Returns all token transfers (buys and sells)

2. **Extract USD Values** (Two methods, priority order):
   - **Method 1:** Parse stablecoin swaps (USDC/USDT/DAI) from transaction logs
     - Most accurate - direct USD value from DEX swap
     - Function: `extractUSDFromLogs()` in `src/etherscan.ts`
   - **Method 2:** Calculate from ETH spent using historical ETH prices
     - Parse WETH transfers from logs
     - Fetch historical ETH price for transaction date (CoinGecko API)
     - Function: `batchFetchHistoricalETHPrices()` with localStorage cache

3. **Calculate Portfolio Metrics:**
   - Weighted average entry price
   - Total USD invested
   - Current holdings
   - Realized profit/loss from sells

**Component Implementation:**

**File:** `src/pages/InstantProfit.tsx`

**State Management:**
```typescript
const [walletAddress, setWalletAddress] = useState<string>(() => {
  return localStorage.getItem('instantProfit_walletAddress') || ''
})
const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false)
const [walletError, setWalletError] = useState<string>('')
const [walletData, setWalletData] = useState<WalletPortfolioData | null>(null)
const [walletDataErrors, setWalletDataErrors] = useState<string[]>([])
const [walletDataWarnings, setWalletDataWarnings] = useState<string[]>([])
```

**Load Wallet Function:**
```typescript
async function handleLoadWallet() {
  if (!walletAddress || !tokenInfo) return
  
  setIsLoadingWallet(true)
  setWalletError('')
  setWalletDataErrors([])
  setWalletDataWarnings([])
  
  try {
    const portfolio = await fetchWalletPortfolio(walletAddress, tokenInfo.address)
    
    setWalletData(portfolio)
    setWalletDataErrors(portfolio.errors)
    setWalletDataWarnings(portfolio.warnings)
    
    // Save wallet address to localStorage
    localStorage.setItem('instantProfit_walletAddress', walletAddress)
    
    console.log('Wallet loaded:', {
      holdings: portfolio.holdings,
      avgEntry: portfolio.avgEntryPrice,
      invested: portfolio.totalInvestedUSD
    })
  } catch (error) {
    console.error('Error loading wallet:', error)
    setWalletError('Failed to load wallet data. Please check the address and try again.')
  } finally {
    setIsLoadingWallet(false)
  }
}
```

**UI Implementation:**
```typescript
{/* Wallet Loading Section */}
<div className="glass-card border-punk rounded-lg p-6 mb-8">
  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">
    2. Load Your Wallet
  </h3>
  
  <div className="flex gap-4 mb-4">
    <input
      type="text"
      value={walletAddress}
      onChange={(e) => setWalletAddress(e.target.value)}
      placeholder="Ethereum Wallet Address (0x...)"
      className="flex-1 border border-gray-700 rounded-md px-4 py-2 bg-gray-800 text-white placeholder-gray-500"
      disabled={!tokenInfo}
    />
    <button
      onClick={handleLoadWallet}
      disabled={isLoadingWallet || !walletAddress || !tokenInfo}
      className="btn-punk px-8"
    >
      {isLoadingWallet ? 'Loading...' : 'Load Data'}
    </button>
  </div>
  
  {walletData && (
    <button
      onClick={handleLoadWallet}
      disabled={isLoadingWallet}
      className="text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wide"
    >
      {isLoadingWallet ? 'Reloading...' : 'Reload Wallet Data'}
    </button>
  )}
  
  {walletError && (
    <div className="mt-3 p-3 bg-red-900/20 border border-red-700/30 rounded text-sm text-red-400">
      {walletError}
    </div>
  )}
  
  {walletDataWarnings.length > 0 && (
    <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded text-xs">
      <div className="font-semibold text-yellow-400 mb-1">
        Data Quality Warnings ({walletDataWarnings.length})
      </div>
      <div className="text-yellow-300/80 space-y-1 max-h-32 overflow-y-auto">
        {walletDataWarnings.slice(0, 3).map((warning, i) => (
          <div key={i}>• {warning}</div>
        ))}
        {walletDataWarnings.length > 3 && (
          <div className="text-yellow-400/60 italic">
            + {walletDataWarnings.length - 3} more (check console)
          </div>
        )}
      </div>
    </div>
  )}
  
  {walletDataErrors.length > 0 && (
    <div className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded text-xs">
      <div className="font-semibold text-red-400 mb-1">
        Calculation Errors ({walletDataErrors.length})
      </div>
      <div className="text-red-300/80 space-y-1 max-h-32 overflow-y-auto">
        {walletDataErrors.slice(0, 3).map((error, i) => (
          <div key={i}>• {error}</div>
        ))}
        {walletDataErrors.length > 3 && (
          <div className="text-red-400/60 italic">
            + {walletDataErrors.length - 3} more (check console)
          </div>
        )}
      </div>
    </div>
  )}
  
  {walletData && walletData.totalTokens > 0 && (
    <div className="mt-4 grid grid-cols-3 gap-4">
      <div className="border border-gray-800 rounded-md p-3 bg-gray-900">
        <div className="text-xs text-gray-500 mb-2">Total Holdings</div>
        <div className="text-xl font-bold text-white">
          {walletData.totalTokens.toLocaleString()} {tokenInfo.symbol}
        </div>
      </div>
      <div className="border border-gray-800 rounded-md p-3 bg-gray-900">
        <div className="text-xs text-gray-500 mb-2">Avg Entry Price</div>
        <div className="text-xl font-bold text-white">
          ${walletData.avgEntryPrice.toFixed(6)}
        </div>
      </div>
      <div className="border border-gray-800 rounded-md p-3 bg-gray-900">
        <div className="text-xs text-gray-500 mb-2">Total Invested</div>
        <div className="text-xl font-bold text-white">
          ${walletData.totalInvestedUSD.toLocaleString()}
        </div>
      </div>
    </div>
  )}
  
  {walletData && walletData.totalTokens === 0 && (
    <div className="mt-4 p-3 border border-gray-700 rounded text-sm text-gray-400">
      No holdings found for this token in this wallet.
    </div>
  )}
</div>
```

**Styling:**
- Follows exact pattern from `src/pages/ExitStrategy.tsx` lines 340-424 (wallet loading section)
- Uses same error/warning display pattern (lines 369-408)
- Uses same grid layout for metrics (3 columns)

**API Rate Limiting:**
- Etherscan API: 5 calls/second (free tier)
- Already handled in `src/etherscan.ts`
- Uses built-in delays between batch calls

**Data Accuracy:**
- Priority 1: Stablecoin swaps (most accurate)
- Priority 2: ETH spent with historical prices
- All prices from blockchain data - no estimates
- Shows warnings if data quality issues detected

---

#### Mode 2: Manual Entry (Simulation Mode)

**Use Cases:**
- User doesn't want to share wallet address (privacy)
- User hasn't bought yet (planning entry)
- User wants to simulate "what if" scenarios
- Quick testing without blockchain data

**Implementation:**

**File:** `src/pages/InstantProfit.tsx`

**State Management:**
```typescript
// Entry mode: 'wallet' or 'manual'
const [entryMode, setEntryMode] = useState<'wallet' | 'manual'>('wallet')

// Manual entry state
const [manualHoldings, setManualHoldings] = useState<string>('')
const [manualEntryPrice, setManualEntryPrice] = useState<string>('')
const [manualTotalInvested, setManualTotalInvested] = useState<string>('')
```

**Calculated Values:**
```typescript
// Calculate one missing value based on other two
function calculateManualEntry() {
  const holdings = Number(manualHoldings) || 0
  const entryPrice = Number(manualEntryPrice) || 0
  const totalInvested = Number(manualTotalInvested) || 0
  
  // If holdings and entry price set, calculate total invested
  if (holdings > 0 && entryPrice > 0 && !manualTotalInvested) {
    return {
      holdings,
      avgEntryPrice: entryPrice,
      totalInvestedUSD: holdings * entryPrice
    }
  }
  
  // If holdings and total invested set, calculate entry price
  if (holdings > 0 && totalInvested > 0 && !manualEntryPrice) {
    return {
      holdings,
      avgEntryPrice: totalInvested / holdings,
      totalInvestedUSD: totalInvested
    }
  }
  
  // If entry price and total invested set, calculate holdings
  if (entryPrice > 0 && totalInvested > 0 && !manualHoldings) {
    return {
      holdings: totalInvested / entryPrice,
      avgEntryPrice: entryPrice,
      totalInvestedUSD: totalInvested
    }
  }
  
  // All three provided - use directly
  return {
    holdings,
    avgEntryPrice: entryPrice,
    totalInvestedUSD: totalInvested
  }
}
```

**UI Implementation:**
```typescript
{/* Entry Mode Toggle */}
<div className="glass-card border-punk rounded-lg p-6 mb-8">
  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">
    2. Entry Data
  </h3>
  
  {/* Mode Selection */}
  <div className="flex gap-4 mb-6">
    <button
      onClick={() => setEntryMode('wallet')}
      className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
        entryMode === 'wallet'
          ? 'border-white bg-white text-black font-bold'
          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
      }`}
    >
      Load from Wallet
    </button>
    <button
      onClick={() => setEntryMode('manual')}
      className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
        entryMode === 'manual'
          ? 'border-white bg-white text-black font-bold'
          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
      }`}
    >
      Manual Entry
    </button>
  </div>
  
  {/* Wallet Mode */}
  {entryMode === 'wallet' && (
    <div>
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Ethereum Wallet Address (0x...)"
          className="flex-1 border border-gray-700 rounded-md px-4 py-2 bg-gray-800 text-white placeholder-gray-500"
          disabled={!tokenInfo}
        />
        <button
          onClick={handleLoadWallet}
          disabled={isLoadingWallet || !walletAddress || !tokenInfo}
          className="btn-punk px-8"
        >
          {isLoadingWallet ? 'Loading...' : 'Load Data'}
        </button>
      </div>
      
      {walletData && (
        <button
          onClick={handleLoadWallet}
          disabled={isLoadingWallet}
          className="text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wide"
        >
          {isLoadingWallet ? 'Reloading...' : 'Reload Wallet Data'}
        </button>
      )}
      
      {/* Error/Warning/Success displays - same as before */}
    </div>
  )}
  
  {/* Manual Entry Mode */}
  {entryMode === 'manual' && (
    <div>
      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-blue-300">
        Enter any TWO of the three values below. The third will be calculated automatically.
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Holdings Input */}
        <div>
          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">
            Token Holdings
          </label>
          <input
            type="number"
            value={manualHoldings}
            onChange={(e) => setManualHoldings(e.target.value)}
            placeholder="e.g., 50000"
            className="w-full border border-gray-700 rounded-md px-4 py-2 bg-gray-800 text-white placeholder-gray-500"
            disabled={!tokenInfo}
          />
          <div className="mt-1 text-xs text-gray-500">
            Number of tokens you own
          </div>
        </div>
        
        {/* Entry Price Input */}
        <div>
          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">
            Entry Price (USD)
          </label>
          <input
            type="number"
            value={manualEntryPrice}
            onChange={(e) => setManualEntryPrice(e.target.value)}
            placeholder="e.g., 0.025"
            step="0.000001"
            className="w-full border border-gray-700 rounded-md px-4 py-2 bg-gray-800 text-white placeholder-gray-500"
            disabled={!tokenInfo}
          />
          <div className="mt-1 text-xs text-gray-500">
            Price per token you paid
          </div>
        </div>
        
        {/* Total Invested Input */}
        <div>
          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">
            Total Invested (USD)
          </label>
          <input
            type="number"
            value={manualTotalInvested}
            onChange={(e) => setManualTotalInvested(e.target.value)}
            placeholder="e.g., 1250"
            step="0.01"
            className="w-full border border-gray-700 rounded-md px-4 py-2 bg-gray-800 text-white placeholder-gray-500"
            disabled={!tokenInfo}
          />
          <div className="mt-1 text-xs text-gray-500">
            Total USD you spent
          </div>
        </div>
      </div>
      
      {/* Calculated Summary */}
      {(manualHoldings || manualEntryPrice || manualTotalInvested) && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="border border-gray-800 rounded-md p-3">
            <div className="text-xs text-gray-500">Holdings</div>
            <div className="mt-1 text-base font-medium">
              {calculateManualEntry().holdings.toLocaleString()} {tokenInfo?.symbol || ''}
            </div>
          </div>
          <div className="border border-gray-800 rounded-md p-3">
            <div className="text-xs text-gray-500">Avg Entry Price</div>
            <div className="mt-1 text-base font-medium">
              ${calculateManualEntry().avgEntryPrice.toFixed(6)}
            </div>
          </div>
          <div className="border border-gray-800 rounded-md p-3">
            <div className="text-xs text-gray-500">Total Invested</div>
            <div className="mt-1 text-base font-medium">
              ${calculateManualEntry().totalInvestedUSD.toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  )}
</div>
```

**Styling:**
- Toggle buttons use same white/black high contrast as `btn-punk`
- Active state: white background, black text, bold font
- Inactive state: gray border, gray bg, gray text with hover effect
- Input fields match existing style from wallet mode
- Grid layout (3 columns) matches wallet display

**localStorage Persistence:**
```typescript
// Save manual entry to localStorage
useEffect(() => {
  if (entryMode === 'manual') {
    localStorage.setItem('instantProfit_entryMode', 'manual')
    localStorage.setItem('instantProfit_manualHoldings', manualHoldings)
    localStorage.setItem('instantProfit_manualEntryPrice', manualEntryPrice)
    localStorage.setItem('instantProfit_manualTotalInvested', manualTotalInvested)
  } else {
    localStorage.setItem('instantProfit_entryMode', 'wallet')
  }
}, [entryMode, manualHoldings, manualEntryPrice, manualTotalInvested])

// Load saved manual entry on mount
useEffect(() => {
  const savedMode = localStorage.getItem('instantProfit_entryMode')
  if (savedMode === 'manual') {
    setEntryMode('manual')
    setManualHoldings(localStorage.getItem('instantProfit_manualHoldings') || '')
    setManualEntryPrice(localStorage.getItem('instantProfit_manualEntryPrice') || '')
    setManualTotalInvested(localStorage.getItem('instantProfit_manualTotalInvested') || '')
  }
}, [])
```

**Unified Data Interface:**
```typescript
// Create unified interface for both modes
interface EntryData {
  holdings: number
  avgEntryPrice: number
  totalInvestedUSD: number
  source: 'wallet' | 'manual'
}

  // Get current entry data regardless of mode
function getCurrentEntryData(): EntryData | null {
  if (entryMode === 'wallet' && walletData) {
    return {
      holdings: walletData.totalTokens, // Use totalTokens property
      avgEntryPrice: walletData.avgEntryPrice,
      totalInvestedUSD: walletData.totalInvestedUSD,
      source: 'wallet'
    }
  }
  
  if (entryMode === 'manual' && (manualHoldings || manualEntryPrice || manualTotalInvested)) {
    const calculated = calculateManualEntry()
    return {
      holdings: calculated.holdings,
      avgEntryPrice: calculated.avgEntryPrice,
      totalInvestedUSD: calculated.totalInvestedUSD,
      source: 'manual'
    }
  }
  
  return null
}
```

**Validation:**
- All inputs must be positive numbers
- At least 2 of 3 values must be provided in manual mode
- Show clear helper text: "Enter any TWO values"
- Disable inputs if token not loaded
- Auto-calculate third value in real-time

**User Flow:**

**Scenario 1: Planning a buy**
```
1. Load token: CHECKS
2. Select "Manual Entry"
3. Enter: 50,000 tokens (planned buy)
4. Enter: $0.025 entry price (current price)
5. System calculates: $1,250 total investment
6. See live P/L as price changes
```

**Scenario 2: Privacy-conscious user**
```
1. Load token: CHECKS
2. Select "Manual Entry"
3. Enter: Holdings and entry price from memory
4. Track profits without sharing wallet address
```

**Scenario 3: "What if" simulation**
```
1. Load token: CHECKS
2. Select "Manual Entry"
3. Enter: $1,000 investment budget
4. Enter: $0.025 current entry price
5. System calculates: 40,000 tokens
6. See potential profit at different exit targets
```

**Design Note:**
- Toggle buttons prominent at top of section
- Clear visual distinction between modes
- Helper text explains calculation logic
- Summary section shows all 3 values regardless of which were input
- Follows same styling as wallet mode for consistency

---

### 3. Live Price Tracking
**Requirement:** Real-time price updates and embedded chart

---

#### Price Updates

**Implementation:**

**API:** DexScreener (reuse existing `fetchCoinOverview`)
- **File:** `src/api.ts`
- **Function:** `fetchCoinOverview(address: string): Promise<CoinOverview>`
- **Update Frequency:** 10 seconds (balance between freshness and API respect)

**Function Signature** (from `src/api.ts` lines 75-95):
```typescript
export type CoinOverview = {
  address: string
  marketCap: number | null
  price: number | null
  priceChange24h: number | null
}

export async function fetchCoinOverview(address: string): Promise<CoinOverview> {
  const pairs = await fetchDexByTokenAddress(address)
  if (!pairs) {
    return { address, marketCap: null, price: null, priceChange24h: null }
  }
  
  const best = pairs.reduce((a, b) => 
    ((a?.liquidity?.usd ?? 0) >= (b?.liquidity?.usd ?? 0) ? a : b)
  )
  const marketCap = best.marketCap ? Number(best.marketCap) : (best.fdv ? Number(best.fdv) : null)
  const price = best.priceUsd ? Number(best.priceUsd) : null
  const priceChange24h = best.priceChange?.h24 ? Number(best.priceChange.h24) : null
  
  return { address, marketCap, price, priceChange24h }
}
```

**Component Implementation:**

**File:** `src/pages/InstantProfit.tsx`

**State Management:**
```typescript
const [currentPrice, setCurrentPrice] = useState<number | null>(null)
const [currentMarketCap, setCurrentMarketCap] = useState<number | null>(null)
const [priceChange24h, setPriceChange24h] = useState<number | null>(null)
const [lastUpdate, setLastUpdate] = useState<number | null>(null)
const [isUpdatingPrice, setIsUpdatingPrice] = useState<boolean>(false)
```

**Price Polling Logic:**
```typescript
// Fetch price updates every 10 seconds
useEffect(() => {
  if (!tokenInfo) return
  
  let isCancelled = false
  
  async function updatePrice() {
    if (isCancelled) return
    
    setIsUpdatingPrice(true)
    
    try {
      const overview = await fetchCoinOverview(tokenInfo.address)
      
      if (!isCancelled) {
        setCurrentPrice(overview.price)
        setCurrentMarketCap(overview.marketCap)
        setPriceChange24h(overview.priceChange24h)
        setLastUpdate(Date.now())
      }
    } catch (error) {
      console.error('Error updating price:', error)
    } finally {
      if (!isCancelled) {
        setIsUpdatingPrice(false)
      }
    }
  }
  
  // Initial fetch
  updatePrice()
  
  // Set up interval for 10-second updates
  const intervalId = setInterval(updatePrice, 10000)
  
  return () => {
    isCancelled = true
    clearInterval(intervalId)
  }
}, [tokenInfo])
```

**P/L Calculation:**
```typescript
// Calculate current profit/loss
function calculatePL() {
  const entryData = getCurrentEntryData()
  if (!entryData || !currentPrice) return null
  
  const currentValue = entryData.holdings * currentPrice
  const profitLoss = currentValue - entryData.totalInvestedUSD
  const profitLossPercent = (profitLoss / entryData.totalInvestedUSD) * 100
  const roi = currentValue / entryData.totalInvestedUSD
  
  return {
    currentValue,
    profitLoss,
    profitLossPercent,
    roi
  }
}
```

**Formatting Utilities** (reuse from existing pages):
```typescript
// From src/pages/LaunchSimulator.tsx lines 10-26
function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 2 
  }).format(value)
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 4, 
    maximumFractionDigits: 8 
  }).format(value)
}
```

**UI Implementation:**
```typescript
{/* Live Price Tracking Section */}
<div className="glass-card border-punk rounded-lg p-6 mb-8">
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-sm text-gray-400 uppercase tracking-wider">
      3. Live Tracking
    </h3>
    {lastUpdate && (
      <div className="text-xs text-gray-500">
        Updated {Math.floor((Date.now() - lastUpdate) / 1000)}s ago
        {isUpdatingPrice && <span className="ml-2">...</span>}
      </div>
    )}
  </div>
  
  {/* Current Price and Market Cap */}
  <div className="grid grid-cols-2 gap-4 mb-6">
    <div className="border border-gray-800 rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-1">Current Price</div>
      <div className="text-3xl font-bold">
        {currentPrice ? formatPrice(currentPrice) : '—'}
      </div>
      {priceChange24h !== null && (
        <div className={`text-sm font-semibold mt-2 ${
          priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {priceChange24h > 0 ? '+' : ''}{priceChange24h.toFixed(2)}% (24h)
        </div>
      )}
    </div>
    
    <div className="border border-gray-800 rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-1">Market Cap</div>
      <div className="text-3xl font-bold">
        {currentMarketCap ? formatCompact(currentMarketCap) : '—'}
      </div>
    </div>
  </div>
  
  {/* P/L Display */}
  {(() => {
    const pl = calculatePL()
    if (!pl) return null
    
    const isProfit = pl.profitLoss >= 0
    
    return (
      <div className="border-2 border-gray-700 rounded-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Current Value</div>
            <div className="text-xl font-bold">{formatUSD(pl.currentValue)}</div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 mb-1">Profit/Loss</div>
            <div className={`text-xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{formatUSD(pl.profitLoss)}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 mb-1">ROI %</div>
            <div className={`text-xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{pl.profitLossPercent.toFixed(2)}%
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 mb-1">Multiplier</div>
            <div className={`text-xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {pl.roi.toFixed(2)}x
            </div>
          </div>
        </div>
      </div>
    )
  })()}
</div>
```

**Styling:**
- Large price display: `text-3xl font-bold`
- Color coding: green for positive 24h change, red for negative
- P/L section: thicker border (`border-2`) to make it prominent
- Grid layout: 2 columns on mobile, 4 columns on desktop for P/L metrics
- Update timestamp in top-right corner

**Performance Considerations:**
- Uses `isCancelled` flag to prevent state updates after unmount
- Cleans up interval on component unmount
- Only updates when token is loaded
- Shows loading indicator during price fetch

---

#### Embedded Chart

**Implementation:**

**Method:** GeckoTerminal iframe embed (fastest to implement, no API limits)

**File:** `src/pages/InstantProfit.tsx`

**GeckoTerminal Embed URL Structure:**
```
https://www.geckoterminal.com/eth/pools/{poolId}?embed=1&info=0&swaps=0
```

**URL Parameters:**
- `embed=1` - Enables embed mode (removes navigation)
- `info=0` - Hides token info panel
- `swaps=0` - Hides swap interface

**Component Implementation:**
```typescript
{/* Chart Section */}
{tokenInfo && tokenInfo.poolId && (
  <div className="glass-card border-punk rounded-lg p-6 mb-8">
    <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">
      Live Chart
    </h3>
    
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <iframe
        src={`https://www.geckoterminal.com/eth/pools/${tokenInfo.poolId}?embed=1&info=0&swaps=0`}
        title={`${tokenInfo.symbol} Price Chart`}
        className="absolute top-0 left-0 w-full h-full rounded-lg border border-gray-700"
        style={{ minHeight: '400px' }}
        frameBorder="0"
        allow="clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
    
    {!tokenInfo.poolId && (
      <div className="p-4 bg-gray-800 border border-gray-700 rounded text-sm text-gray-400 text-center">
        Chart not available for this token
      </div>
    )}
  </div>
)}
```

**Responsive Design:**
- Uses padding-bottom trick for 16:9 aspect ratio (`56.25%`)
- Absolute positioning ensures iframe fills container
- Minimum height of 400px for readability
- Rounded corners match design system
- Border matches other cards

**Fallback:**
- Shows message if token doesn't have poolId
- Chart only displays if poolId exists in token data

**Security:**
- `sandbox` attribute restricts iframe capabilities
- `allow-scripts allow-same-origin allow-popups` - minimal permissions for chart to work
- `allow clipboard-write` - for copy price functionality in chart

**Alternative: DexScreener Embed**
If GeckoTerminal doesn't work or poolId not available:
```typescript
<iframe
  src={`https://dexscreener.com/ethereum/${tokenInfo.address}?embed=1&theme=dark&trades=0&info=0`}
  title={`${tokenInfo.symbol} Price Chart`}
  className="absolute top-0 left-0 w-full h-full rounded-lg border border-gray-700"
  style={{ minHeight: '400px' }}
  frameBorder="0"
/>
```

**Design Note:**
- Chart embedded directly in page (no popup/modal)
- Follows same card styling as other sections
- Optional section - only shows if poolId available
- No custom overlays (entry lines, etc.) in MVP - iframe shows raw chart

---

### 4. Profit Targets & Exit Plan
**Requirement:** Set ROI targets and get visual alerts

**Implementation:**

**Reuse from Exit Strategy:**
- **File:** `src/pages/ExitStrategy.tsx`
- **Lines:** 24-29 (ExitTarget type), 49-195 (SortableExitTarget component)
- **Dependencies:** `@dnd-kit/core`, `@dnd-kit/sortable` (already in package.json)

**TypeScript Interface:**
```typescript
type ExitTarget = {
  id: string
  targetValue: string      // Market cap value (e.g., "5")
  unit: 'million' | 'billion'
  percentToSell: string    // Percent of holdings to sell (e.g., "25")
}
```

**State Management:**
```typescript
const [exitTargets, setExitTargets] = useState<ExitTarget[]>(() => {
  const saved = localStorage.getItem('instantProfit_exitTargets')
  return saved ? JSON.parse(saved) : []
})
```

**Target Hit Detection:**
```typescript
// Check if current market cap has hit each target
function checkTargetHit(target: ExitTarget): boolean {
  if (!currentMarketCap) return false
  
  const targetMcap = Number(target.targetValue) * (target.unit === 'billion' ? 1_000_000_000 : 1_000_000)
  return currentMarketCap >= targetMcap
}
```

**Target Calculations:**
```typescript
function calculateTargetMetrics(target: ExitTarget) {
  const entryData = getCurrentEntryData()
  if (!entryData) return null
  
  const targetMcap = Number(target.targetValue) * (target.unit === 'billion' ? 1_000_000_000 : 1_000_000)
  const percentToSell = Number(target.percentToSell) || 0
  
  // Assume 10% flat sell tax (conservative estimate)
  const SELL_TAX = 0.10
  
  // Calculate token price at target MCAP
  // Using same total supply as Launch Simulator
  const TOTAL_SUPPLY = 1_000_000_000
  const priceAtTarget = targetMcap / TOTAL_SUPPLY
  
  // Calculate tokens to sell
  const tokensToSell = (entryData.holdings * percentToSell) / 100
  
  // Calculate gross proceeds
  const grossProceeds = tokensToSell * priceAtTarget
  
  // Calculate net proceeds after tax
  const netProceeds = grossProceeds * (1 - SELL_TAX)
  
  // Calculate cost basis for tokens being sold
  const costBasis = (entryData.totalInvestedUSD * percentToSell) / 100
  
  // Calculate profit
  const profit = netProceeds - costBasis
  const profitPercent = (profit / costBasis) * 100
  
  return {
    targetMcap,
    priceAtTarget,
    tokensToSell,
    grossProceeds,
    netProceeds,
    costBasis,
    profit,
    profitPercent,
    isHit: checkTargetHit(target)
  }
}
```

**Add/Remove Targets:**
```typescript
function addTarget() {
  const newTarget: ExitTarget = {
    id: Date.now().toString(),
    targetValue: '',
    unit: 'million',
    percentToSell: ''
  }
  setExitTargets([...exitTargets, newTarget])
}

function removeTarget(id: string) {
  setExitTargets(exitTargets.filter(t => t.id !== id))
}

function updateTarget(id: string, field: keyof ExitTarget, value: string) {
  setExitTargets(exitTargets.map(t => 
    t.id === id ? { ...t, [field]: value } : t
  ))
}
```

**Drag-and-Drop Setup:**
```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
)

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  
  if (over && active.id !== over.id) {
    setExitTargets((targets) => {
      const oldIndex = targets.findIndex((t) => t.id === active.id)
      const newIndex = targets.findIndex((t) => t.id === over.id)
      return arrayMove(targets, oldIndex, newIndex)
    })
  }
}
```

**UI Implementation:**
```typescript
{/* Exit Targets Section */}
<div className="glass-card border-punk rounded-lg p-6 mb-8">
  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">
    4. Exit Targets
  </h3>
  
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={handleDragEnd}
  >
    <SortableContext
      items={exitTargets}
      strategy={verticalListSortingStrategy}
    >
      <div className="space-y-4 mb-4">
        {exitTargets.map((target, index) => {
          const metrics = calculateTargetMetrics(target)
          const isHit = metrics?.isHit || false
          
          return (
            <SortableExitTarget
              key={target.id}
              target={target}
              index={index}
              calc={metrics}
              isHit={isHit}
              onUpdate={updateTarget}
              onRemove={removeTarget}
            />
          )
        })}
      </div>
    </SortableContext>
  </DndContext>
  
  <button
    onClick={addTarget}
    className="btn-punk w-full"
  >
    + Add Target
  </button>
</div>
```

**SortableExitTarget Component:**
```typescript
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableExitTarget({ 
  target, 
  index, 
  calc, 
  isHit,
  onUpdate, 
  onRemove 
}: {
  target: ExitTarget
  index: number
  calc: any
  isHit: boolean
  onUpdate: (id: string, field: keyof ExitTarget, value: string) => void
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: target.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`border rounded-lg p-4 ${
        isHit 
          ? 'border-green-500 bg-green-900/10' 
          : 'border-gray-800'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-6 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        {/* Target Inputs */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Target Market Cap</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={target.targetValue}
                onChange={(e) => onUpdate(target.id, 'targetValue', e.target.value)}
                placeholder="e.g. 5"
                className="flex-1 border border-gray-700 rounded px-3 py-1.5 bg-gray-800 text-white text-sm"
              />
              <select
                value={target.unit}
                onChange={(e) => onUpdate(target.id, 'unit', e.target.value)}
                className="border border-gray-700 rounded px-3 py-1.5 bg-gray-800 text-white text-sm"
              >
                <option value="million">Million</option>
                <option value="billion">Billion</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">% to Sell</label>
            <input
              type="number"
              value={target.percentToSell}
              onChange={(e) => onUpdate(target.id, 'percentToSell', e.target.value)}
              placeholder="e.g. 25"
              className="w-full border border-gray-700 rounded px-3 py-1.5 bg-gray-800 text-white text-sm"
            />
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={() => onRemove(target.id)}
          className="mt-5 text-gray-500 hover:text-red-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Target Hit Badge */}
      {isHit && (
        <div className="mt-3 px-3 py-2 bg-green-500 text-black font-bold text-sm rounded uppercase tracking-wide text-center">
          TARGET HIT
        </div>
      )}

      {/* Calculated Metrics */}
      {calc && (
        <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-gray-500">Net Proceeds</div>
            <div className="font-semibold">{formatUSD(calc.netProceeds)}</div>
          </div>
          <div>
            <div className="text-gray-500">Profit</div>
            <div className={`font-semibold ${calc.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {calc.profit >= 0 ? '+' : ''}{formatUSD(calc.profit)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">ROI</div>
            <div className={`font-semibold ${calc.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {calc.profit >= 0 ? '+' : ''}{calc.profitPercent.toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

**localStorage Persistence:**
```typescript
// Save targets whenever they change
useEffect(() => {
  localStorage.setItem('instantProfit_exitTargets', JSON.stringify(exitTargets))
}, [exitTargets])
```

**Visual Alert Animation:**
```typescript
// In index.css, add:
@keyframes border-pulse {
  0%, 100% { border-color: rgb(34 197 94); }
  50% { border-color: rgb(134 239 172); }
}

.target-hit {
  animation: border-pulse 2s ease-in-out infinite;
}

// Apply to hit targets:
className={`border rounded-lg p-4 ${
  isHit 
    ? 'border-green-500 bg-green-900/10 target-hit' 
    : 'border-gray-800'
}`}
```

**Design Notes:**
- Hit targets: green border with pulse animation, green background tint
- Drag handle on left side (same as Exit Strategy)
- Delete button on right side
- Shows calculated metrics below inputs
- Color-coded profit (green/red)
- Assumes 10% flat sell tax (conservative, can be made dynamic later)

---

### 5. Real Data from Etherscan
**Requirement:** All calculations based on blockchain transaction logs

**Already Implemented:** This feature is covered by Feature 2 (Wallet Integration Mode 1)

**Summary:**
- Uses `fetchWalletPortfolio()` from `src/etherscan.ts`
- Extracts USD values from stablecoin swaps (USDC/USDT/DAI)
- Falls back to ETH spent calculation with historical prices
- CoinGecko API with localStorage cache for ETH price history
- "Reload Wallet Data" button triggers fresh fetch
- Displays errors and warnings from blockchain parsing

**No additional implementation needed** - this is already specified in detail in Feature 2 (Mode 1: Wallet Integration).

---

## API Integration Plan

### DexScreener API
**Purpose:** Live price data and token metadata

**Endpoints:**
- `/latest/dex/tokens/{address}` - Token pairs, price, market cap
- **Rate limits:** No strict limit, but be respectful (5-10s polling)
- **Fallback:** If API fails, show last known price with timestamp

**Integration:**
```typescript
// Reuse existing functions
import { fetchCoinOverview, fetchDexByTokenAddress } from './api'

// Faster polling for live tracking
setInterval(() => {
  fetchCoinOverview(tokenAddress).then(updatePrice)
}, 5000) // 5 second updates
```

---

### Etherscan API
**Purpose:** Wallet transaction history and portfolio calculation

**Endpoints (already integrated):**
- `?module=account&action=tokentx` - ERC-20 transfers
- `?module=account&action=txlistinternal` - Internal ETH transfers
- `?module=proxy&action=eth_getTransactionReceipt` - Transaction logs

**Integration:**
```typescript
// Reuse existing wallet loading system
import { fetchWalletPortfolio } from './etherscan'

const portfolio = await fetchWalletPortfolio(walletAddress, tokenAddress)
// Returns: { holdings, avgEntryPrice, totalInvestedUSD, errors, warnings }
```

---

### GeckoTerminal API
**Purpose:** Embedded live chart

**Option 1: Iframe Embed**
```html
<iframe 
  src="https://www.geckoterminal.com/eth/pools/{poolId}?embed=1&info=0&swaps=0"
  style="width: 100%; height: 400px; border: 0;"
/>
```

**Option 2: API Integration**
- Endpoint: `/networks/eth/pools/{poolId}/ohlcv/minute`
- Fetch 1-minute candles every 60 seconds
- Render with custom chart library

**Chart Preference:** Start with iframe embed (faster), upgrade to API if needed

---

### CoinGecko API
**Purpose:** Historical ETH prices for USD conversion

**Already integrated:**
- `batchFetchHistoricalETHPrices()` with localStorage cache
- Reuse existing system from `etherscan.ts`

---

## UI/UX Design

### Page Layout: `/instant-profit`

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Dashboard                                          │
│                                                              │
│ INSTANT PROFIT CALCULATOR                                    │
│ Track new token launches with live data and profit targets  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 1. ADD TOKEN                                                 │
│                                                              │
│ Token Address: [                              ] [Load Token]│
│                                                              │
│ → Or select existing: [PNKSTR] [PAINSTR] [CHECKS] ...      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. LOAD YOUR WALLET                                          │
│                                                              │
│ Wallet Address: [                              ] [Load Data]│
│                                                              │
│ [Reload Wallet Data] ← Click after new buys/sells          │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬─────────────────────────────┐
│ 3. LIVE TRACKING              │ 4. EXIT TARGETS             │
│                               │                             │
│ Token: CHECKS                 │ ┌─────────────────────────┐ │
│ Your Holdings: 50,000         │ │ Target 1: 2x ROI        │ │
│ Avg Entry: $0.025             │ │ Sell 25% → $625 profit  │ │
│ Total Invested: $1,250        │ │ Status: [WAITING]       │ │
│                               │ └─────────────────────────┘ │
│ Current Price: $0.045         │ ┌─────────────────────────┐ │
│ Current Value: $2,250         │ │ Target 2: 3x ROI        │ │
│ Profit/Loss: +$1,000 (+80%)   │ │ Sell 50% → $1,875       │ │
│ ROI: 1.8x                     │ │ Status: [WAITING]       │ │
│                               │ └─────────────────────────┘ │
│ ┌─────────────────────────┐   │                             │
│ │ LIVE CHART              │   │ [+ Add Target]              │
│ │ [GeckoTerminal Embed]   │   │ [Load Template]             │
│ │                         │   │                             │
│ │ Price action here       │   │                             │
│ └─────────────────────────┘   │                             │
└───────────────────────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 5. TRANSACTION HISTORY                                       │
│                                                              │
│ Buy 1: 20,000 tokens @ $0.020 = $400 (12:05 PM, minute 5)  │
│ Buy 2: 30,000 tokens @ $0.028 = $850 (12:25 PM, minute 25) │
│                                                              │
│ Total: 50,000 tokens, $1,250 invested                       │
└─────────────────────────────────────────────────────────────┘
```

---

### Component Breakdown

#### 1. TokenInput Component
- Input field for contract address
- "Load Token" button
- Loading state + error handling
- Display token info card once loaded

#### 2. WalletLoader Component
- Input field for wallet address
- "Load Data" button with loading state
- "Reload Wallet Data" button (shows after initial load)
- Display portfolio summary card

#### 3. LiveTracker Component
- Price display (updates every 5-10s)
- Holdings summary
- P/L calculation with color coding
- ROI badge
- Last update timestamp

#### 4. ChartEmbed Component
- GeckoTerminal iframe OR custom chart
- Entry price line overlay
- Target price lines
- Time since launch indicator

#### 5. ExitTargets Component (Reuse from Exit Strategy)
- Drag-and-drop target cards
- Add/remove targets
- Visual alerts when hit
- Preset templates (Conservative/Balanced/Risky)

#### 6. TransactionHistory Component
- List of all buys/sells
- Timestamp, amount, price, USD value
- Entry minute from launch (if available)

---

## Implementation Phases

### Phase 1: Page Setup & Token Addition
**Goal:** Create page and add token dynamically

- [ ] Create `/src/pages/InstantProfit.tsx`
- [ ] Add route in router
- [ ] Build TokenInput component
- [ ] Integrate DexScreener API for token metadata
- [ ] localStorage persistence for token address
- [ ] Error handling for invalid addresses

**Test:** Add CHECKS token, see name/symbol/price displayed

---

### Phase 2: Wallet Integration & Manual Entry
**Goal:** Load actual transaction data from Etherscan OR manual entry

- [x] Build WalletLoader component
- [x] Build Manual Entry component with 3-field calculator
- [x] Reuse `fetchWalletPortfolio()` from `etherscan.ts`
- [x] Display: holdings, avg entry, total invested
- [x] Add "Reload Wallet Data" button
- [x] Show errors/warnings in UI
- [x] localStorage persistence for wallet address and manual data
- [x] Mode toggle between Wallet and Manual

**Test:** Load wallet for PNKSTR, verify accuracy vs Exit Strategy

**COMPLETED** - Phase 2 working with both modes

---

### Phase 3: Live Price Tracking
**Goal:** Real-time price updates and P/L calculation

- [x] Build LiveTracker component
- [x] Set up 10 second polling with DexScreener API
- [x] Calculate live P/L (current value - invested)
- [x] Calculate ROI (profit / invested)
- [x] Color coding (green = profit, red = loss)
- [x] Last update timestamp

**Test:** Watch price update every 10s, verify P/L accuracy

**COMPLETED** - Phase 3 working with live polling and P/L display

---

### Phase 4: Chart Integration
**Goal:** Embed live price chart

- [x] Build ChartEmbed component
- [x] GeckoTerminal iframe implementation
- [x] Responsive sizing (16:9 aspect ratio)
- [x] Embed parameters configured (no info panel, no swaps)

**Test:** See live chart updating in iframe

**COMPLETED** - Phase 4 working with GeckoTerminal iframe embed

---

### Phase 5: Exit Targets & Alerts
**Goal:** Set profit targets and get visual alerts

- [x] Copy ExitTargets component from Exit Strategy
- [x] Adapt for InstantProfit use case
- [x] Add target hit detection (checkTargetHit function)
- [x] Visual alerts (border-pulse animation, "TARGET HIT" badge)
- [x] Tax-aware profit calculation (10% sell tax)
- [x] Drag-and-drop reordering (@dnd-kit)
- [x] localStorage persistence

**Test:** Set 2x target, manually change price, see alert trigger

**COMPLETED** - Phase 5 working with full exit target management and hit detection

---

### Phase 6: Transaction History
**Goal:** Display all buys/sells from wallet

- [ ] Build TransactionHistory component
- [ ] Parse transaction data from Etherscan
- [ ] Display: timestamp, amount, price, USD value
- [ ] Calculate entry minute from launch (if token in config)
- [ ] Expandable details (tx hash, gas paid)

**Test:** Load wallet, see all buys listed chronologically

---

### Phase 7: Polish & Optimization
**Goal:** Production-ready features

- [ ] Add loading skeletons
- [ ] Error boundary for API failures
- [ ] Rate limit handling for DexScreener
- [ ] Print/export functionality (like Exit Strategy)
- [ ] Mobile responsive design
- [ ] Dark mode styling (match existing theme)

**Test:** Full end-to-end with live token launch

---

## Code Reuse Map

### From Exit Strategy (`ExitStrategy.tsx`)
**Reuse:**
- Exit target system (cards, drag-and-drop)
- Wallet loading UI patterns
- Preset template system
- Print/export functionality
- localStorage persistence patterns

**Copy these sections:**
- Lines 24-29: `ExitTarget` type
- Lines 49-195: `SortableExitTarget` component
- Lines 208-212: localStorage keys pattern
- Lines 246-289: Live metrics via DexScreener

---

### From Launch Simulator (`LaunchSimulator.tsx`)
**Reuse:**
- Tax calculation logic
- Market cap formatting (`formatCompact`)
- Price formatting (`formatPrice`)
- Number formatting utilities

**Copy these sections:**
- Lines 10-26: Format functions
- Tax calculation logic (if needed for sell tax estimation)

---

### From Etherscan Integration (`etherscan.ts`)
**Reuse:**
- `fetchWalletPortfolio()` - entire wallet loading system
- `batchFetchHistoricalETHPrices()` - ETH price caching
- `extractUSDFromLogs()` - stablecoin value extraction
- Error/warning tracking system

**Direct imports:**
```typescript
import { 
  fetchWalletPortfolio, 
  type WalletPortfolioData 
} from '../etherscan'
```

---

### From API Integration (`api.ts`)
**Reuse:**
- `fetchCoinOverview()` - live price data
- `fetchDexByTokenAddress()` - token metadata
- DexScreener API patterns

**Direct imports:**
```typescript
import { 
  fetchCoinOverview, 
  fetchDexByTokenAddress,
  type CoinOverview 
} from '../api'
```

---

## Testing Plan

### Manual Testing Checklist

#### Token Addition
- [ ] Add valid token address → Should load metadata
- [ ] Add invalid address → Should show error
- [ ] Add token not on DexScreener → Should handle gracefully
- [ ] Reload page → Token should persist from localStorage

#### Wallet Loading
- [ ] Load wallet with buys → Should show correct holdings
- [ ] Load wallet with no transactions → Should show "No holdings"
- [ ] Load wallet with errors → Should display warnings
- [ ] Click "Reload" after new buy → Should update holdings

#### Live Price Updates
- [ ] Price should update every 5-10 seconds
- [ ] P/L should recalculate automatically
- [ ] Last update timestamp should refresh
- [ ] API failure → Should show last known price

#### Chart
- [ ] Chart should load and display live data
- [ ] Entry price line should be visible
- [ ] Chart should be responsive
- [ ] Iframe should not cause layout issues

#### Exit Targets
- [ ] Add target → Should appear in list
- [ ] Drag to reorder → Should persist order
- [ ] Price hits target → Should trigger alert
- [ ] Remove target → Should delete correctly

#### Transaction History
- [ ] Should list all buys chronologically
- [ ] Should show correct USD values
- [ ] Should calculate avg entry correctly
- [ ] Should match Exit Strategy calculations

---

### Real Launch Testing (CHECKS)

**Pre-Launch (Before 12:00 PM):**
1. Open `/instant-profit` page
2. Have CHECKS contract address ready
3. Have wallet address ready

**During Launch (12:00 PM - 12:30 PM):**
1. Paste CHECKS address → Load token
2. Buy CHECKS tokens (in MetaMask)
3. Paste wallet address → Load data
4. Verify: Holdings, entry price, total invested
5. Set exit targets (2x, 3x, 5x)
6. Watch live price updates
7. Make second buy (if planned)
8. Click "Reload Wallet Data"
9. Verify: Holdings updated, avg entry recalculated

**Post-Launch (After targets hit):**
1. Verify target alerts triggered correctly
2. Check P/L accuracy vs actual sells
3. Export data for record-keeping

---

## localStorage Schema

### Keys
```typescript
const STORAGE_KEY_TOKEN_ADDRESS = 'instantProfit_tokenAddress'
const STORAGE_KEY_WALLET_ADDRESS = 'instantProfit_walletAddress'
const STORAGE_KEY_EXIT_TARGETS = 'instantProfit_exitTargets'
const STORAGE_KEY_PORTFOLIO_CACHE = 'instantProfit_portfolioCache'
const STORAGE_KEY_LAST_UPDATE = 'instantProfit_lastUpdate'
```

### Data Structures
```typescript
// Token info
{
  address: string
  symbol: string
  name: string
  poolId?: string
  addedAt: number // timestamp
}

// Wallet portfolio cache
{
  walletAddress: string
  tokenAddress: string
  holdings: number
  avgEntryPrice: number
  totalInvestedUSD: number
  lastFetched: number // timestamp
  transactions: Array<{
    hash: string
    type: 'buy' | 'sell'
    amount: number
    priceUSD: number
    timestamp: number
  }>
}

// Exit targets (same as Exit Strategy)
Array<{
  id: string
  targetValue: string
  unit: 'million' | 'billion'
  percentToSell: string
  hit: boolean // whether target has been reached
}>
```

---

## Future Enhancements (Post-MVP)

### Advanced Features (Not for initial launch)
- Multi-token tracking (track 2-3 launches simultaneously)
- Sound alerts for target hits
- Push notifications (browser notifications API)
- Historical P/L chart (track profit over time)
- Auto-sell integration (connect to DEX for instant execution)
- Gas price monitoring (show current gas for sells)
- Slippage calculator
- Compare multiple entries (if you bought at different times)

### Performance Optimizations
- WebSocket integration for real-time prices (instead of polling)
- Service worker for background price checks
- IndexedDB for large transaction histories
- React Query for API state management

---

## Technical Notes

### Rate Limiting Considerations
- **DexScreener:** No strict limits, but 5-10s polling is respectful
- **Etherscan:** 5 calls/second on free tier (already handled in `etherscan.ts`)
- **GeckoTerminal iframe:** No API calls needed (they handle it)
- **CoinGecko:** Already cached with 1.5s delays between calls

### Error Handling Strategy
- API failures → Show last known data with timestamp
- Invalid addresses → Clear error messages with examples
- Network issues → Retry with exponential backoff
- Missing data → Show warnings, don't block UI

### Mobile Considerations
- Chart should be scrollable/pinch-to-zoom
- Target cards should work with touch drag
- Price updates should not cause layout shifts
- Input fields should have proper keyboard types

---

## Success Criteria

### MVP Complete When:
✅ Can add any token by address  
✅ Can load wallet and see exact holdings  
✅ Price updates every 5-10 seconds  
✅ Chart displays live price action  
✅ Can set exit targets with alerts  
✅ All calculations match blockchain data  
✅ Works on mobile and desktop  

### Launch Ready When:
✅ Tested with real launch (CHECKS or VIBESTR)  
✅ No console errors in production  
✅ Page loads in under 2 seconds  
✅ API failures handled gracefully  
✅ Data persists across page refreshes  

---

## Development Priority

**BUILD ORDER:**
1. **Phase 1** (Token Addition) - FIRST
2. **Phase 2** (Wallet Loading) - CRITICAL PATH
3. **Phase 3** (Live Tracking) - CORE FEATURE
4. **Phase 4** (Chart) - VISUAL ENHANCEMENT
5. **Phase 5** (Exit Targets) - USER VALUE
6. **Phase 6** (Transaction History) - NICE TO HAVE
7. **Phase 7** (Polish) - BEFORE LAUNCH

**SKIP FOR NOW:**
- Multi-token tracking
- Advanced alerts (sound/push)
- Auto-sell integration

---

## Questions to Resolve Before Implementation

1. **Chart Implementation:** Start with iframe or build custom?
   - Recommendation: **Iframe** (faster to ship)

2. **Price Update Frequency:** 5s or 10s?
   - Recommendation: **10s** (balance speed vs API respect)

3. **Tax Calculation:** Manual input or auto-estimate from time?
   - Recommendation: **Manual slider** (more accurate for user's specific trade)

4. **Multi-token Support:** MVP or Phase 2?
   - Recommendation: **Single token for MVP** (faster to build)

5. **Preset Templates:** Reuse Exit Strategy templates?
   - Recommendation: **Yes** (proven patterns)

---

## End of Specification

Ready for implementation once approved. All technical details documented for systematic development.

