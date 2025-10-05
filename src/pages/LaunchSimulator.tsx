import { Link } from 'react-router-dom'
import { useState } from 'react'

// Launch parameters (fixed for v1)
const TOTAL_SUPPLY = 1_000_000_000

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
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

function calculateTax(minute: number): number {
  return Math.max(10, 95 - minute)
}

export default function LaunchSimulator() {
  const [entryMinute, setEntryMinute] = useState(30)
  const [entryMarketCap, setEntryMarketCap] = useState(200000) // $200K default
  const [exitMarketCap, setExitMarketCap] = useState(5000000) // $5M default
  const [investment, setInvestment] = useState('1000')

  // Auto-adjust exit MCAP if it's below entry MCAP
  const handleEntryMcapChange = (newEntryMcap: number) => {
    setEntryMarketCap(newEntryMcap)
    if (exitMarketCap < newEntryMcap) {
      setExitMarketCap(newEntryMcap)
    }
  }

  const investmentNum = Number(investment) || 0
  const taxRate = calculateTax(entryMinute)
  
  // Entry price based on entry market cap
  const entryPrice = entryMarketCap / TOTAL_SUPPLY
  
  // Tokens received after tax
  const tokensReceived = (investmentNum * (1 - taxRate / 100)) / entryPrice
  const effectiveCost = investmentNum / tokensReceived
  
  // Exit calculations
  const exitPrice = exitMarketCap / TOTAL_SUPPLY
  const exitValue = tokensReceived * exitPrice
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
            Dynamic Tax System • 95% → 10%
          </p>
        </div>

        {/* Three Sliders + Investment */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Slider 1: Entry Minute */}
          <div className="glass-card border-punk rounded-lg p-6">
            <label className="block mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Entry Minute</div>
              <div className="text-3xl font-bold mb-4">{entryMinute} min</div>
              <input
                type="range"
                min="0"
                max="90"
                value={entryMinute}
                onChange={(e) => setEntryMinute(Number(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>0</span>
                <span>90</span>
              </div>
            </label>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tax Rate</div>
              <div className={`text-2xl font-bold ${taxRate >= 70 ? 'text-red-500' : taxRate >= 30 ? 'text-yellow-500' : 'text-green-500'}`}>
                {taxRate}%
              </div>
            </div>
          </div>

          {/* Slider 2: Entry Market Cap */}
          <div className="glass-card border-punk rounded-lg p-6">
            <label className="block mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Entry Market Cap</div>
              <div className="text-3xl font-bold mb-4">{formatCompact(entryMarketCap)}</div>
              <input
                type="range"
                min="50000"
                max="1000000"
                step="10000"
                value={entryMarketCap}
                onChange={(e) => handleEntryMcapChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>$50K</span>
                <span>$1M</span>
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
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Exit Market Cap</div>
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
            ${investment} Investment • Entry: {formatCompact(entryMarketCap)} → Exit: {formatCompact(exitMarketCap)}
          </p>
          
          <div className="space-y-4">
            {[0, 30, 60, 85].map((min) => {
              const tax = calculateTax(min)
              // Use same entry price for comparison (same entry MCAP assumption)
              const tokens = (investmentNum * (1 - tax / 100)) / entryPrice
              const value = tokens * exitPrice
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
                    <div className="text-xs text-gray-500">({tax}% tax)</div>
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


