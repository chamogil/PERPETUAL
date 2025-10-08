import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { fetchCoinOverview, fetchDexByTokenAddress } from '../api'
import { fetchWalletPortfolio, fetchTokenSupply, type WalletPortfolioData } from '../etherscan'

// Token info interface
interface TokenInfo {
  address: string
  name: string
  symbol: string
  poolId: string
  currentPrice: number
  marketCap: number
  addedAt: number
}

// Entry data interface (unified for wallet and manual modes)
interface EntryData {
  holdings: number
  avgEntryPrice: number
  totalInvestedUSD: number
  source: 'wallet' | 'manual'
}

// Quick-select strategy tokens
const STRATEGY_TOKENS = [
  { symbol: 'PNKSTR', name: 'PunkStrategy', address: '0xc50673edb3a7b94e8cad8a7d4e0cd68864e33edf' },
  { symbol: 'PAINSTR', name: 'PainStrategy', address: '0xdfc3af477979912ec90b138d3e5552d5304c5663' },
  { symbol: 'GOBSTR', name: 'GobStrategy', address: '0x5d855d8a3090243fed9bf73999eedfbc2d1dcf21' },
  { symbol: 'SQUIGSTR', name: 'SquigStrategy', address: '0x742fd09cbbeb1ec4e3d6404dfc959a324deb50e6' },
  { symbol: 'BIRBSTR', name: 'BirbStrategy', address: '0x6bcba7cd81a5f12c10ca1bf9b36761cc382658e8' },
  { symbol: 'TOADSTR', name: 'ToadStrategy', address: '0x92cedfdbce6e87b595e4a529afa2905480368af4' },
  { symbol: 'APESTR', name: 'ApeStrategy', address: '0x9ebf91b8d6ff68aa05545301a3d0984eaee54a03' },
  { symbol: 'PUDGYSTR', name: 'PudgyStrategy', address: '0xb3d6e9e142a785ea8a4f0050fee73bcc3438c5c5' },
]

// localStorage keys
const STORAGE_KEY_TOKEN_INFO = 'instantProfit_tokenInfo'
const STORAGE_KEY_WALLET_ADDRESS = 'instantProfit_walletAddress'
const STORAGE_KEY_ENTRY_MODE = 'instantProfit_entryMode'
const STORAGE_KEY_MANUAL_HOLDINGS = 'instantProfit_manualHoldings'
const STORAGE_KEY_MANUAL_ENTRY_PRICE = 'instantProfit_manualEntryPrice'
const STORAGE_KEY_MANUAL_TOTAL_INVESTED = 'instantProfit_manualTotalInvested'
const STORAGE_KEY_WALLET_CACHE = 'instantProfit_walletCache'

// Wallet cache helpers
function getCachedWalletData(walletAddress: string, tokenAddress: string): WalletPortfolioData | null {
  try {
    const cache = localStorage.getItem(STORAGE_KEY_WALLET_CACHE)
    if (!cache) return null
    
    const parsed = JSON.parse(cache)
    const walletCache = parsed[walletAddress.toLowerCase()]
    if (!walletCache) return null
    
    const tokenCache = walletCache[tokenAddress.toLowerCase()]
    return tokenCache || null
  } catch {
    return null
  }
}

function setCachedWalletData(walletAddress: string, tokenAddress: string, data: WalletPortfolioData) {
  try {
    const cache = localStorage.getItem(STORAGE_KEY_WALLET_CACHE)
    const parsed = cache ? JSON.parse(cache) : {}
    
    const walletKey = walletAddress.toLowerCase()
    const tokenKey = tokenAddress.toLowerCase()
    
    if (!parsed[walletKey]) {
      parsed[walletKey] = {}
    }
    
    parsed[walletKey][tokenKey] = {
      ...data,
      cachedAt: Date.now()
    }
    
    localStorage.setItem(STORAGE_KEY_WALLET_CACHE, JSON.stringify(parsed))
  } catch (error) {
    console.error('Failed to cache wallet data:', error)
  }
}

// Format functions (from LaunchSimulator)
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

