import { useEffect, useState } from 'react'
import { fetchCoinOverview, type CoinOverview } from '../api'

type CoinConfig = {
  id: string
  name: string
  symbol: string
  address: string
}

const COINS: CoinConfig[] = [
  { id: 'pnkstr', name: 'PunkStrategy', symbol: 'PNKSTR', address: '0xc50673edb3a7b94e8cad8a7d4e0cd68864e33edf' },
  { id: 'pudgystr', name: 'PudgyStrategy', symbol: 'PUDGYSTR', address: '0xb3d6e9e142a785ea8a4f0050fee73bcc3438c5c5' },
  { id: 'apestr', name: 'ApeStrategy', symbol: 'APESTR', address: '0x9ebf91b8d6ff68aa05545301a3d0984eaee54a03' },
  { id: 'toadstr', name: 'ToadzStrategy', symbol: 'TOADSTR', address: '0x92cedfdbce6e87b595e4a529afa2905480368af4' },
  { id: 'birbstr', name: 'BirbStrategy', symbol: 'BIRBSTR', address: '0x6bcba7cd81a5f12c10ca1bf9b36761cc382658e8' },
  { id: 'squigstr', name: 'SquiggleStrategy', symbol: 'SQUIGSTR', address: '0x742fd09cbbeb1ec4e3d6404dfc959a324deb50e6' },
]

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return `$${value.toFixed(0)}`
}

type StrategyOverviewProps = {
  onCoinSelect?: (coinId: string) => void
  selectedCoinId?: string
  showTitle?: boolean
}

export default function StrategyOverview({ 
  onCoinSelect, 
  selectedCoinId,
  showTitle = true 
}: StrategyOverviewProps) {
  const [allCoinsOverview, setAllCoinsOverview] = useState<Map<string, CoinOverview>>(new Map())

  useEffect(() => {
    let isCancelled = false
    async function loadAllCoins() {
      const results = await Promise.all(
        COINS.map(coin => fetchCoinOverview(coin.address))
      )
      if (!isCancelled) {
        const overviewMap = new Map<string, CoinOverview>()
        results.forEach(result => {
          overviewMap.set(result.address, result)
        })
        setAllCoinsOverview(overviewMap)
      }
    }
    loadAllCoins()
    const id = setInterval(loadAllCoins, 30_000)
    return () => {
      isCancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <div className="no-print">
      {showTitle && (
        <h2 className="text-sm text-gray-400 mb-4 uppercase tracking-wider">All Strategies</h2>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {COINS.map((coin) => {
          const overview = allCoinsOverview.get(coin.address)
          const isSelected = selectedCoinId === coin.id
          return (
            <button
              key={coin.id}
              onClick={() => onCoinSelect?.(coin.id)}
              className={`glass-card rounded-lg p-4 text-left transition-all duration-200 ${
                isSelected 
                  ? 'border-2 border-white' 
                  : 'border border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="text-xs font-bold mb-2 uppercase tracking-wide">{coin.symbol}</div>
              <div className="text-sm font-semibold mb-1.5">
                {overview?.marketCap ? formatCompact(overview.marketCap) : '—'}
              </div>
              <div className={`text-xs font-bold ${
                overview?.priceChange24h !== null && overview?.priceChange24h !== undefined
                  ? overview.priceChange24h >= 0 
                    ? 'text-green-400' 
                    : 'text-red-400'
                  : 'text-gray-500'
              }`}>
                {overview?.priceChange24h !== null && overview?.priceChange24h !== undefined
                  ? `${overview.priceChange24h > 0 ? '+' : ''}${overview.priceChange24h.toFixed(2)}%`
                  : '—'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { COINS }
export type { CoinConfig }

