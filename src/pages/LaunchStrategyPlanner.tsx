import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchETHPrice } from '../api'

// Fixed token supply (same as all nftstrategy.fun tokens)
const TOTAL_SUPPLY = 1_000_000_000

export default function LaunchStrategyPlanner() {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Linked parameters (MC ↔ Price)
  const [initialMC, setInitialMC] = useState(110000)
  const initialPrice = initialMC / TOTAL_SUPPLY
  
  // Independent parameters
  const [mcIncreasePerMin, setMcIncreasePerMin] = useState(50000)
  const [investment, setInvestment] = useState(1000)
  const [ethPrice, setEthPrice] = useState(4000)
  const [isLiveETH, setIsLiveETH] = useState(false)
  
  // Event timing
  const [eventStartTime, setEventStartTime] = useState<Date | null>(null)
  const [currentMinute, setCurrentMinute] = useState(0)
  const [manualMinute, setManualMinute] = useState(0)
  const [isManualMode, setIsManualMode] = useState(true) // Start in manual mode
  const [isAccelerated, setIsAccelerated] = useState(false) // 20x speed toggle
  const [timeToStart, setTimeToStart] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  
  // Entry tracking
  type Entry = {
    id: number
    minute: number
    investment: number
    investmentETH: number
    entryMC: number
    entryMCEth: number
    entryPrice: number
    buyTax: number
    tokensBought: number
    breakevenPriceFinalTax: number
    breakevenMCFinalTax: number
    breakevenPriceFinalTaxETH: number
    breakevenMCFinalTaxETH: number
    isEditing?: boolean
    lastEditedField?: 'investment' | 'tokensBought' | 'minuteOrMC' | null
    _originalEntry?: Entry
  }
  
  const [stagedEntries, setStagedEntries] = useState<Entry[]>([])
  
  // Auto-scroll state
  const [userHasScrolled, setUserHasScrolled] = useState(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  
  // Help modal state
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  // Active minute (manual or live)
  const activeMinute = isManualMode ? manualMinute : currentMinute

  // Update time every second and calculate current minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      if (eventStartTime && !isManualMode) {
        const timeDiff = now.getTime() - eventStartTime.getTime()
        
        if (timeDiff < 0) {
          // Event hasn't started yet - show countdown
          setTimeToStart(Math.abs(timeDiff))
          setCurrentMinute(0)
          setElapsedTime(0)
        } else {
          // Event is running - calculate current minute and elapsed time
          setTimeToStart(null)
          setElapsedTime(timeDiff)
          // Apply 20x acceleration if enabled
          const effectiveTimeDiff = isAccelerated ? timeDiff * 20 : timeDiff
          const minutesPassed = Math.floor(effectiveTimeDiff / (1000 * 60)) + 1
          setCurrentMinute(Math.min(86, minutesPassed))
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [eventStartTime, isManualMode, isAccelerated])

  // Fetch ETH price from DexScreener
  useEffect(() => {
    const updateETHPrice = async () => {
      const price = await fetchETHPrice()
      if (price) {
        setEthPrice(price)
        setIsLiveETH(true)
      }
    }

    // Fetch on mount
    updateETHPrice()

    // Update every 30 seconds
    const interval = setInterval(updateETHPrice, 30000)
    return () => clearInterval(interval)
  }, [])

  // Utility: Format duration (ms to readable string)
  const formatDuration = (milliseconds: number): string => {
    if (milliseconds < 0) return '0s'
    
    let totalSeconds = Math.floor(milliseconds / 1000)
    const days = Math.floor(totalSeconds / (3600 * 24))
    totalSeconds %= (3600 * 24)
    const hours = Math.floor(totalSeconds / 3600)
    totalSeconds %= 3600
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if ((days === 0 && hours === 0) || parts.length === 0) {
      parts.push(`${seconds}s`)
    }
    
    return parts.join(' ') || '0s'
  }

  // Calculate buy tax for a given minute (95% at minute 1 → 10% at minute 86)
  const getBuyTaxRate = (minute: number): number => {
    const validMinute = Math.max(1, Math.min(86, minute))
    return Math.max(10, 95 - (validMinute - 1))
  }

  // Generate full 86-minute simulation data
  const runSimulation = () => {
    const simulationData = []
    const FINAL_SELL_TAX = 0.10
    
    for (let minute = 1; minute <= 86; minute++) {
      const buyTax = getBuyTaxRate(minute)
      const buyTaxDecimal = buyTax / 100
      
      // Calculate market cap and price at this minute
      const marketCap = initialMC + (minute - 1) * mcIncreasePerMin
      const tokenPrice = marketCap / TOTAL_SUPPLY
      
      // Calculate tokens bought (after buy tax deduction)
      const effectiveInvestment = investment * (1 - buyTaxDecimal)
      const tokensBought = effectiveInvestment / tokenPrice
      
      // Calculate breakeven (assuming 10% sell tax)
      const netTokensAfterSell = tokensBought * (1 - FINAL_SELL_TAX)
      const breakevenPrice = netTokensAfterSell > 0 ? investment / netTokensAfterSell : 0
      const breakevenMC = breakevenPrice * TOTAL_SUPPLY
      
      // ETH conversions
      const marketCapETH = marketCap / ethPrice
      const tokenPriceETH = tokenPrice / ethPrice
      const breakevenMCETH = breakevenMC / ethPrice
      const breakevenPriceETH = breakevenPrice / ethPrice
      
      simulationData.push({
        minute,
        buyTax,
        marketCap,
        tokenPrice,
        marketCapETH,
        tokenPriceETH,
        tokensBought,
        breakevenMC,
        breakevenPrice,
        breakevenMCETH,
        breakevenPriceETH
      })
    }
    
    return simulationData
  }

  // Format price with appropriate precision
  const formatPrice = (price: number): string => {
    if (!isFinite(price) || price === null || price < 1e-18) {
      return '$0'
    }
    
    if (Math.abs(price) >= 1) {
      return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 4 })
    }
    
    // For small numbers, use Z+4 significant figures
    const priceString = price.toFixed(20)
    const dotIndex = priceString.indexOf('.')
    
    if (dotIndex === -1) return '$' + price.toString()
    
    let leadingZeros = 0
    let firstNonZeroIndex = -1
    
    for (let i = dotIndex + 1; i < priceString.length; i++) {
      if (priceString[i] === '0') {
        leadingZeros++
      } else {
        firstNonZeroIndex = i
        break
      }
    }
    
    if (firstNonZeroIndex === -1) return '$0'
    
    const totalDesiredDecimalPlaces = leadingZeros + 4
    const formattedPrice = price.toFixed(totalDesiredDecimalPlaces)
    
    return '$' + formattedPrice
  }

  // Format ETH with appropriate precision
  const formatETH = (number: number): string => {
    let decimals = 4
    if (number < 0.001) decimals = 6
    if (number < 0.000001) decimals = 8
    return number.toLocaleString('en-US', { maximumFractionDigits: decimals })
  }

  // Handler: Start Now button
  const handleStartNow = () => {
    const now = new Date()
    setEventStartTime(now)
    setIsManualMode(false) // Switch to live mode
  }

  // Handler: Stop/Reset button
  const handleStop = () => {
    setEventStartTime(null)
    setCurrentMinute(0)
    setTimeToStart(null)
    setElapsedTime(0)
    setIsManualMode(true) // Back to manual mode
    setManualMinute(0)
  }

  // Handler: Record Investment Entry
  const recordEntry = () => {
    if (activeMinute < 1 || activeMinute > 86) return
    
    const simulationData = runSimulation()
    const currentData = simulationData[activeMinute - 1]
    
    if (!currentData) return
    
    const newEntry: Entry = {
      id: Date.now(),
      minute: currentData.minute,
      investment: investment,
      investmentETH: investment / ethPrice,
      entryMC: currentData.marketCap,
      entryMCEth: currentData.marketCap / ethPrice,
      entryPrice: currentData.tokenPrice,
      buyTax: currentData.buyTax,
      tokensBought: currentData.tokensBought,
      breakevenPriceFinalTax: currentData.breakevenPrice,
      breakevenMCFinalTax: currentData.breakevenMC,
      breakevenPriceFinalTaxETH: currentData.breakevenPriceETH,
      breakevenMCFinalTaxETH: currentData.breakevenMCETH
    }
    
    setStagedEntries([...stagedEntries, newEntry])
  }

  // Handler: Clear all entries
  const clearAllEntries = () => {
    setStagedEntries([])
  }

  // Handler: Delete single entry
  const deleteEntry = (id: number) => {
    setStagedEntries(stagedEntries.filter(entry => entry.id !== id))
  }

  // Handler: Start editing entry
  const startEdit = (id: number) => {
    setStagedEntries(stagedEntries.map(entry => {
      if (entry.id === id) {
        // Store original values before editing
        return { ...entry, isEditing: true, _originalEntry: { ...entry } }
      }
      return entry
    }))
  }

  // Handler: Cancel editing
  const cancelEdit = (id: number) => {
    setStagedEntries(stagedEntries.map(entry => {
      if (entry.id === id && entry._originalEntry) {
        // Restore original values
        const { _originalEntry, ...restored } = entry._originalEntry
        return { ...restored, isEditing: false, lastEditedField: null }
      }
      return entry.id === id ? { ...entry, isEditing: false, lastEditedField: null } : entry
    }))
  }

  // Handler: Save edited entry
  const saveEdit = (id: number, editedValues: Partial<Entry>) => {
    setStagedEntries(stagedEntries.map(entry => {
      if (entry.id !== id) return entry

      // Apply edited values
      const updated = { ...entry, ...editedValues, isEditing: false }

      // Recalculate based on what was edited
      const buyTaxDecimal = updated.buyTax / 100
      const entryPrice = updated.entryMC / TOTAL_SUPPLY

      // Apply Source of Truth rules
      if (updated.lastEditedField === 'investment') {
        // RULE 1: Investment changed → Recalculate tokens
        const effectiveInvestment = updated.investment * (1 - buyTaxDecimal)
        updated.tokensBought = effectiveInvestment / entryPrice
      }
      // RULE 2: Tokens changed → Keep tokens as-is (investment stays same)
      // RULE 3: Minute/MC changed → Both investment and tokens stay same

      // Recalculate breakevens
      const FINAL_SELL_TAX = 0.10
      const netTokensAfterSell = updated.tokensBought * (1 - FINAL_SELL_TAX)
      updated.breakevenPriceFinalTax = netTokensAfterSell > 0 ? updated.investment / netTokensAfterSell : 0
      updated.breakevenMCFinalTax = updated.breakevenPriceFinalTax * TOTAL_SUPPLY

      // Recalculate ETH values
      updated.investmentETH = updated.investment / ethPrice
      updated.entryMCEth = updated.entryMC / ethPrice
      updated.breakevenPriceFinalTaxETH = updated.breakevenPriceFinalTax / ethPrice
      updated.breakevenMCFinalTaxETH = updated.breakevenMCFinalTax / ethPrice

      // Remove backup after saving
      delete updated._originalEntry

      return updated
    }))
  }

  // Auto-scroll to current minute
  useEffect(() => {
    if (!userHasScrolled && activeMinute > 0 && tableContainerRef.current) {
      const rowHeight = 45 // Approximate row height
      const scrollPosition = (activeMinute - 1) * rowHeight
      tableContainerRef.current.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      })
    }
  }, [activeMinute, userHasScrolled])

  // Handler: Manual scroll detection
  const handleTableScroll = () => {
    setUserHasScrolled(true)
  }

  // Handler: Jump to current minute
  const jumpToCurrentMinute = () => {
    setUserHasScrolled(false)
  }

  // Handler: Export to CSV
  const exportToCSV = () => {
    if (stagedEntries.length === 0) return

    // Headers (excluding Action column)
    const headers = [
      '#', 'Minute', 'Buy Tax', 'Invest ($)', 'Invest (ETH)', 
      'Entry MC ($)', 'Tokens', 'BE Price ($)', 'BE MC ($)'
    ]

    // Data rows
    const rows = stagedEntries.map((entry, index) => [
      index + 1,
      entry.minute,
      entry.buyTax,
      entry.investment.toFixed(2),
      entry.investmentETH.toFixed(4),
      entry.entryMC.toFixed(0),
      entry.tokensBought.toFixed(1),
      entry.breakevenPriceFinalTax.toFixed(6),
      entry.breakevenMCFinalTax.toFixed(0)
    ])

    // Totals row
    const overall = calculateOverallBreakeven()
    if (overall) {
      rows.push([
        'TOTALS',
        '',
        '',
        overall.totalInvestmentUSD.toFixed(2),
        overall.totalInvestmentETH.toFixed(4),
        '—',
        overall.totalTokensBought.toFixed(1),
        overall.overallBEPriceUSD.toFixed(6),
        overall.overallBEMCUSD.toFixed(0)
      ])
      
      // Add summary statistics
      rows.push(['']) // Empty row for spacing
      rows.push(['SUMMARY STATISTICS'])
      rows.push(['Total USD Invested', overall.totalInvestmentUSD.toFixed(2)])
      rows.push(['Total ETH Invested', overall.totalInvestmentETH.toFixed(4)])
      rows.push(['Total Tokens Purchased', overall.totalTokensBought.toFixed(1)])
      
      // Calculate average token price with proper precision (no $ to prevent auto-formatting)
      const avgPriceUSD = overall.totalInvestmentUSD / overall.totalTokensBought
      const avgPriceETH = overall.totalInvestmentETH / overall.totalTokensBought
      rows.push(['Average Token Price (USD)', avgPriceUSD.toFixed(10)])
      rows.push(['Average Token Price (ETH)', avgPriceETH.toFixed(12)])
      rows.push(['Overall Breakeven Price (USD)', overall.overallBEPriceUSD.toFixed(10)])
      rows.push(['Overall Breakeven MC (USD)', overall.overallBEMCUSD.toFixed(0)])
    }

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'vibestr_recorded_entries.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // Handler: Export to HTML
  const exportToHTML = () => {
    if (stagedEntries.length === 0) return

    const overall = calculateOverallBreakeven()
    if (!overall) return

    const avgPriceUSD = overall.totalInvestmentUSD / overall.totalTokensBought
    const avgPriceETH = overall.totalInvestmentETH / overall.totalTokensBought

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$ViBESTR Recorded Entries</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 40px 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 2rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .section {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 30px;
      margin-bottom: 30px;
    }
    h2 {
      font-size: 1.5rem;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid rgba(255, 255, 255, 0.2);
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    th {
      background: rgba(255, 255, 255, 0.1);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      color: #9ca3af;
    }
    td { font-size: 0.9rem; }
    .positive { color: #10b981; }
    .totals-row {
      background: rgba(255, 255, 255, 0.05);
      font-weight: bold;
      border-top: 3px solid #fff;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .summary-item {
      background: rgba(255, 255, 255, 0.05);
      padding: 20px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .summary-label {
      font-size: 0.875rem;
      color: #9ca3af;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #10b981;
    }
    .timestamp {
      text-align: center;
      color: #9ca3af;
      font-size: 0.875rem;
      margin-top: 30px;
    }
    @media print {
      body { background: #1a1a2e; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>$ViBESTR Launch Simulator</h1>
    
    <div class="section">
      <h2>Recorded Entries</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Minute</th>
            <th>Buy Tax</th>
            <th>Invest ($)</th>
            <th>Invest (ETH)</th>
            <th>Entry MC ($)</th>
            <th>Tokens</th>
            <th class="positive">BE Price ($)</th>
            <th class="positive">BE MC ($)</th>
          </tr>
        </thead>
        <tbody>
          ${stagedEntries.map((entry, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${entry.minute}</td>
              <td>${entry.buyTax}%</td>
              <td>$${entry.investment.toLocaleString()}</td>
              <td>${entry.investmentETH.toFixed(4)} ETH</td>
              <td>$${entry.entryMC.toLocaleString()}</td>
              <td>${entry.tokensBought.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
              <td class="positive">${formatPrice(entry.breakevenPriceFinalTax)}</td>
              <td class="positive">$${entry.breakevenMCFinalTax.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td colspan="3">TOTALS:</td>
            <td>$${overall.totalInvestmentUSD.toLocaleString()}</td>
            <td>${overall.totalInvestmentETH.toFixed(4)} ETH</td>
            <td>—</td>
            <td>${overall.totalTokensBought.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
            <td class="positive">${formatPrice(overall.overallBEPriceUSD)}</td>
            <td class="positive">$${overall.overallBEMCUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Summary Statistics</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Total USD Invested</div>
          <div class="summary-value">$${overall.totalInvestmentUSD.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Total ETH Invested</div>
          <div class="summary-value">${overall.totalInvestmentETH.toFixed(4)} ETH</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Total Tokens Purchased</div>
          <div class="summary-value">${overall.totalTokensBought.toLocaleString('en-US', { maximumFractionDigits: 1 })}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Average Token Price (USD)</div>
          <div class="summary-value">${avgPriceUSD.toFixed(10)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Average Token Price (ETH)</div>
          <div class="summary-value">${avgPriceETH.toFixed(12)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Overall Breakeven Price (USD)</div>
          <div class="summary-value">${formatPrice(overall.overallBEPriceUSD)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Overall Breakeven MC (USD)</div>
          <div class="summary-value">$${overall.overallBEMCUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
        </div>
      </div>
    </div>

    <div class="timestamp">
      Generated on ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`

    // Download
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'vibestr_recorded_entries.html'
    link.click()
    URL.revokeObjectURL(url)
  }

  // Calculate overall breakeven from all entries
  const calculateOverallBreakeven = () => {
    if (stagedEntries.length === 0) return null
    
    const FINAL_SELL_TAX = 0.10
    const totalInvestmentUSD = stagedEntries.reduce((sum, e) => sum + e.investment, 0)
    const totalInvestmentETH = stagedEntries.reduce((sum, e) => sum + e.investmentETH, 0)
    const totalTokensBought = stagedEntries.reduce((sum, e) => sum + e.tokensBought, 0)
    
    if (totalTokensBought === 0) return null
    
    const netTokens = totalTokensBought * (1 - FINAL_SELL_TAX)
    const overallBEPriceUSD = totalInvestmentUSD / netTokens
    const overallBEMCUSD = overallBEPriceUSD * TOTAL_SUPPLY
    const overallBEPriceETH = totalInvestmentETH / netTokens
    const overallBEMCETH = overallBEPriceETH * TOTAL_SUPPLY
    
    return {
      totalInvestmentUSD,
      totalInvestmentETH,
      totalTokensBought,
      overallBEPriceUSD,
      overallBEMCUSD,
      overallBEPriceETH,
      overallBEMCETH
    }
  }

  // Update Initial MC (price auto-calculates)
  const updateInitialMC = (value: number) => {
    setInitialMC(value)
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/launch-simulator" className="text-gray-500 hover:text-white text-xs uppercase tracking-wider transition-colors">
            ← Back to Launch Simulator
          </Link>
          <button
            onClick={() => setIsHelpOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg transition text-sm uppercase tracking-wide"
          >
            How to Use
          </button>
        </div>
        <h1 className="text-4xl font-bold text-center mb-8 text-white uppercase tracking-wide">
          Launch Strategy Planner
        </h1>

        {/* FULL WIDTH: Compact Parameters */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide text-center">
            Simulation Parameters
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Investment */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Investment ($)
              </label>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-sm font-semibold text-white">
                  ${investment.toLocaleString()}
                </div>
                <input
                  type="number"
                  value={investment}
                  onChange={(e) => setInvestment(Number(e.target.value))}
                  className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                  min="10"
                  max="150000"
                  step="10"
                />
              </div>
              <input
                type="range"
                value={investment}
                onChange={(e) => setInvestment(Number(e.target.value))}
                min="10"
                max="150000"
                step="10"
              />
            </div>

            {/* Market Cap */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Market Cap ($)
              </label>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-sm font-semibold text-white">
                  ${initialMC.toLocaleString()}
                </div>
                <input
                  type="number"
                  value={initialMC}
                  onChange={(e) => updateInitialMC(Number(e.target.value))}
                  className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                  min="10000"
                  max="10000000"
                  step="10000"
                />
              </div>
              <input
                type="range"
                value={initialMC}
                onChange={(e) => updateInitialMC(Number(e.target.value))}
                min="10000"
                max="10000000"
                step="10000"
              />
            </div>

            {/* MC Increase Per Minute */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                MC +/Min ($)
              </label>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-sm font-semibold text-white">
                  ${mcIncreasePerMin.toLocaleString()}
                </div>
                <input
                  type="number"
                  value={mcIncreasePerMin}
                  onChange={(e) => setMcIncreasePerMin(Number(e.target.value))}
                  className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                  min="0"
                  max="500000"
                  step="5000"
                />
              </div>
              <input
                type="range"
                value={mcIncreasePerMin}
                onChange={(e) => setMcIncreasePerMin(Number(e.target.value))}
                min="0"
                max="500000"
                step="5000"
              />
            </div>

            {/* Token Price (Calculated from MC / Supply) */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Token Price ($)
              </label>
              <div className="text-sm font-semibold text-white mb-1">
                {formatPrice(initialPrice)}
              </div>
              <div className="h-[6px] bg-gray-700 rounded-full mt-[0.5rem]"></div>
              <div className="text-xs text-gray-500 mt-1">
                Fixed Supply: {TOTAL_SUPPLY.toLocaleString()}
              </div>
            </div>

            {/* ETH Price (Live from DexScreener) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-400">
                  ETH Price ($)
                </label>
                {isLiveETH && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <span className="animate-pulse">●</span>
                    <span>Live</span>
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-white mb-1">
                ${ethPrice.toFixed(2)}
              </div>
              <div className="h-[6px] bg-gray-700 rounded-full mt-[0.5rem]"></div>
              <div className="text-xs text-gray-500 mt-1">
                Auto-updates every 30s
              </div>
            </div>
        </div>
        </div>
        
        {/* COMPACT: Event Controls */}
        <div className="glass-card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Event Start Time
              </label>
              <input
                type="datetime-local"
                onChange={(e) => setEventStartTime(e.target.value ? new Date(e.target.value) : null)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Current Time
              </label>
              <div className="bg-gray-800/50 p-2 rounded text-center text-white font-semibold">
                {currentTime.toLocaleTimeString()}
              </div>
            </div>
            
            <button
              onClick={handleStartNow}
              className="bg-green-600 hover:bg-green-500 text-black font-bold px-6 py-2 rounded-lg transition uppercase tracking-wide h-[42px]"
            >
              Start Now
            </button>
            
            <button
              onClick={handleStop}
              disabled={!eventStartTime}
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-lg transition disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed uppercase tracking-wide h-[42px]"
            >
              Stop
            </button>
          </div>
        </div>

        {/* COMPACT: Real-Time Status */}
        <div className="glass-card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Current Minute - Manual Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-400">
                  Current Minute
                </label>
                {isManualMode ? (
                  <span className="text-xs text-blue-400">Manual</span>
                ) : (
                  <span className="text-xs text-green-400">● Live</span>
                )}
              </div>
              {isManualMode ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm font-semibold text-white">
                      Min {manualMinute}
                    </div>
                    <input
                      type="number"
                      value={manualMinute}
                      onChange={(e) => setManualMinute(Number(e.target.value))}
                      className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                      min="0"
                      max="86"
                    />
                  </div>
                  <input
                    type="range"
                    value={manualMinute}
                    onChange={(e) => setManualMinute(Number(e.target.value))}
                    min="0"
                    max="86"
                    step="1"
                  />
                </>
              ) : (
                <>
                  <div className="bg-gray-800/50 p-2 rounded text-center font-semibold">
                    {timeToStart !== null ? (
                      <span className="text-white text-sm">
                        Pre-Launch: {formatDuration(timeToStart)} to go
                      </span>
                    ) : (
                      <span className="text-white">
                        {currentMinute} {elapsedTime > 0 && `(${formatDuration(elapsedTime)})`}
                        {isAccelerated && <span className="ml-2 text-yellow-400 text-xs">⚡ 20x</span>}
                      </span>
                    )}
                  </div>
                  {/* 20x Speed Toggle - Only show when live */}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="accelerationToggle"
                      checked={isAccelerated}
                      onChange={(e) => setIsAccelerated(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="accelerationToggle" className="text-xs text-gray-300 cursor-pointer select-none">
                      20x Speed Mode (4m 18s total)
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Buy Tax Rate */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Buy Tax Rate
              </label>
              <div className="bg-gray-800/50 p-2 rounded text-center font-semibold">
                {activeMinute > 0 ? (
                  <span className={
                    activeMinute <= 5 ? 'text-negative' : 
                    activeMinute <= 40 ? 'text-white' : 
                    'text-positive'
                  }>
                    {Math.max(10, 95 - (activeMinute - 1))}%
                  </span>
                ) : (
                  <span className="text-gray-500">N/A</span>
                )}
              </div>
            </div>

            {/* Investment in ETH */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Investment (ETH)
              </label>
              <div className="bg-gray-800/50 p-2 rounded text-center font-semibold text-white">
                {(investment / ethPrice).toFixed(4)} ETH
              </div>
            </div>

            {/* Record Button */}
            <button
              onClick={recordEntry}
              disabled={activeMinute < 1 || activeMinute > 86}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-2 rounded-lg transition disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed uppercase tracking-wide h-[42px] mt-auto"
            >
              Record Entry
            </button>
          </div>
        </div>

        {/* FULL WIDTH: Recorded Entries Table */}
        {stagedEntries.length > 0 && (
          <div className="mb-6">
            <div className="glass-card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-white uppercase tracking-wide">
                      Recorded Entries
                    </h3>
                    <div className="flex gap-3">
                      <button
                        onClick={exportToHTML}
                        className="text-sm text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition font-semibold uppercase tracking-wide"
                      >
                        Export to HTML
                      </button>
                      <button
                        onClick={exportToCSV}
                        className="text-sm text-white bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition font-semibold uppercase tracking-wide"
                      >
                        Export to CSV
                      </button>
                      <button
                        onClick={clearAllEntries}
                        className="text-sm text-negative hover:text-red-300 transition font-semibold"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-700">
                          <th className="p-3 text-center">#</th>
                          <th className="p-3 text-center">Minute</th>
                          <th className="p-3 text-center">Buy Tax</th>
                          <th className="p-3 text-center">Invest ($)</th>
                          <th className="p-3 text-center text-gray-400">Invest (ETH)</th>
                          <th className="p-3 text-center">Entry MC ($)</th>
                          <th className="p-3 text-center">Tokens</th>
                          <th className="p-3 text-center text-positive">BE Price ($)</th>
                          <th className="p-3 text-center text-positive">BE MC ($)</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stagedEntries.map((entry, index) => {
                          const handleFieldChange = (field: string, value: any) => {
                            setStagedEntries(stagedEntries.map(e => {
                              if (e.id !== entry.id) return e
                              
                              const updated = { ...e, [field]: value }
                              
                              // Auto-update buy tax when minute changes
                              if (field === 'minute') {
                                updated.buyTax = getBuyTaxRate(Number(value))
                                updated.lastEditedField = 'minuteOrMC'
                              } else if (field === 'investment' || field === 'investmentETH') {
                                // Sync USD ↔ ETH
                                if (field === 'investment') {
                                  updated.investmentETH = Number(value) / ethPrice
                                } else {
                                  updated.investment = Number(value) * ethPrice
                                }
                                updated.lastEditedField = 'investment'
                              } else if (field === 'tokensBought') {
                                updated.lastEditedField = 'tokensBought'
                              } else if (field === 'entryMC') {
                                updated.lastEditedField = 'minuteOrMC'
                              }
                              
                              return updated
                            }))
                          }
                          
                          return (
                          <tr key={entry.id} className="border-b border-gray-800 hover:bg-white/5">
                            <td className="p-3 text-center font-semibold">{index + 1}</td>
                            
                            {/* Minute */}
                            <td className="p-3 text-center">
                              {entry.isEditing ? (
                                <input
                                  type="number"
                                  value={entry.minute}
                                  onChange={(e) => handleFieldChange('minute', e.target.value)}
                                  className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center"
                                  min="1"
                                  max="86"
                                />
                              ) : entry.minute}
                            </td>
                            
                            {/* Buy Tax */}
                            <td className="p-3 text-center">
                              {entry.isEditing ? `${entry.buyTax}%` : `${entry.buyTax}%`}
                            </td>
                            
                            {/* Investment ($) */}
                            <td className="p-3 text-center">
                              {entry.isEditing ? (
                                <input
                                  type="number"
                                  value={entry.investment}
                                  onChange={(e) => handleFieldChange('investment', e.target.value)}
                                  className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1"
                                  min="10"
                                  step="10"
                                />
                              ) : `$${entry.investment.toLocaleString()}`}
                            </td>
                            
                            {/* Investment (ETH) */}
                            <td className="p-3 text-center text-gray-400">
                              {entry.isEditing ? (
                                <input
                                  type="number"
                                  value={entry.investmentETH.toFixed(4)}
                                  onChange={(e) => handleFieldChange('investmentETH', e.target.value)}
                                  className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1"
                                  step="0.0001"
                                />
                              ) : `${entry.investmentETH.toFixed(4)} ETH`}
                            </td>
                            
                            {/* Entry MC */}
                            <td className="p-3 text-center">
                              {entry.isEditing ? (
                                <input
                                  type="number"
                                  value={entry.entryMC}
                                  onChange={(e) => handleFieldChange('entryMC', e.target.value)}
                                  className="w-28 bg-gray-800 border border-gray-600 rounded px-2 py-1"
                                  min="1000"
                                  step="1000"
                                />
                              ) : `$${entry.entryMC.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                            </td>
                            
                            {/* Tokens */}
                            <td className="p-3 text-center">
                              {entry.isEditing ? (
                                <input
                                  type="number"
                                  value={entry.tokensBought}
                                  onChange={(e) => handleFieldChange('tokensBought', e.target.value)}
                                  className="w-28 bg-gray-800 border border-gray-600 rounded px-2 py-1"
                                  step="0.1"
                                />
                              ) : entry.tokensBought.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                            </td>
                            
                            {/* BE Price */}
                            <td className="p-3 text-center text-positive font-bold">
                              {formatPrice(entry.breakevenPriceFinalTax)}
                            </td>
                            
                            {/* BE MC */}
                            <td className="p-3 text-center text-positive font-bold">
                              ${entry.breakevenMCFinalTax.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </td>
                            
                            {/* Actions */}
                            <td className="p-3 text-center">
                              {entry.isEditing ? (
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => saveEdit(entry.id, entry)}
                                    className="text-xs text-positive hover:text-green-300 transition font-semibold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => cancelEdit(entry.id)}
                                    className="text-xs text-gray-400 hover:text-white transition font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => startEdit(entry.id)}
                                    className="text-xs text-white hover:text-gray-300 transition font-semibold"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteEntry(entry.id)}
                                    className="text-xs text-negative hover:text-red-300 transition font-semibold"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )})}
                      </tbody>
                      {calculateOverallBreakeven() && (
                        <tfoot className="border-t-4 border-white bg-white/5">
                          <tr className="font-bold">
                            <td colSpan={3} className="p-3 text-right text-white uppercase">Totals:</td>
                            <td className="p-3 text-center text-positive">${calculateOverallBreakeven()!.totalInvestmentUSD.toLocaleString()}</td>
                            <td className="p-3 text-center text-gray-400">{calculateOverallBreakeven()!.totalInvestmentETH.toFixed(4)} ETH</td>
                            <td className="p-3 text-center text-gray-500">—</td>
                            <td className="p-3 text-center text-white">{calculateOverallBreakeven()!.totalTokensBought.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                            <td className="p-3 text-center text-positive">{formatPrice(calculateOverallBreakeven()!.overallBEPriceUSD)}</td>
                            <td className="p-3 text-center text-positive">${calculateOverallBreakeven()!.overallBEMCUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                            <td className="p-3 text-center text-gray-500">—</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
            </div>
          </div>
        )}

        {/* FULL WIDTH: 86-Minute Simulation Table */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white uppercase tracking-wide">
              86-Minute Breakeven Simulation
            </h3>
            {activeMinute > 0 && userHasScrolled && (
              <button
                onClick={jumpToCurrentMinute}
                className="text-sm text-white bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition font-semibold uppercase tracking-wide"
              >
                Jump to Minute {activeMinute}
              </button>
            )}
          </div>
          
          <div 
            ref={tableContainerRef}
            onScroll={handleTableScroll}
            className="glass-card p-0 max-h-[700px] overflow-y-auto"
          >
            <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-900">
                      <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-700">
                        <th className="p-3 text-left sticky left-0 bg-gray-900">Min</th>
                        <th className="p-3 text-left">Buy Tax</th>
                        <th className="p-3 text-left">Proj. MC ($)</th>
                        <th className="p-3 text-left">Proj. Price ($)</th>
                        <th className="p-3 text-left text-gray-400">Proj. MC (ETH)</th>
                        <th className="p-3 text-left text-gray-400">Proj. Price (ETH)</th>
                        <th className="p-3 text-left">Tokens Bought</th>
                        <th className="p-3 text-left text-positive font-bold">BE MC ($)</th>
                        <th className="p-3 text-left text-positive font-bold">BE Price ($)</th>
                        <th className="p-3 text-left text-gray-400 font-bold">BE MC (ETH)</th>
                        <th className="p-3 text-left text-gray-400 font-bold">BE Price (ETH)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runSimulation().map((data) => {
                        const isCurrent = data.minute === activeMinute && activeMinute > 0
                        const isMinute86 = data.minute === 86
                        const isBreakevenMet = data.breakevenMC <= data.marketCap
                        
                        return (
                          <tr
                            key={data.minute}
                            className={`border-b border-gray-800 transition-colors ${
                              isMinute86 ? 'bg-white/10 border-l-4 border-white' :
                              isCurrent ? 'bg-white/5 border-l-4 border-white' :
                              'hover:bg-white/5'
                            }`}
                          >
                            <td className="p-3 font-semibold sticky left-0 bg-inherit">{data.minute}</td>
                            <td className="p-3">{data.buyTax}%</td>
                            <td className="p-3">${data.marketCap.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                            <td className="p-3">{formatPrice(data.tokenPrice)}</td>
                            <td className="p-3 text-gray-400">{formatETH(data.marketCapETH)} ETH</td>
                            <td className="p-3 text-gray-400">{formatETH(data.tokenPriceETH)} ETH</td>
                            <td className="p-3">{data.tokensBought.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                            <td className={`p-3 font-bold ${isBreakevenMet ? 'text-positive' : 'text-white'}`}>
                              ${data.breakevenMC.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              {isBreakevenMet && ' ✅'}
                            </td>
                            <td className={`p-3 font-bold ${isBreakevenMet ? 'text-positive' : 'text-white'}`}>
                              {formatPrice(data.breakevenPrice)}
                            </td>
                            <td className="p-3 text-gray-400 font-bold">
                              {formatETH(data.breakevenMCETH)} ETH
                            </td>
                            <td className="p-3 text-gray-400 font-bold">
                              {formatETH(data.breakevenPriceETH)} ETH
                            </td>
                          </tr>
                        )
                      })}
            </tbody>
          </table>
        </div>
      </div>
    </div>

        {/* Help Modal */}
        {isHelpOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsHelpOpen(false)}>
            <div className="glass-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="sticky top-0 bg-black/95 backdrop-blur-sm border-b border-white/10 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-yellow-500 uppercase tracking-wide">How to Use</h2>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="text-gray-400 hover:text-white text-3xl font-bold transition"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-8">
                {/* Parameters Section */}
                <section>
                  <h3 className="text-xl font-bold text-yellow-500 mb-4 uppercase tracking-wide border-b border-white/10 pb-2">Parameters</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Investment ($)</h4>
                      <p className="text-gray-300 leading-relaxed">The dollar amount you're planning to invest at a specific minute. Adjust this to test different investment sizes. The simulation shows how many tokens you'd get after buy tax is deducted.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Market Cap ($)</h4>
                      <p className="text-gray-300 leading-relaxed">The starting market cap at minute 1 of the launch. Set this to match the expected launch market cap and leave it. This determines the initial token price (MC ÷ 1 billion tokens).</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">MC +/Min ($)</h4>
                      <p className="text-gray-300 leading-relaxed mb-2">How much the market cap increases every minute during the 86-minute period. This models the growth rate:</p>
                      <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                        <li><span className="font-semibold">$0</span> = flat price (no growth)</li>
                        <li><span className="font-semibold">$50,000</span> = moderate growth ($50k added per minute)</li>
                        <li><span className="font-semibold">$100,000+</span> = aggressive growth</li>
                      </ul>
                      <p className="text-gray-300 leading-relaxed mt-2">Set this based on how bullish you think the launch will be, then leave it to see the full 86-minute projection.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Token Price ($)</h4>
                      <p className="text-gray-300 leading-relaxed">Auto-calculated. Shows current token price based on your Market Cap setting. You can't adjust this directly.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">ETH Price ($)</h4>
                      <p className="text-gray-300 leading-relaxed">Live price from DexScreener, updates every 30 seconds. Used to convert all USD values to ETH. You can't adjust this.</p>
                    </div>
                  </div>
                </section>

                {/* Controls Section */}
                <section>
                  <h3 className="text-xl font-bold text-yellow-500 mb-4 uppercase tracking-wide border-b border-white/10 pb-2">Controls & Functionality</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Current Minute Slider (Manual Mode)</h4>
                      <p className="text-gray-300 leading-relaxed">Manually scrub through minutes 0-86 to explore different entry points. The simulation table updates to show what happens if you enter at that specific minute.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Start Now Button</h4>
                      <p className="text-gray-300 leading-relaxed">Switches to live mode and starts a real-time countdown/timer. The current minute will automatically advance every 60 seconds (or every 3 seconds if 20x speed is enabled). Use this to simulate a live launch in real-time.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Stop Button</h4>
                      <p className="text-gray-300 leading-relaxed">Stops the live timer and returns to manual mode. Resets the current minute back to 0.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">20x Speed Mode</h4>
                      <p className="text-gray-300 leading-relaxed">Checkbox, only visible in live mode. Accelerates time so the full 86 minutes completes in ~4 minutes 18 seconds. Each real second = 20 simulated seconds.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Record Entry Button</h4>
                      <p className="text-gray-300 leading-relaxed">Takes a snapshot of your current parameters (investment amount, current minute, market cap, tokens bought, breakeven price) and saves it to the Recorded Entries table. This lets you compare multiple entry scenarios side-by-side.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Recorded Entries Table</h4>
                      <p className="text-gray-300 leading-relaxed mb-2">Displays all your saved entries with:</p>
                      <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                        <li><span className="font-semibold">Edit</span>: Modify investment, minute, or tokens for that entry</li>
                        <li><span className="font-semibold">Delete</span>: Remove that entry</li>
                        <li><span className="font-semibold">Clear All</span>: Delete all recorded entries</li>
                      </ul>
                      <p className="text-gray-300 leading-relaxed mt-2">The TOTALS row shows your overall breakeven across all entries (properly weighted, not a simple average).</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Export to HTML</h4>
                      <p className="text-gray-300 leading-relaxed">Downloads a beautifully formatted HTML report of your recorded entries with all calculations, totals, and summary statistics. Opens in any browser and can be printed or shared.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Export to CSV</h4>
                      <p className="text-gray-300 leading-relaxed">Downloads a spreadsheet-compatible CSV file with all your recorded entries, totals, and summary data. Open in Excel, Google Sheets, or any spreadsheet application for further analysis.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">86-Minute Simulation Table</h4>
                      <p className="text-gray-300 leading-relaxed mb-2">Shows the full 86-minute projection based on your current parameters. Each row displays:</p>
                      <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                        <li>Buy tax % for that minute</li>
                        <li>Projected market cap and price</li>
                        <li>Tokens you'd get with your investment amount</li>
                        <li>Breakeven price/MC needed to exit profitably (accounting for 10% sell tax)</li>
                      </ul>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
  </div>
  )
}