// Load saved token info
function loadSavedTokenInfo(): TokenInfo | null {
  const saved = localStorage.getItem(STORAGE_KEY_TOKEN_INFO)
  return saved ? JSON.parse(saved) : null
}


export default function InstantProfit() {
  // Token state
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(loadSavedTokenInfo)
  const [tokenAddress, setTokenAddress] = useState<string>('')
  const [isLoadingToken, setIsLoadingToken] = useState<boolean>(false)
  const [tokenError, setTokenError] = useState<string>('')
  const [tokenSupply, setTokenSupply] = useState<{
    maxSupply: number
    totalSupply: number
    circulatingSupply: number
    burned: number
  } | null>(null)

  // Entry mode state
  const [entryMode, setEntryMode] = useState<'wallet' | 'manual'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ENTRY_MODE)
    return (saved === 'manual' ? 'manual' : 'wallet') as 'wallet' | 'manual'
  })

  // Wallet state
  const [walletAddress, setWalletAddress] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_WALLET_ADDRESS) || ''
  })
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false)
  const [walletError, setWalletError] = useState<string>('')
  const [walletData, setWalletData] = useState<WalletPortfolioData | null>(null)
  const [walletDataErrors, setWalletDataErrors] = useState<string[]>([])
  const [walletDataWarnings, setWalletDataWarnings] = useState<string[]>([])

  // Manual entry state
  const [manualHoldings, setManualHoldings] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_MANUAL_HOLDINGS) || ''
  })
  const [manualEntryPrice, setManualEntryPrice] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_MANUAL_ENTRY_PRICE) || ''
  })
  const [manualTotalInvested, setManualTotalInvested] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_MANUAL_TOTAL_INVESTED) || ''
  })

  // Live price state
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [currentMarketCap, setCurrentMarketCap] = useState<number | null>(null)
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)
  const [isUpdatingPrice, setIsUpdatingPrice] = useState<boolean>(false)

  // Target multiplier slider state
  const [targetMultiplier, setTargetMultiplier] = useState<number>(3)

  // Load token info from DexScreener
  async function loadTokenInfo(address: string): Promise<TokenInfo | null> {
    try {
      const pairs = await fetchDexByTokenAddress(address)
      
      if (!pairs || pairs.length === 0) {
        throw new Error('Token not found on DexScreener')
      }
      
      // Select pair with highest liquidity
      const best = pairs.reduce((a, b) => 
        ((a?.liquidity?.usd ?? 0) >= (b?.liquidity?.usd ?? 0) ? a : b)
      )
      
      const tokenInfo: TokenInfo = {
        address: address.toLowerCase(),
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

  // Handle token load
  async function handleLoadToken(address?: string) {
    const targetAddress = address || tokenAddress
    if (!targetAddress) return
    
    setIsLoadingToken(true)
    setTokenError('')
    setTokenAddress(targetAddress) // Update input field
    setTokenSupply(null) // Clear previous supply data
    
    const info = await loadTokenInfo(targetAddress)
    
    if (info) {
      setTokenInfo(info)
      localStorage.setItem(STORAGE_KEY_TOKEN_INFO, JSON.stringify(info))
      setTokenError('')
      
      // Fetch token supply data
      fetchTokenSupply(targetAddress).then(supply => {
        if (supply) {
          setTokenSupply(supply)
        }
      })
      
      // Check if we have cached wallet data for this token
      if (walletAddress) {
        const cached = getCachedWalletData(walletAddress, targetAddress)
        if (cached) {
          console.log('Loading cached wallet data for', info.symbol)
          setWalletData(cached)
          setWalletDataErrors(cached.errors || [])
          setWalletDataWarnings(cached.warnings || [])
        } else {
          // Clear wallet data if no cache
          setWalletData(null)
          setWalletDataErrors([])
          setWalletDataWarnings([])
        }
      } else {
        // No wallet address set, clear data
        setWalletData(null)
        setWalletDataErrors([])
        setWalletDataWarnings([])
      }
    } else {
      setTokenError('Token not found. Please check the address and try again.')
    }
    
    setIsLoadingToken(false)
  }

  // Handle wallet load
  async function handleLoadWallet() {
    if (!walletAddress || !tokenInfo) return
    
    setIsLoadingWallet(true)
    setWalletError('')
    setWalletDataErrors([])
    setWalletDataWarnings([])
    
    try {
      const portfolio = await fetchWalletPortfolio(walletAddress, tokenInfo.address)
      
      if (portfolio) {
        setWalletData(portfolio)
        setWalletDataErrors(portfolio.errors)
        setWalletDataWarnings(portfolio.warnings)
        
        // Cache the wallet data
        setCachedWalletData(walletAddress, tokenInfo.address, portfolio)
        
        localStorage.setItem(STORAGE_KEY_WALLET_ADDRESS, walletAddress)
        
        console.log('Wallet loaded and cached:', {
          token: tokenInfo.symbol,
          holdings: portfolio.totalTokens,
          avgEntry: portfolio.avgEntryPrice,
          invested: portfolio.totalInvestedUSD
        })
      } else {
        setWalletError('No transaction data found for this wallet and token.')
      }
    } catch (error) {
      console.error('Error loading wallet:', error)
      setWalletError('Failed to load wallet data. Please check the address and try again.')
    } finally {
      setIsLoadingWallet(false)
    }
  }

  // Calculate manual entry values
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

  // Calculate break-even metrics
  function calculateBreakEven() {
    const entryData = getCurrentEntryData()
    if (!entryData) return null
    
    const SELL_TAX = 0.10
    const TOTAL_SUPPLY = 1_000_000_000
    
    // To break even after 10% tax, we need: invested = (holdings * price) * (1 - 0.10)
    // So: price = invested / (holdings * 0.90)
    const breakEvenPrice = entryData.totalInvestedUSD / (entryData.holdings * (1 - SELL_TAX))
    const breakEvenMcap = breakEvenPrice * TOTAL_SUPPLY
    
    return {
      price: breakEvenPrice,
      mcap: breakEvenMcap
    }
  }

  // Calculate what you'd get at a specific multiplier
  function calculateMultiplierTarget(multiplier: number) {
    const entryData = getCurrentEntryData()
    if (!entryData) return null
    
    const SELL_TAX = 0.10
    const TOTAL_SUPPLY = 1_000_000_000
    
    // Target value after tax
    const targetValue = entryData.totalInvestedUSD * multiplier
    
    // Gross value needed (before 10% tax)
    const grossValue = targetValue / (1 - SELL_TAX)
    
    // Price per token needed
    const priceNeeded = grossValue / entryData.holdings
    
    // Market cap needed
    const mcapNeeded = priceNeeded * TOTAL_SUPPLY
    
    // Profit
    const profit = targetValue - entryData.totalInvestedUSD
    
    return {
      multiplier,
      priceNeeded,
      mcapNeeded,
      grossValue,
      netValue: targetValue,
      profit
    }
  }

  // Get current entry data (unified interface)
  function getCurrentEntryData(): EntryData | null {
    if (entryMode === 'wallet' && walletData) {
      return {
        holdings: walletData.totalTokens,
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

  // Calculate P/L
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

  // Live price polling
  useEffect(() => {
    if (!tokenInfo) return
    
    let isCancelled = false
    
    async function updatePrice() {
      if (isCancelled) return
      
      setIsUpdatingPrice(true)
      
      try {
        if (!tokenInfo) return
      
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
    
    // Set up 10-second polling
    const intervalId = setInterval(updatePrice, 10000)
    
    return () => {
      isCancelled = true
      clearInterval(intervalId)
    }
  }, [tokenInfo])

  // Save entry mode to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ENTRY_MODE, entryMode)
  }, [entryMode])

  // Save manual entry to localStorage
  useEffect(() => {
    if (entryMode === 'manual') {
      localStorage.setItem(STORAGE_KEY_MANUAL_HOLDINGS, manualHoldings)
      localStorage.setItem(STORAGE_KEY_MANUAL_ENTRY_PRICE, manualEntryPrice)
      localStorage.setItem(STORAGE_KEY_MANUAL_TOTAL_INVESTED, manualTotalInvested)
    }
  }, [entryMode, manualHoldings, manualEntryPrice, manualTotalInvested])


  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wide">
            ← Back to Dashboard
          </Link>
          <h1 className="text-5xl md:text-6xl font-black mt-4 mb-2 uppercase tracking-tight">
            BREAK EVEN LIVE
          </h1>
          <p className="text-gray-500 text-sm">
            Track new token launches with live break-even and profit targets
          </p>
        </div>

        {/* 1. Add Token */}
        <div className="glass-card border-punk rounded-lg p-6 mb-8">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">
            1. Add Token
          </h3>
          
          {/* Quick Select Tokens */}
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Quick Select</div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {STRATEGY_TOKENS.map((token) => (
                <button
                  key={token.address}
                  onClick={() => {
                    setTokenAddress(token.address)
                    handleLoadToken(token.address)
                  }}
                  className="border border-gray-700 rounded-md px-3 py-2 bg-gray-800 text-white text-xs font-bold uppercase hover:bg-gray-700 hover:border-gray-600 transition-colors"
                >
                  {token.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input */}
          <div>
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Or Paste Address</div>
            <div className="flex gap-4">
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="Token Contract Address (0x...)"
                className="flex-1 border border-gray-700 rounded-md px-4 py-2 bg-gray-800 text-white placeholder-gray-500"
              />
              <button
                onClick={() => handleLoadToken()}
                disabled={isLoadingToken || !tokenAddress}
                className="btn-punk px-8"
              >
                {isLoadingToken ? 'Loading...' : 'Load Token'}
              </button>
            </div>
          </div>
          
          {tokenError && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-700/30 rounded text-sm text-red-400">
              {tokenError}
            </div>
          )}
          
          {tokenInfo && (
            <div className="mt-4 p-4 border border-gray-700 rounded-lg">
              <div className="flex justify-between items-start mb-4">
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
              
              {tokenSupply && (
                <div className="pt-4 border-t border-gray-700 grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Max Supply</div>
                    <div className="text-sm font-bold text-gray-400">
                      {tokenSupply.maxSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Burned</div>
                    <div className="text-sm font-bold text-red-400">
                      {tokenSupply.burned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Circulating</div>
                    <div className="text-sm font-bold text-green-400">
                      {tokenSupply.circulatingSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Entry Data (Wallet or Manual) */}
        {tokenInfo && (
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
                  />
                  <button
                    onClick={handleLoadWallet}
                    disabled={isLoadingWallet || !walletAddress}
                    className="btn-punk px-8"
                  >
                    {isLoadingWallet ? 'Loading...' : 'Load Data'}
                  </button>
                </div>
                
                {walletData && (
                  <button
                    onClick={handleLoadWallet}
                    disabled={isLoadingWallet}
                    className="text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wide mb-4"
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
                  <>
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
                    {(walletData as any).cachedAt && (
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        Cached data - Click "Reload" for fresh data
                      </div>
                    )}
                  </>
                )}
                
                {walletData && walletData.totalTokens === 0 && (
                  <div className="mt-4 p-3 border border-gray-700 rounded text-sm text-gray-400">
                    No holdings found for this token in this wallet.
                  </div>
                )}
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
                      <div className="mt-1 text-base font-medium text-white">
                        {calculateManualEntry().holdings.toLocaleString()} {tokenInfo.symbol}
                      </div>
                    </div>
                    <div className="border border-gray-800 rounded-md p-3">
                      <div className="text-xs text-gray-500">Avg Entry Price</div>
                      <div className="mt-1 text-base font-medium text-white">
                        ${calculateManualEntry().avgEntryPrice.toFixed(6)}
                      </div>
                    </div>
                    <div className="border border-gray-800 rounded-md p-3">
                      <div className="text-xs text-gray-500">Total Invested</div>
                      <div className="mt-1 text-base font-medium text-white">
                        ${calculateManualEntry().totalInvestedUSD.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Live Price Tracking */}
        {tokenInfo && getCurrentEntryData() && (
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
                <div className="text-3xl font-bold text-white">
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
                <div className="text-3xl font-bold text-white">
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
                      <div className="text-xl font-bold text-white">{formatUSD(pl.currentValue)}</div>
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
        )}

        {/* Live Chart */}
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
            
            <div className="mt-3 text-xs text-gray-500 text-center">
              Live chart powered by GeckoTerminal
            </div>
          </div>
        )}

        {/* 4. Profit Target Calculator */}
        {tokenInfo && getCurrentEntryData() && (() => {
          const breakEven = calculateBreakEven()
          const currentTarget = calculateMultiplierTarget(targetMultiplier)
          const isHit = currentTarget && currentMarketCap && currentMarketCap >= currentTarget.mcapNeeded
          const isClose = currentTarget && currentMarketCap && currentMarketCap >= currentTarget.mcapNeeded * 0.9
          
          return (
            <div className="glass-card border-punk rounded-lg p-6 mb-8">
              <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-6">
                4. Profit Target Calculator
              </h3>

              {/* Break Even Zone */}
              {breakEven && (
                <div className="border border-gray-700 rounded-lg p-4 mb-6 bg-gray-900/50">
                  <div className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Break Even Zone</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Price Needed</div>
                      <div className="text-lg font-bold text-white mt-1">{formatPrice(breakEven.price)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Market Cap Needed</div>
                      <div className="text-lg font-bold text-white mt-1">{formatCompact(breakEven.mcap)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Accounts for 10% sell tax
                  </div>
                </div>
              )}

              {/* Target Multiplier Slider */}
              <div className="border border-gray-700 rounded-lg p-6 mb-6 bg-gray-900/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-400 uppercase tracking-wider">Target Multiplier</div>
                  <div className={`text-3xl font-bold ${targetMultiplier >= 1 ? 'text-white' : targetMultiplier >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {targetMultiplier.toFixed(1)}x
                  </div>
                </div>
                
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={targetMultiplier}
                  onChange={(e) => setTargetMultiplier(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>0.1x</span>
                  <span>0.5x</span>
                  <span>1x</span>
                  <span>2x</span>
                  <span>5x</span>
                  <span>10x</span>
                </div>
              </div>

              {/* Target Results */}
              {currentTarget && (
                <div 
                  className={`border rounded-lg p-6 transition-all ${
                    currentTarget.multiplier < 1 ? 'border-red-500/50 bg-red-900/5' :
                    isHit ? 'border-green-500 border-pulse bg-green-900/10' : 
                    isClose ? 'border-yellow-500/50 bg-yellow-900/5' :
                    'border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`text-xl font-bold ${currentTarget.multiplier >= 1 ? 'text-white' : 'text-red-400'}`}>
                      Target: {currentTarget.multiplier.toFixed(1)}x {currentTarget.multiplier < 1 ? 'Loss' : 'Return'}
                    </div>
                    {currentTarget.multiplier < 1 && (
                      <div className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded text-sm font-semibold text-red-400 uppercase tracking-wider">
                        LOSS SCENARIO
                      </div>
                    )}
                    {currentTarget.multiplier >= 1 && isHit && (
                      <div className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded text-sm font-semibold text-green-400 uppercase tracking-wider">
                        TARGET HIT
                      </div>
                    )}
                    {currentTarget.multiplier >= 1 && !isHit && isClose && (
                      <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded text-sm font-semibold text-yellow-400 uppercase tracking-wider">
                        CLOSE
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Price Needed</div>
                      <div className="text-xl font-bold text-white">{formatPrice(currentTarget.priceNeeded)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">MCAP Needed</div>
                      <div className="text-xl font-bold text-white">{formatCompact(currentTarget.mcapNeeded)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Net Value</div>
                      <div className="text-xl font-bold text-white">{formatUSD(currentTarget.netValue)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Profit</div>
                      <div className={`text-xl font-bold ${currentTarget.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {currentTarget.profit >= 0 ? '+' : ''}{formatUSD(currentTarget.profit)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

