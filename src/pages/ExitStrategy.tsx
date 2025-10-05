import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { fetchHeaderMetrics } from '../api'
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
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
          <div className="text-gray-500">Remaining</div>
          <div className="font-medium mt-0.5">{formatNumber(calc?.remainingTokens || 0)}</div>
        </div>
        <div>
          <div className="text-gray-500">Cumulative</div>
          <div className="font-medium mt-0.5">{formatUSD(calc?.cumulativeProceeds || 0)}</div>
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

export default function ExitStrategy() {
  const [selectedCoinId, setSelectedCoinId] = useState<string>('pnkstr')
  const [holdings, setHoldings] = useState<string>('')
  const [avgEntry, setAvgEntry] = useState<string>('')
  const [exitTargets, setExitTargets] = useState<ExitTarget[]>([])

  const selectedCoin = useMemo(() => COINS.find((c) => c.id === selectedCoinId)!, [selectedCoinId])

  // Live metrics via DexScreener
  const [priceUsd, setPriceUsd] = useState<number | null>(null)
  const [marketCapUsd, setMarketCapUsd] = useState<number | null>(null)
  const [liquidityUsd, setLiquidityUsd] = useState<number | null>(null)
  const [volume24h, setVolume24h] = useState<number | null>(null)
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null)
  const [txns24h, setTxns24h] = useState<number | null>(null)
  const [buys24h, setBuys24h] = useState<number | null>(null)
  const [sells24h, setSells24h] = useState<number | null>(null)

  // Fetch selected coin detailed metrics
  useEffect(() => {
    let isCancelled = false
    async function load() {
      const res = await fetchHeaderMetrics(selectedCoin.address)
      if (!isCancelled) {
        setPriceUsd(res.priceUsd)
        setMarketCapUsd(res.marketCapUsd)
        setLiquidityUsd(res.liquidityUsd)
        setVolume24h(res.volume24h)
        setPriceChange24h(res.priceChange24h)
        setTxns24h(res.txns24h)
        setBuys24h(res.buys24h)
        setSells24h(res.sells24h)
      }
    }
    load()
    const id = setInterval(load, 30_000)
    return () => {
      isCancelled = true
      clearInterval(id)
    }
  }, [selectedCoin.address])

  const currentPrice = priceUsd ?? 0.2851
  const marketCap = marketCapUsd ?? 28_500_000
  const holdingsNum = Number(holdings) || 0
  const avgEntryNum = Number(avgEntry) || 0
  const portfolioValue = holdingsNum * currentPrice
  const unrealizedPL = avgEntryNum > 0 ? (currentPrice - avgEntryNum) * holdingsNum : 0

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

    return exitTargets.map((target) => {
      const targetValueNum = Number(target.targetValue) || 0
      const targetMcap = target.unit === 'billion' ? targetValueNum * 1_000_000_000 : targetValueNum * 1_000_000
      const impliedPrice = marketCap > 0 ? (targetMcap / marketCap) * currentPrice : 0
      const percentNum = Number(target.percentToSell) || 0
      const tokensToSell = (percentNum / 100) * remainingTokens
      const proceeds = tokensToSell * impliedPrice

      remainingTokens -= tokensToSell
      cumulativeProceeds += proceeds

      return {
        id: target.id,
        targetMcap,
        impliedPrice,
        tokensToSell,
        proceeds,
        remainingTokens,
        cumulativeProceeds,
      }
    })
  }, [exitTargets, holdingsNum, currentPrice, marketCap])

  const handlePrint = () => {
    window.print()
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
                    setBuys24h(r.buys24h)
                    setSells24h(r.sells24h)
                  })
                }}
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
              <Metric label="Buys" value={buys24h ? formatNumber(buys24h) : '—'} />
              <Metric label="Sells" value={sells24h ? formatNumber(sells24h) : '—'} />
            </div>
          </div>

          {/* Portfolio Card - Horizontal */}
          <div className="glass-card border-punk rounded-lg p-6 no-print">
            <h2 className="text-sm text-gray-500 mb-4 uppercase tracking-wider">Portfolio</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <Metric label="Portfolio Value" value={formatUSD(portfolioValue)} />
              <MetricWithColor 
                label="Unrealized P/L" 
                value={formatUSD(unrealizedPL)} 
                colorClass={unrealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}
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

            <div className="flex items-center justify-between mb-4 no-print">
              <h2 className="text-lg font-medium uppercase tracking-tight">Exit Strategy</h2>
              <div className="flex items-center gap-3">
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

            {exitTargets.length === 0 ? (
              <div className="text-center py-12 text-gray-500 no-print">
                <p>No exit targets yet.</p>
                <p className="text-sm mt-2">Click "+ Add Exit Target" to get started.</p>
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
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-400">Total Planned Proceeds</div>
                    <div className="text-lg font-medium">{formatUSD(exitCalculations[exitCalculations.length - 1]?.cumulativeProceeds || 0)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Final Tokens Remaining</div>
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
