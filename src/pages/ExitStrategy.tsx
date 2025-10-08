import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { fetchHeaderMetrics } from '../api'
import { fetchWalletPortfolio, fetchTokenSupply } from '../etherscan'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { COINS } from '../components/StrategyOverview'

type ExitTarget = {
  id: string
  targetValue: string
  unit: 'million' | 'billion'
  percentToSell: string
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 6 }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return formatUSD(value)
}

// Sortable Exit Target Component
function SortableExitTarget({ 
  target, 
  index, 
  calc, 
  onUpdate, 
  onRemove 
}: {
  target: ExitTarget
  index: number
  calc: any
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
      className="border border-gray-800 rounded-lg p-4 print-target-row"
    >
      {/* Screen version - with inputs */}
      <div className="flex items-start gap-4 mb-3 no-print">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-6 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 transition-colors"
          title="Drag to reorder"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        {/* Target Market Cap Input */}
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Target Market Cap</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={target.targetValue}
              onChange={(e) => onUpdate(target.id, 'targetValue', e.target.value)}
              placeholder="e.g. 37"
              className="flex-1 border border-gray-700 rounded-md px-3 py-1.5 bg-gray-800 text-white placeholder-gray-500 text-sm"
            />
            <select
              value={target.unit}
              onChange={(e) => onUpdate(target.id, 'unit', e.target.value)}
              className="border border-gray-700 rounded-md px-3 py-1.5 bg-gray-800 text-white text-sm"
            >
              <option value="million">Million</option>
              <option value="billion">Billion</option>
            </select>
          </div>
        </div>

        {/* Percent to Sell Input */}
        <div className="w-32">
          <label className="block text-xs text-gray-400 mb-1">% to Sell</label>
          <input
            type="number"
            value={target.percentToSell}
            onChange={(e) => onUpdate(target.id, 'percentToSell', e.target.value)}
            placeholder="e.g. 25"
            className="w-full border border-gray-700 rounded-md px-3 py-1.5 bg-gray-800 text-white placeholder-gray-500 text-sm"
          />
        </div>

        {/* Delete Button */}
        <button
          onClick={() => onRemove(target.id)}
          className="mt-5 text-gray-500 hover:text-red-500 transition-colors"
          title="Remove target"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Print version - static display */}
      <div className="hidden print:block mb-3">
        <div className="font-semibold text-base mb-1">
          Target #{index + 1}: {formatUSD(calc?.targetMcap || 0)} Market Cap
        </div>
        <div className="text-sm">Sell {target.percentToSell}% of remaining holdings</div>
      </div>

      {/* Calculated Values */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
        <div>
          <div className="text-gray-500">Implied Price</div>
          <div className="font-medium mt-0.5">{formatPrice(calc?.impliedPrice || 0)}</div>
        </div>
        <div>
          <div className="text-gray-500">Tokens to Sell</div>
          <div className="font-medium mt-0.5">{formatNumber(calc?.tokensToSell || 0)}</div>
        </div>
        <div>
          <div className="text-gray-500">Proceeds</div>
          <div className="font-medium mt-0.5">{formatUSD(calc?.proceeds || 0)}</div>
        </div>
        <div>
          <div className="text-gray-500">P/L</div>
          <div className={`font-medium mt-0.5 ${calc?.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {calc?.profitLoss >= 0 ? '+' : ''}{formatUSD(calc?.profitLoss || 0)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Remaining</div>
          <div className="font-medium mt-0.5">{formatNumber(calc?.remainingTokens || 0)}</div>
        </div>
        <div>
          <div className="text-gray-500">Cumulative P/L</div>
          <div className={`font-medium mt-0.5 ${calc?.cumulativeProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {calc?.cumulativeProfitLoss >= 0 ? '+' : ''}{formatUSD(calc?.cumulativeProfitLoss || 0)}
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric(props: { label: string; value: string }) {
  const { label, value } = props
  return (
    <div className="border border-gray-800 rounded-md p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-base font-medium">{value}</div>
    </div>
  )
}

function MetricWithColor(props: { label: string; value: string; colorClass?: string }) {
  const { label, value, colorClass = '' } = props
  return (
    <div className="border border-gray-800 rounded-md p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-base font-medium ${colorClass}`}>{value}</div>
    </div>
  )
}

// localStorage keys
const STORAGE_KEY_SELECTED_COIN = 'exitStrategy_selectedCoin'
const STORAGE_KEY_HOLDINGS = 'exitStrategy_holdings'
const STORAGE_KEY_AVG_ENTRY = 'exitStrategy_avgEntry'
const STORAGE_KEY_EXIT_TARGETS = 'exitStrategy_exitTargets'
const STORAGE_KEY_WALLET_ADDRESS = 'exitStrategy_walletAddress'

export default function ExitStrategy() {
  // Load persisted data from localStorage
  const [selectedCoinId, setSelectedCoinId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_SELECTED_COIN) || 'pnkstr'
  })
  const [holdings, setHoldings] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_HOLDINGS) || ''
  })
  const [avgEntry, setAvgEntry] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_AVG_ENTRY) || ''
  })
  const [exitTargets, setExitTargets] = useState<ExitTarget[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_EXIT_TARGETS)
    return saved ? JSON.parse(saved) : []
  })
  
  // Wallet address input
  const [walletAddress, setWalletAddress] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_WALLET_ADDRESS) || ''
  })
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false)
  const [walletError, setWalletError] = useState<string>('')
  const [walletDataErrors, setWalletDataErrors] = useState<string[]>([])
  const [walletDataWarnings, setWalletDataWarnings] = useState<string[]>([])
  const [walletPortfolioData, setWalletPortfolioData] = useState<Awaited<ReturnType<typeof fetchWalletPortfolio>> | null>(null)

  // Target MCAP for custom exit strategies
  const [targetMcapValue, setTargetMcapValue] = useState<string>('')
  const [targetMcapUnit, setTargetMcapUnit] = useState<'million' | 'billion'>('million')

  const selectedCoin = useMemo(() => COINS.find((c) => c.id === selectedCoinId)!, [selectedCoinId])

  // Live metrics via DexScreener
  const [priceUsd, setPriceUsd] = useState<number | null>(null)
  const [marketCapUsd, setMarketCapUsd] = useState<number | null>(null)
  const [liquidityUsd, setLiquidityUsd] = useState<number | null>(null)
  const [volume24h, setVolume24h] = useState<number | null>(null)
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null)
  const [tokenSupply, setTokenSupply] = useState<{
    maxSupply: number
    totalSupply: number
    circulatingSupply: number
    burned: number
    ath: {
      price: number
      date: string
      changePercentage: number
    } | null
  } | null>(null)
  const [txns24h, setTxns24h] = useState<number | null>(null)

  // Fetch selected coin detailed metrics
  useEffect(() => {
    let isCancelled = false
    async function load() {
      const res = await fetchHeaderMetrics(selectedCoin.address)
      const supply = await fetchTokenSupply(selectedCoin.address)
      if (!isCancelled) {
        setPriceUsd(res.priceUsd)
        setMarketCapUsd(res.marketCapUsd)
        setLiquidityUsd(res.liquidityUsd)
        setVolume24h(res.volume24h)
        setPriceChange24h(res.priceChange24h)
        setTxns24h(res.txns24h)
        setTokenSupply(supply)
      }
    }
    load()
    const id = setInterval(load, 30_000)
    return () => {
      isCancelled = true
      clearInterval(id)
    }
  }, [selectedCoin.address])

  // Persist data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SELECTED_COIN, selectedCoinId)
    // Clear holdings and entry when changing tokens (keep wallet address)
    setHoldings('')
    setAvgEntry('')
    setExitTargets([])
    setWalletPortfolioData(null) // Clear wallet data too
  }, [selectedCoinId])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HOLDINGS, holdings)
  }, [holdings])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AVG_ENTRY, avgEntry)
  }, [avgEntry])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXIT_TARGETS, JSON.stringify(exitTargets))
  }, [exitTargets])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WALLET_ADDRESS, walletAddress)
  }, [walletAddress])

  const currentPrice = priceUsd ?? 0.2851
  const marketCap = marketCapUsd ?? 28_500_000
  const holdingsNum = Number(holdings) || 0
  const avgEntryNum = Number(avgEntry) || 0
  const totalInvested = holdingsNum * avgEntryNum
  const portfolioValue = holdingsNum * currentPrice
  const unrealizedPL = avgEntryNum > 0 ? (currentPrice - avgEntryNum) * holdingsNum : 0
  
  // Realized P/L comes from actual sell transactions (from Etherscan API)
  const realizedPL = walletPortfolioData?.realizedProfitLoss || 0

  // Helper: Format target value with smart unit detection
  const formatTargetValue = (mcapUsd: number): { targetValue: string; unit: 'million' | 'billion' } => {
    if (mcapUsd >= 1_000_000_000) {
      return { targetValue: (mcapUsd / 1_000_000_000).toFixed(1), unit: 'billion' }
    }
    return { targetValue: (mcapUsd / 1_000_000).toFixed(1), unit: 'million' }
  }

  // Helper: Calculate evenly spaced targets between current and target MCAP
  const calculateEvenTargets = (finalMcap: number): number[] => {
    const currentMcap = marketCap
    const step = (finalMcap - currentMcap) / 4
    return [
      currentMcap + step,
      currentMcap + step * 2,
      currentMcap + step * 3,
      finalMcap,
    ]
  }

  // Preset strategy generators
  // These calculate the correct "% of remaining" to achieve full exit
  const generateConservativeStrategy = () => {
    const currentMcap = marketCap
    
    // Check if user entered a target MCAP
    let mcapTargets: number[]
    if (targetMcapValue) {
      const targetMcap = targetMcapUnit === 'billion' 
        ? Number(targetMcapValue) * 1_000_000_000 
        : Number(targetMcapValue) * 1_000_000
      mcapTargets = calculateEvenTargets(targetMcap)
    } else {
      // Use default multipliers
      mcapTargets = [currentMcap * 2, currentMcap * 3, currentMcap * 5, currentMcap * 10]
    }

    // Goal: Exit 40%, 30%, 20%, 10% of TOTAL (100% complete exit)
    // Calculation: 40% of 100, then 50% of 60, then 66.67% of 30, then 100% of 10
    const targets: ExitTarget[] = [
      { ...formatTargetValue(mcapTargets[0]), id: Date.now().toString() + '-1', percentToSell: '40' },
      { ...formatTargetValue(mcapTargets[1]), id: Date.now().toString() + '-2', percentToSell: '50' },
      { ...formatTargetValue(mcapTargets[2]), id: Date.now().toString() + '-3', percentToSell: '66.67' },
      { ...formatTargetValue(mcapTargets[3]), id: Date.now().toString() + '-4', percentToSell: '100' },
    ]
    setExitTargets(targets)
  }

  const generateBalancedStrategy = () => {
    const currentMcap = marketCap
    
    // Check if user entered a target MCAP
    let mcapTargets: number[]
    if (targetMcapValue) {
      const targetMcap = targetMcapUnit === 'billion' 
        ? Number(targetMcapValue) * 1_000_000_000 
        : Number(targetMcapValue) * 1_000_000
      mcapTargets = calculateEvenTargets(targetMcap)
    } else {
      // Use default multipliers
      mcapTargets = [currentMcap * 2, currentMcap * 5, currentMcap * 10, currentMcap * 20]
    }

    // Goal: Exit 25%, 25%, 25%, 25% of TOTAL (100% complete exit)
    // Calculation: 25% of 100, then 33.33% of 75, then 50% of 50, then 100% of 25
    const targets: ExitTarget[] = [
      { ...formatTargetValue(mcapTargets[0]), id: Date.now().toString() + '-1', percentToSell: '25' },
      { ...formatTargetValue(mcapTargets[1]), id: Date.now().toString() + '-2', percentToSell: '33.33' },
      { ...formatTargetValue(mcapTargets[2]), id: Date.now().toString() + '-3', percentToSell: '50' },
      { ...formatTargetValue(mcapTargets[3]), id: Date.now().toString() + '-4', percentToSell: '100' },
    ]
    setExitTargets(targets)
  }

  const generateRiskyStrategy = () => {
    const currentMcap = marketCap
    
    // Check if user entered a target MCAP
    let mcapTargets: number[]
    if (targetMcapValue) {
      const targetMcap = targetMcapUnit === 'billion' 
        ? Number(targetMcapValue) * 1_000_000_000 
        : Number(targetMcapValue) * 1_000_000
      mcapTargets = calculateEvenTargets(targetMcap)
    } else {
      // Use default multipliers
      mcapTargets = [currentMcap * 5, currentMcap * 10, currentMcap * 25, currentMcap * 50]
    }

    // Goal: Exit 10%, 20%, 30%, 40% of TOTAL (100% complete exit)
    // Calculation: 10% of 100, then 22.22% of 90, then 42.86% of 70, then 100% of 40
    const targets: ExitTarget[] = [
      { ...formatTargetValue(mcapTargets[0]), id: Date.now().toString() + '-1', percentToSell: '10' },
      { ...formatTargetValue(mcapTargets[1]), id: Date.now().toString() + '-2', percentToSell: '22.22' },
      { ...formatTargetValue(mcapTargets[2]), id: Date.now().toString() + '-3', percentToSell: '42.86' },
      { ...formatTargetValue(mcapTargets[3]), id: Date.now().toString() + '-4', percentToSell: '100' },
    ]
    setExitTargets(targets)
  }

  // Exit targets helpers
  const addExitTarget = () => {
    setExitTargets([...exitTargets, { id: Date.now().toString(), targetValue: '', unit: 'million', percentToSell: '' }])
  }

  const removeExitTarget = (id: string) => {
    setExitTargets(exitTargets.filter((t) => t.id !== id))
  }

  const updateExitTarget = (id: string, field: keyof ExitTarget, value: string) => {
    setExitTargets(exitTargets.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  // Calculate exit strategy table data
  const exitCalculations = useMemo(() => {
    let remainingTokens = holdingsNum
    let cumulativeProceeds = 0
    let cumulativeProfitLoss = 0
    const SELL_TAX = 0.10 // 10% sell tax on all nftstrategy.fun tokens

    return exitTargets.map((target) => {
      const targetValueNum = Number(target.targetValue) || 0
      const targetMcap = target.unit === 'billion' ? targetValueNum * 1_000_000_000 : targetValueNum * 1_000_000
      const impliedPrice = marketCap > 0 ? (targetMcap / marketCap) * currentPrice : 0
      const percentNum = Number(target.percentToSell) || 0
      const tokensToSell = (percentNum / 100) * remainingTokens
      const grossProceeds = tokensToSell * impliedPrice
      const proceeds = grossProceeds * (1 - SELL_TAX) // Account for 10% sell tax
      
      // Profit/Loss calculation: Proceeds - Cost Basis
      const costBasis = tokensToSell * avgEntryNum
      const profitLoss = proceeds - costBasis

      remainingTokens -= tokensToSell
      cumulativeProceeds += proceeds
      cumulativeProfitLoss += profitLoss

      return {
        id: target.id,
        targetMcap,
        impliedPrice,
        tokensToSell,
        proceeds,
        profitLoss,
        remainingTokens,
        cumulativeProceeds,
        cumulativeProfitLoss,
      }
    })
  }, [exitTargets, holdingsNum, currentPrice, marketCap, avgEntryNum])

  // Load wallet portfolio data from Etherscan
  const loadWalletData = async () => {
    // Validate wallet address
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      setWalletError('Invalid Ethereum address. Must be 42 characters starting with 0x.')
      return
    }

    setWalletError('')
    setWalletDataErrors([])
    setWalletDataWarnings([])
    setIsLoadingWallet(true)

    try {
      const portfolioData = await fetchWalletPortfolio(
        walletAddress,
        selectedCoin.address
      )

      if (!portfolioData) {
        setWalletError('Failed to fetch wallet data. Please try again.')
        setIsLoadingWallet(false)
        return
      }

      if (portfolioData.transactionCount === 0) {
        setWalletError('No transactions found for this wallet and token.')
        setIsLoadingWallet(false)
        return
      }

      // Capture errors and warnings from portfolio calculation
      setWalletDataErrors(portfolioData.errors || [])
      setWalletDataWarnings(portfolioData.warnings || [])

      // Auto-populate holdings and avgEntry
      setHoldings(portfolioData.totalTokens.toFixed(0))
      setAvgEntry(portfolioData.avgEntryPrice.toFixed(8))
      
      // Save portfolio data for realized P/L
      setWalletPortfolioData(portfolioData)

      setIsLoadingWallet(false)
    } catch (error) {
      console.error('Error loading wallet data:', error)
      setWalletError('An error occurred while fetching wallet data.')
      setIsLoadingWallet(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const clearAllData = () => {
    if (window.confirm('Clear all saved data? This will reset holdings, entry price, exit targets, and wallet address.')) {
      localStorage.removeItem(STORAGE_KEY_SELECTED_COIN)
      localStorage.removeItem(STORAGE_KEY_HOLDINGS)
      localStorage.removeItem(STORAGE_KEY_AVG_ENTRY)
      localStorage.removeItem(STORAGE_KEY_EXIT_TARGETS)
      localStorage.removeItem(STORAGE_KEY_WALLET_ADDRESS)
      
      setSelectedCoinId('pnkstr')
      setHoldings('')
      setAvgEntry('')
      setExitTargets([])
      setWalletAddress('')
    }
  }

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setExitTargets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header with back button */}
        <div className="mb-6 flex items-center justify-between no-print">
          <div>
            <Link to="/" className="text-gray-500 hover:text-white text-xs uppercase tracking-wider transition-colors">
              ← Back
            </Link>
            <h1 className="text-3xl md:text-4xl font-black mt-3 uppercase tracking-tight">
              EXIT STRATEGY
            </h1>
            <p className="text-xs text-gray-600 uppercase tracking-wider mt-1">
              Includes 10% Sell Tax
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-600 uppercase tracking-wider">Coin</label>
            <select
              className="border border-gray-800 rounded-md px-3 py-2 bg-black text-white text-sm hover:border-white transition-colors"
              value={selectedCoinId}
              onChange={(e) => setSelectedCoinId(e.target.value)}
            >
              {COINS.map((coin) => (
                <option key={coin.id} value={coin.id}>
                  {coin.name} ({coin.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-6">
          {/* Header Card - 8 Metrics */}
          <div className="glass-card border-punk rounded-lg p-6 no-print">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-sm text-gray-500">{selectedCoin.name} • {selectedCoin.symbol} • Ethereum</div>
                <div className="mt-1 text-xs text-gray-600">{selectedCoin.address.slice(0, 6)}...{selectedCoin.address.slice(-4)}</div>
              </div>
              <button
                className="text-sm border border-gray-800 rounded px-3 py-1 hover:border-white transition-colors"
                onClick={() => {
                  fetchHeaderMetrics(selectedCoin.address).then((r) => {
                    setPriceUsd(r.priceUsd)
                    setMarketCapUsd(r.marketCapUsd)
                    setLiquidityUsd(r.liquidityUsd)
                    setVolume24h(r.volume24h)
                    setPriceChange24h(r.priceChange24h)
                    setTxns24h(r.txns24h)
                  })
                  fetchTokenSupply(selectedCoin.address).then((supply) => {
                    setTokenSupply(supply)
                  })
                }}
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              <Metric label="Price USD" value={formatPrice(currentPrice)} />
              <Metric label="Market Cap" value={formatUSD(marketCap)} />
              <MetricWithColor 
                label="24h Change" 
                value={priceChange24h !== null ? `${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%` : '—'} 
                colorClass={priceChange24h !== null ? (priceChange24h >= 0 ? 'text-green-500' : 'text-red-500') : ''}
              />
              <Metric label="Liquidity" value={liquidityUsd ? formatCompact(liquidityUsd) : '—'} />
              <Metric label="Txns" value={txns24h ? formatNumber(txns24h) : '—'} />
              <Metric label="Volume" value={volume24h ? formatCompact(volume24h) : '—'} />
              
              {/* ATH Metrics */}
              {tokenSupply?.ath && (
                <>
                  <Metric 
                    label="ATH Price" 
                    value={`$${tokenSupply.ath.price.toFixed(tokenSupply.ath.price < 0.01 ? 6 : 4)}`} 
                  />
                  <Metric 
                    label="ATH Market Cap" 
                    value={formatCompact(tokenSupply.ath.price * tokenSupply.totalSupply)} 
                  />
                </>
              )}
            </div>
            
            {/* Link to All Metrics */}
            <div className="mb-6">
              <Link 
                to="/all-metrics" 
                className="text-xs text-gray-400 hover:text-white transition-colors uppercase tracking-wider"
              >
                View All Metrics →
              </Link>
            </div>
          </div>

          {/* Portfolio Card - Horizontal */}
          <div className="glass-card border-punk rounded-lg p-6 no-print">
            <h2 className="text-sm text-gray-500 mb-4 uppercase tracking-wider">Portfolio</h2>
            
            {/* Wallet Address Input - Auto-populate from blockchain */}
            <div className="mb-6 pb-6 border-b border-gray-800">
              <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider">
                Auto-Load from Wallet (Optional)
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter your Ethereum address (0x...)"
                  className="flex-1 border border-gray-700 rounded-md px-4 py-2 bg-gray-900 text-white placeholder-gray-600 text-sm"
                />
                <button
                  onClick={loadWalletData}
                  disabled={isLoadingWallet}
                  className="border border-gray-800 rounded-md px-6 py-2 hover:border-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingWallet ? 'Loading...' : 'Load Data'}
                </button>
              </div>
              {walletError && (
                <div className="mt-2 text-xs text-red-400">{walletError}</div>
              )}
              
              {/* Data Quality Warnings */}
              {walletDataWarnings.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded text-xs">
                  <div className="font-semibold text-yellow-400 mb-1">⚠️ Data Quality Warnings ({walletDataWarnings.length})</div>
                  <div className="text-yellow-300/80 space-y-1 max-h-32 overflow-y-auto">
                    {walletDataWarnings.slice(0, 3).map((warning, i) => (
                      <div key={i}>• {warning}</div>
                    ))}
                    {walletDataWarnings.length > 3 && (
                      <div className="text-yellow-400/60 italic">+ {walletDataWarnings.length - 3} more (check console)</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Calculation Errors */}
              {walletDataErrors.length > 0 && (
                <div className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded text-xs">
                  <div className="font-semibold text-red-400 mb-1">❌ Calculation Errors ({walletDataErrors.length})</div>
                  <div className="text-red-300/80 space-y-1 max-h-32 overflow-y-auto">
                    {walletDataErrors.slice(0, 3).map((error, i) => (
                      <div key={i}>• {error}</div>
                    ))}
                    {walletDataErrors.length > 3 && (
                      <div className="text-red-400/60 italic">+ {walletDataErrors.length - 3} more (check console)</div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-2 text-xs text-gray-600">
                Fetches your on-chain data for {selectedCoin.symbol} from Etherscan
              </div>
            </div>

            {/* Portfolio Inputs & Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="border border-gray-800 rounded-md p-3">
                <div className="text-xs text-gray-500 mb-2">Holdings</div>
                <input
                  type="number"
                  value={holdings}
                  onChange={(e) => setHoldings(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full bg-transparent border-none outline-none text-base font-medium text-white placeholder-gray-600"
                />
              </div>
              <div className="border border-gray-800 rounded-md p-3">
                <div className="text-xs text-gray-500 mb-2">Avg Entry</div>
                <input
                  type="number"
                  value={avgEntry}
                  onChange={(e) => setAvgEntry(e.target.value)}
                  placeholder="e.g. 0.10"
                  className="w-full bg-transparent border-none outline-none text-base font-medium text-white placeholder-gray-600"
                />
              </div>
              <Metric label="Total Invested" value={formatUSD(totalInvested)} />
              <Metric label="Portfolio Value" value={formatUSD(portfolioValue)} />
              <MetricWithColor 
                label="Unrealized P/L" 
                value={formatUSD(unrealizedPL)} 
                colorClass={unrealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}
              />
              <MetricWithColor 
                label="Realized P/L" 
                value={formatUSD(realizedPL)} 
                colorClass={realizedPL >= 0 ? 'text-green-500' : 'text-red-500'}
              />
            </div>
          </div>

          {/* Exit Strategy Card */}
          <div className="glass-card border-punk rounded-lg p-6 print-exit-strategy">
            {/* Print-only header */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-bold mb-2">{selectedCoin.name} ({selectedCoin.symbol}) Exit Strategy</h1>
              <div className="text-sm mb-1">Current Price: {formatPrice(currentPrice)}</div>
              <div className="text-sm mb-1">Market Cap: {formatUSD(marketCap)}</div>
              <div className="text-sm mb-1">Your Holdings: {formatNumber(holdingsNum)} {selectedCoin.symbol}</div>
              <div className="text-sm mb-1">Portfolio Value: {formatUSD(portfolioValue)}</div>
              <div className="text-sm mb-4">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
              <hr className="border-gray-300" />
            </div>

            <div className="flex items-center justify-between mb-2 no-print">
              <h2 className="text-lg font-medium uppercase tracking-tight">Exit Strategy</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearAllData}
                  className="flex items-center gap-2 border border-gray-800 rounded px-4 py-2 hover:border-red-500 hover:text-red-500 transition-colors text-sm"
                  title="Clear all saved data"
                >
                  🗑️ Clear
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 border border-gray-800 rounded px-4 py-2 hover:border-white transition-colors text-sm"
                  title="Print or save as PDF"
                >
                  📄 Print
                </button>
                <button
                  onClick={addExitTarget}
                  className="flex items-center gap-2 border border-gray-800 rounded px-4 py-2 hover:border-white transition-colors text-sm"
                >
                  <span className="text-lg leading-none">+</span> Add Exit Target
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-4 no-print">
              All proceeds calculated after 10% sell tax
            </p>

            {/* Quick Start - Preset Strategies */}
            <div className="mb-6 pb-6 border-b border-gray-800 no-print">
              <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider">
                Quick Start - Generate Strategy
              </div>
              
              {/* Optional Target MCAP Input */}
              <div className="mb-4 pb-4 border-b border-gray-800">
                <div className="text-xs text-gray-500 mb-2">
                  Ultimate Exit Target (Optional)
                </div>
                
                {/* ATH Info Display */}
                {tokenSupply?.ath && (
                  <div className="mb-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">All-Time High</div>
                        <div className="text-sm font-bold text-white">
                          ${tokenSupply.ath.price.toFixed(tokenSupply.ath.price < 0.01 ? 6 : 4)} → {formatCompact((tokenSupply.ath.price * tokenSupply.totalSupply))} MCAP
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {new Date(tokenSupply.ath.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className={`ml-2 ${tokenSupply.ath.changePercentage >= -5 ? 'text-green-400' : 'text-red-400'}`}>
                            ({tokenSupply.ath.changePercentage.toFixed(1)}% from ATH)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const athMcap = tokenSupply.ath!.price * tokenSupply.totalSupply
                          if (athMcap >= 1_000_000_000) {
                            setTargetMcapValue((athMcap / 1_000_000_000).toFixed(0))
                            setTargetMcapUnit('billion')
                          } else {
                            setTargetMcapValue((athMcap / 1_000_000).toFixed(0))
                            setTargetMcapUnit('million')
                          }
                        }}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-gray-700 rounded text-xs font-semibold text-white uppercase tracking-wider transition-colors"
                      >
                        ↑ Use ATH MCAP
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={targetMcapValue}
                    onChange={(e) => setTargetMcapValue(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-32 border border-gray-700 rounded-md px-3 py-2 bg-gray-900 text-white placeholder-gray-600 text-sm"
                  />
                  <select
                    value={targetMcapUnit}
                    onChange={(e) => setTargetMcapUnit(e.target.value as 'million' | 'billion')}
                    className="border border-gray-700 rounded-md px-3 py-2 bg-gray-900 text-white text-sm"
                  >
                    <option value="million">Million</option>
                    <option value="billion">Billion</option>
                  </select>
                  {targetMcapValue && (
                    <button
                      onClick={() => setTargetMcapValue('')}
                      className="text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <div className="text-xs text-gray-600 ml-2">
                    {targetMcapValue ? 'Targets spread evenly to your goal' : 'Leave blank for default multipliers'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={generateConservativeStrategy}
                  className="border border-gray-800 rounded-lg p-4 hover:border-white transition-colors text-left group"
                >
                  <div className="text-sm font-bold uppercase tracking-tight mb-1">Conservative</div>
                  <div className="text-xs text-gray-500 group-hover:text-gray-400">Take Profits Early</div>
                  <div className="text-xs text-gray-600 mt-2">{targetMcapValue ? 'Custom → Target' : '2x→10x'} • Front-loaded</div>
                </button>
                
                <button
                  onClick={generateBalancedStrategy}
                  className="border border-gray-800 rounded-lg p-4 hover:border-white transition-colors text-left group"
                >
                  <div className="text-sm font-bold uppercase tracking-tight mb-1">Balanced</div>
                  <div className="text-xs text-gray-500 group-hover:text-gray-400">Steady Growth</div>
                  <div className="text-xs text-gray-600 mt-2">{targetMcapValue ? 'Custom → Target' : '2x→20x'} • Even Split</div>
                </button>
                
                <button
                  onClick={generateRiskyStrategy}
                  className="border border-gray-800 rounded-lg p-4 hover:border-white transition-colors text-left group"
                >
                  <div className="text-sm font-bold uppercase tracking-tight mb-1">Risky</div>
                  <div className="text-xs text-gray-500 group-hover:text-gray-400">Let It Ride</div>
                  <div className="text-xs text-gray-600 mt-2">{targetMcapValue ? 'Custom → Target' : '5x→50x'} • Back-loaded</div>
                </button>
              </div>
            </div>

            {exitTargets.length === 0 ? (
              <div className="text-center py-12 text-gray-500 no-print">
                <p>No exit targets yet.</p>
                <p className="text-sm mt-2">Choose a preset strategy above or click "+ Add Exit Target" manually.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={exitTargets.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {exitTargets.map((target, index) => {
                      const calc = exitCalculations[index]
                      return (
                        <SortableExitTarget
                          key={target.id}
                          target={target}
                          index={index}
                          calc={calc}
                          onUpdate={updateExitTarget}
                          onRemove={removeExitTarget}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Summary Footer */}
            {exitCalculations.length > 0 && (
              <div className="border-t border-gray-800 pt-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Total Proceeds</div>
                    <div className="text-lg font-medium">{formatUSD(exitCalculations[exitCalculations.length - 1]?.cumulativeProceeds || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Total Profit/Loss</div>
                    <div className={`text-lg font-medium ${exitCalculations[exitCalculations.length - 1]?.cumulativeProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {exitCalculations[exitCalculations.length - 1]?.cumulativeProfitLoss >= 0 ? '+' : ''}
                      {formatUSD(exitCalculations[exitCalculations.length - 1]?.cumulativeProfitLoss || 0)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Tokens Remaining</div>
                    <div className="text-lg font-medium">{formatNumber(exitCalculations[exitCalculations.length - 1]?.remainingTokens || 0)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
