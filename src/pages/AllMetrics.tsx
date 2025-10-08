import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { COINS, type CoinConfig } from '../components/StrategyOverview'
import { fetchDexByTokenAddress, type DexPair } from '../api'
import { fetchTokenSupply } from '../etherscan'

type MetricsData = {
  coin: CoinConfig
  pair: DexPair | null
  loading: boolean
  supply: {
    maxSupply: number
    totalSupply: number
    circulatingSupply: number
    burned: number
  } | null
}

function formatNumber(num: number | null | undefined): string {
  if (!num) return '—'
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`
  return `$${num.toFixed(2)}`
}

function formatPrice(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1) return `$${value.toFixed(4)}`
  if (value >= 0.01) return `$${value.toFixed(6)}`
  return `$${value.toFixed(8)}`
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AllMetrics() {
  const [metricsData, setMetricsData] = useState<MetricsData[]>([])

  useEffect(() => {
    let isCancelled = false

    async function loadAllMetrics() {
      const data: MetricsData[] = await Promise.all(
        COINS.map(async (coin) => {
          const pairs = await fetchDexByTokenAddress(coin.address)
          const bestPair = pairs && pairs.length > 0
            ? pairs.reduce((a, b) => ((a?.liquidity?.usd ?? 0) >= (b?.liquidity?.usd ?? 0) ? a : b))
            : null
          
          const supply = await fetchTokenSupply(coin.address)
          
          return {
            coin,
            pair: bestPair,
            supply,
            loading: false
          }
        })
      )

      if (!isCancelled) {
        // Sort by market cap (highest first)
        data.sort((a, b) => {
          const mcapA = a.pair?.marketCap ?? 0
          const mcapB = b.pair?.marketCap ?? 0
          return mcapB - mcapA
        })
        setMetricsData(data)
      }
    }

    loadAllMetrics()
    const id = setInterval(loadAllMetrics, 30_000)
    
    return () => {
      isCancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-black border-b border-gray-800 sticky top-0 z-10 backdrop-blur-xl bg-opacity-90">
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/" className="text-gray-500 hover:text-white text-sm mb-4 inline-flex items-center gap-2 transition-colors">
                <span>←</span> <span className="uppercase tracking-wider">Back to Home</span>
              </Link>
              <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-2">ALL METRICS</h1>
              <p className="text-gray-500 text-sm mt-2 uppercase tracking-wider">Live Data • Updates Every 30s</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="max-w-[1800px] mx-auto px-8 py-12">
        {metricsData.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-gray-500 text-lg uppercase tracking-wider">Loading metrics...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {metricsData.map(({ coin, pair, supply }) => (
              <div key={coin.id} className="glass-card border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all duration-300">
                {/* Token Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    {pair?.info?.imageUrl && (
                      <img 
                        src={pair.info.imageUrl} 
                        alt={coin.symbol}
                        className="w-10 h-10 rounded-full border border-gray-800"
                      />
                    )}
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight">{coin.symbol}</h2>
                      <p className="text-gray-600 text-xs">{coin.name}</p>
                    </div>
                  </div>
                  {pair && (
                    <div className="text-right">
                      <div className="text-2xl font-black tracking-tight mb-1">{formatPrice(pair.priceUsd ? Number(pair.priceUsd) : null)}</div>
                      <div className={`text-sm font-bold ${
                        pair.priceChange?.h24 && pair.priceChange.h24 >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercent(pair.priceChange?.h24)}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Links */}
                {pair && pair.url && (
                  <div className="mb-4">
                    <a
                      href={pair.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white hover:text-gray-400 transition-colors uppercase tracking-wider"
                    >
                      View on DexScreener →
                    </a>
                  </div>
                )}

                {!pair ? (
                  <div className="text-center py-16 text-gray-500 uppercase tracking-wider">No trading data available</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Market Metrics */}
                    <div className="space-y-4 bg-black/40 p-6 rounded-lg border border-gray-800">
                      <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-4">Market Metrics</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Market Cap</div>
                          <div className="text-lg font-bold">{formatNumber(pair.marketCap)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">FDV</div>
                          <div className="text-lg font-bold">{formatNumber(pair.fdv)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Liquidity</div>
                          <div className="text-lg font-bold">{formatNumber(pair.liquidity?.usd)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Pair Created</div>
                          <div className="text-sm text-gray-400">{formatDate(pair.pairCreatedAt)}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Supply Metrics */}
                    <div className="space-y-4 bg-black/40 p-6 rounded-lg border border-gray-800">
                      <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-4">Supply Metrics</h3>
                      {supply ? (
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Max Supply</div>
                            <div className="text-lg font-bold text-gray-400">
                              {supply.maxSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Burned</div>
                            <div className="text-lg font-bold text-red-400">
                              {supply.burned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Circulating</div>
                            <div className="text-lg font-bold text-green-400">
                              {supply.circulatingSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Burn Rate</div>
                            <div className="text-sm text-gray-400">
                              {((supply.burned / supply.maxSupply) * 100).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">Loading supply data...</div>
                      )}
                    </div>

                    {/* Price Changes */}
                    <div className="space-y-4 bg-black/40 p-6 rounded-lg border border-gray-800">
                      <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-4">Price Changes</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">5 Minutes</div>
                          <div className={`text-lg font-bold ${
                            pair.priceChange?.m5 && pair.priceChange.m5 >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPercent(pair.priceChange?.m5)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">1 Hour</div>
                          <div className={`text-lg font-bold ${
                            pair.priceChange?.h1 && pair.priceChange.h1 >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPercent(pair.priceChange?.h1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">6 Hours</div>
                          <div className={`text-lg font-bold ${
                            pair.priceChange?.h6 && pair.priceChange.h6 >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPercent(pair.priceChange?.h6)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">24 Hours</div>
                          <div className={`text-lg font-bold ${
                            pair.priceChange?.h24 && pair.priceChange.h24 >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPercent(pair.priceChange?.h24)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Volume */}
                    <div className="space-y-4 bg-black/40 p-6 rounded-lg border border-gray-800">
                      <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-4">Volume</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">24 Hours</div>
                          <div className="text-lg font-bold">{formatNumber(pair.volume?.h24)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">6 Hours</div>
                          <div className="text-lg font-bold">{formatNumber(pair.volume?.h6)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">1 Hour</div>
                          <div className="text-lg font-bold">{formatNumber(pair.volume?.h1)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">5 Minutes</div>
                          <div className="text-sm text-gray-400">{formatNumber(pair.volume?.m5)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Trading Activity */}
                    <div className="space-y-4 bg-black/40 p-6 rounded-lg border border-gray-800">
                      <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-4">24H Trading</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Total Txns</div>
                          <div className="text-lg font-bold">
                            {pair.txns?.h24 ? (pair.txns.h24.buys || 0) + (pair.txns.h24.sells || 0) : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Buys</div>
                          <div className="text-lg font-bold text-green-400">{pair.txns?.h24?.buys ?? '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Sells</div>
                          <div className="text-lg font-bold text-red-400">{pair.txns?.h24?.sells ?? '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Buy/Sell Ratio</div>
                          <div className="text-lg font-bold">
                            {pair.txns?.h24?.buys && pair.txns?.h24?.sells
                              ? `${(pair.txns.h24.buys / pair.txns.h24.sells).toFixed(2)}x`
                              : '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DEX Info */}
                    <div className="space-y-4 bg-black/40 p-6 rounded-lg border border-gray-800">
                      <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-4">DEX Info</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Chain</div>
                          <div className="text-lg font-bold uppercase">{pair.chainId}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">DEX</div>
                          <div className="text-lg font-bold uppercase">{pair.dexId}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Quote Token</div>
                          <div className="text-lg font-bold">{pair.quoteToken?.symbol || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Price (Native)</div>
                          <div className="text-sm text-gray-400">{pair.priceNative ? `${Number(pair.priceNative).toFixed(8)} ${pair.quoteToken?.symbol}` : '—'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Liquidity Breakdown */}
                    <div className="space-y-4 bg-black/40 p-6 rounded-lg border border-gray-800">
                      <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-4">Liquidity</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">USD Value</div>
                          <div className="text-lg font-bold">{formatNumber(pair.liquidity?.usd)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Base Token</div>
                          <div className="text-sm text-gray-400">{pair.liquidity?.base ? `${pair.liquidity.base.toLocaleString()} ${coin.symbol}` : '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Quote Token</div>
                          <div className="text-sm text-gray-400">{pair.liquidity?.quote ? `${pair.liquidity.quote.toFixed(4)} ${pair.quoteToken?.symbol}` : '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Vol/Liq Ratio</div>
                          <div className="text-lg font-bold">
                            {pair.volume?.h24 && pair.liquidity?.usd
                              ? `${(pair.volume.h24 / pair.liquidity.usd).toFixed(2)}x`
                              : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

