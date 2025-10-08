import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { fetchLaunchDataCached, type HistoricalLaunchData } from '../geckoterminal'
import { fetchCoinOverview } from '../api'
import { COINS } from '../components/StrategyOverview'

// Launch parameters (fixed for v1)
const TOTAL_SUPPLY = 1_000_000_000

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 8 }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function calculateMinuteFromTax(tax: number): number {
  // Approximate minute based on tax rate (for historical mode mapping)
  return Math.max(0, 95 - tax)
}

export default function LaunchSimulator() {
  // Mode: simulation or historical
  const [mode, setMode] = useState<'simulation' | 'historical'>('simulation')
  
  // Token selection for historical mode
  const [selectedTokenAddress, setSelectedTokenAddress] = useState(COINS[0].address) // Default to PNKSTR
  
  // Historical data state
  const [historicalData, setHistoricalData] = useState<HistoricalLaunchData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  
  const [taxRate, setTaxRate] = useState(65) // Default 65% tax
  const [entryMarketCap, setEntryMarketCap] = useState(200000) // $200K default
  const [exitMarketCap, setExitMarketCap] = useState(5000000) // $5M default
  const [investment, setInvestment] = useState('1000')
  
  // Fetch historical data when switching to historical mode or changing token
  useEffect(() => {
    if (mode === 'historical') {
      setIsLoadingData(true)
      setDataError(null)
      setHistoricalData(null) // Clear old data
      
      fetchLaunchDataCached(selectedTokenAddress)
        .then((data) => {
          if (data) {
            setHistoricalData(data)
            console.log(`Loaded ${data.dataPoints.length} data points for ${data.tokenSymbol}`)
          } else {
            setDataError('Failed to load historical data')
          }
        })
        .catch((err) => {
          console.error('Error fetching historical data:', err)
          setDataError('Error loading data')
        })
        .finally(() => {
          setIsLoadingData(false)
        })
    }
  }, [mode, selectedTokenAddress])

  // Auto-adjust exit MCAP if it's below entry MCAP
  const handleEntryMcapChange = (newEntryMcap: number) => {
    setEntryMarketCap(newEntryMcap)
    if (exitMarketCap < newEntryMcap) {
      setExitMarketCap(newEntryMcap)
    }
  }
  
  // Fetch and set current market cap for exit target
  const [isLoadingCurrentMcap, setIsLoadingCurrentMcap] = useState(false)
  const handleSetCurrentMcap = async () => {
    setIsLoadingCurrentMcap(true)
    try {
      const data = await fetchCoinOverview(selectedTokenAddress)
      if (data?.marketCap) {
        setExitMarketCap(data.marketCap)
      }
    } catch (error) {
      console.error('Error fetching current market cap:', error)
    } finally {
      setIsLoadingCurrentMcap(false)
    }
  }

  const investmentNum = Number(investment) || 0
  const SELL_TAX = 0.10 // 10% sell tax on all nftstrategy.fun tokens
  
  // Calculate entry minute from tax rate (for historical mode)
  const entryMinute = calculateMinuteFromTax(taxRate)
  
  // Helper: Get data point for a specific minute (data is now filled with no gaps)
  const getDataPointForMinute = (minute: number) => {
    if (!historicalData || minute < 0 || minute > 89) return null
    // Data is filled for every minute 0-89, so we can directly access by index
    return historicalData.dataPoints[minute]
  }
  
  // Calculate actual entry market cap based on mode
  // In historical mode: use real data from selected minute (derived from tax)
  // In simulation mode: use slider value
  const actualEntryMarketCap = mode === 'historical' && historicalData
    ? (getDataPointForMinute(entryMinute)?.marketCap ?? entryMarketCap)
    : entryMarketCap
  
  // Entry price based on entry market cap
  const entryPrice = actualEntryMarketCap / TOTAL_SUPPLY
  
  // Tokens received after buy tax
  const tokensReceived = (investmentNum * (1 - taxRate / 100)) / entryPrice
  const effectiveCost = investmentNum / tokensReceived
  
  // Exit calculations (with sell tax)
  const exitPrice = exitMarketCap / TOTAL_SUPPLY
  const grossExitValue = tokensReceived * exitPrice
  const exitValue = grossExitValue * (1 - SELL_TAX) // Account for 10% sell tax
  const profit = exitValue - investmentNum
  const roi = (profit / investmentNum) * 100

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-gray-500 hover:text-white text-xs uppercase tracking-wider transition-colors">
            ← Back
          </Link>
          <h1 className="text-4xl md:text-5xl font-black mt-4 mb-2 uppercase tracking-tight">
            LAUNCH SIMULATOR
          </h1>
          <p className="text-xs text-gray-600 uppercase tracking-wider">
            Dynamic Buy Tax 95% → 10% • 10% Sell Tax
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="glass-card border-punk rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-1">MODE</h3>
              <p className="text-xs text-gray-500">
                {mode === 'simulation' 
                  ? 'Use custom parameters to simulate entry scenarios' 
                  : 'Use real historical data from actual token launches (FIRST 90 MINUTES)'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('simulation')}
                className={`px-6 py-3 rounded font-bold text-sm uppercase tracking-wider transition-all ${
                  mode === 'simulation'
                    ? 'bg-white text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Simulation
              </button>
              <button
                onClick={() => setMode('historical')}
                className={`px-6 py-3 rounded font-bold text-sm uppercase tracking-wider transition-all ${
                  mode === 'historical'
                    ? 'bg-white text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Historical Data
              </button>
            </div>
          </div>
          
          {/* Loading/Error/Success States */}
          {mode === 'historical' && isLoadingData && (
            <div className="mt-4 pt-4 border-t border-gray-800 text-sm text-gray-400">
              Loading {COINS.find(c => c.address === selectedTokenAddress)?.symbol} historical launch data (first 90 minutes)...
            </div>
          )}
          {mode === 'historical' && dataError && (
            <div className="mt-4 pt-4 border-t border-gray-800 text-sm text-red-500">
              {dataError}
            </div>
          )}
          {mode === 'historical' && historicalData && !isLoadingData && (
            <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
              {historicalData.tokenSymbol} Launch Data Loaded • 
              Launched: {new Date(historicalData.launchTimestamp * 1000).toLocaleDateString()} •{' '}
              <a href="https://www.geckoterminal.com/" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                Data from GeckoTerminal
              </a>
            </div>
          )}
        </div>

        {/* Token Selector (Historical Mode Only) */}
        {mode === 'historical' && (
          <div className="glass-card border-punk rounded-lg p-6 mb-8">
            <label className="block">
              <div className="text-sm font-bold uppercase tracking-wider mb-2">SELECT TOKEN</div>
              <select
                value={selectedTokenAddress}
                onChange={(e) => setSelectedTokenAddress(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-3 text-lg font-bold uppercase tracking-wider cursor-pointer hover:border-gray-500 transition-colors"
              >
                {COINS.map((coin) => (
                  <option key={coin.address} value={coin.address}>
                    {coin.symbol} - {coin.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-2 uppercase tracking-wider">
                Analyze historical launch data from the first 90 minutes
              </div>
            </label>
          </div>
        )}

        {/* Three Sliders + Investment */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Slider 1: Tax Rate */}
          <div className="glass-card border-punk rounded-lg p-6">
            <label className="block mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Buy Tax Rate</div>
              <div className={`text-3xl font-bold mb-4 ${taxRate >= 70 ? 'text-red-500' : taxRate >= 30 ? 'text-yellow-500' : 'text-green-500'}`}>
                {taxRate}%
              </div>
              <input
                type="range"
                min="10"
                max="99"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>10%</span>
                <span>99%</span>
              </div>
            </label>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Approx. Entry Minute</div>
              <div className="text-2xl font-bold">
                ~{entryMinute} min
              </div>
            </div>
          </div>

          {/* Slider 2: Entry Market Cap */}
          <div className="glass-card border-punk rounded-lg p-6">
            <label className="block mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Entry Market Cap
                {mode === 'historical' && <span className="ml-2 text-green-500">[LOCKED - FROM REAL DATA]</span>}
              </div>
              <div className="text-3xl font-bold mb-4">{formatCompact(actualEntryMarketCap)}</div>
              <input
                type="range"
                min="50000"
                max="5000000"
                step="50000"
                value={mode === 'historical' ? actualEntryMarketCap : entryMarketCap}
                onChange={(e) => handleEntryMcapChange(Number(e.target.value))}
                disabled={mode === 'historical'}
                className={`w-full h-2 bg-gray-800 rounded-lg appearance-none ${
                  mode === 'historical' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>$50K</span>
                <span>$5M</span>
              </div>
            </label>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Entry Price</div>
              <div className="text-lg font-bold">{formatPrice(entryPrice)}</div>
            </div>
          </div>

          {/* Slider 3: Exit Market Cap */}
          <div className="glass-card border-punk rounded-lg p-6">
            <label className="block mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Exit Market Cap</div>
                {mode === 'historical' && (
                  <button
                    onClick={handleSetCurrentMcap}
                    disabled={isLoadingCurrentMcap}
                    className="text-xs uppercase tracking-wider px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                  >
                    {isLoadingCurrentMcap ? 'Loading...' : 'Set to Current'}
                  </button>
                )}
              </div>
              <div className="text-3xl font-bold mb-4">{formatCompact(exitMarketCap)}</div>
              <input
                type="range"
                min={entryMarketCap}
                max="15000000"
                step="100000"
                value={exitMarketCap}
                onChange={(e) => setExitMarketCap(Number(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>{formatCompact(entryMarketCap)}</span>
                <span>$15M</span>
              </div>
            </label>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Exit Price</div>
              <div className="text-lg font-bold">{formatPrice(exitPrice)}</div>
            </div>
          </div>

          {/* Investment Amount */}
          <div className="glass-card border-punk rounded-lg p-6">
            <label className="block mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Investment</div>
              <div className="text-3xl font-bold mb-4">${investment}</div>
              <input
                type="number"
                value={investment}
                onChange={(e) => setInvestment(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-3 text-lg font-bold"
                placeholder="1000"
              />
            </label>
          </div>
        </div>

        {/* Results Card */}
        <div className="glass-card border-punk rounded-lg p-8 mb-8">
          <h2 className="text-xl font-black uppercase tracking-tight mb-6">YOUR RESULTS</h2>
          
          {mode === 'historical' && (
            <div className="text-xs text-yellow-200 mb-4 pb-4 border-b border-gray-800">
              Market cap = average of open and close prices. Real launches are volatile AF - prices swing wildly within each minute. Use this as a guide, not gospel. This is meant more for educational purposes.
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tax Paid</div>
              <div className="text-xl font-bold">{formatUSD(investmentNum * (taxRate / 100))}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tokens Received</div>
              <div className="text-xl font-bold">{formatNumber(tokensReceived)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Effective Cost</div>
              <div className="text-xl font-bold">{isFinite(effectiveCost) ? formatPrice(effectiveCost) : '—'}</div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 mb-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Entry Price</div>
                <div className="text-xl font-bold">{formatPrice(entryPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Exit Price</div>
                <div className="text-xl font-bold">{formatPrice(exitPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Exit Value</div>
                <div className="text-xl font-bold">{formatUSD(exitValue)}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Profit</div>
                <div className={`text-3xl font-black ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatUSD(profit)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">ROI</div>
                <div className={`text-3xl font-black ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Comparison */}
        <div className="glass-card border-punk rounded-lg p-8">
          <h2 className="text-xl font-black uppercase tracking-tight mb-2">QUICK COMPARISON</h2>
          <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider">
            ${investment} Investment • Entry: {formatCompact(actualEntryMarketCap)} → Exit: {formatCompact(exitMarketCap)}
          </p>
          
          <div className="space-y-4">
            {[0, 15, 30, 45, 60, 75, 85].map((min) => {
              const tax = Math.max(10, 95 - min) // Calculate tax for this minute
              
              // Calculate entry MCAP for this minute
              // In historical mode: use REAL data from that minute
              // In simulation mode: use same entry MCAP as main calculation
              const entryMcapForMin = mode === 'historical' && historicalData
                ? (getDataPointForMinute(min)?.marketCap ?? entryMarketCap)
                : entryMarketCap
              
              const entryPriceForMin = entryMcapForMin / TOTAL_SUPPLY
              const tokens = (investmentNum * (1 - tax / 100)) / entryPriceForMin
              const grossValue = tokens * exitPrice
              const value = grossValue * (1 - SELL_TAX) // Account for 10% sell tax
              const p = value - investmentNum
              const r = (p / investmentNum) * 100
              const isCurrent = min === entryMinute
              
              return (
                <div 
                  key={min}
                  className={`flex items-center justify-between py-3 px-4 rounded ${
                    isCurrent ? 'bg-gray-800 border border-white' : 'border border-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-bold w-20">Min {min}</div>
                    <div className="text-xs text-gray-500">
                      {mode === 'historical' && historicalData 
                        ? `(${formatCompact(entryMcapForMin)} MCAP)`
                        : `(${tax}% tax)`
                      }
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${r >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {r >= 0 ? '+' : ''}{r.toFixed(0)}% ROI
                  </div>
                  {isCurrent && <div className="text-xs text-gray-400">← YOU</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}


