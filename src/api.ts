import type { DexPair, DexScreenerTokenResponse } from './lib'

const DEX_BASE = 'https://api.dexscreener.com/latest/dex'

export async function fetchDexByTokenAddress(address: string): Promise<DexPair[] | null> {
  try {
    const url = `${DEX_BASE}/tokens/${address}`
    const res = await fetch(url, { headers: { 'accept': 'application/json' } })
    if (!res.ok) return null
    const data = (await res.json()) as DexScreenerTokenResponse
    if (!data?.pairs || data.pairs.length === 0) return null
    return data.pairs
  } catch {
    return null
  }
}

export type HeaderMetrics = {
  priceUsd: number | null
  marketCapUsd: number | null
  liquidityUsd: number | null
  volume24h: number | null
  priceChange24h: number | null
  txns24h: number | null
  buys24h: number | null
  sells24h: number | null
  buyers24h: number | null
  sellers24h: number | null
  makers24h: number | null
  buyVolume24h: number | null
  sellVolume24h: number | null
}

export async function fetchHeaderMetrics(address: string): Promise<HeaderMetrics> {
  const pairs = await fetchDexByTokenAddress(address)
  if (!pairs) {
    return { 
      priceUsd: null, marketCapUsd: null, liquidityUsd: null, volume24h: null, priceChange24h: null,
      txns24h: null, buys24h: null, sells24h: null, buyers24h: null, sellers24h: null, makers24h: null,
      buyVolume24h: null, sellVolume24h: null
    }
  }
  
  // Heuristic: choose the pair with highest USD liquidity
  const best = pairs.reduce((a, b) => ( (a?.liquidity?.usd ?? 0) >= (b?.liquidity?.usd ?? 0) ? a : b ))
  
  const price = best.priceUsd ? Number(best.priceUsd) : null
  // Prefer marketCap over fdv if available
  const marketCap = best.marketCap ? Number(best.marketCap) : (best.fdv ? Number(best.fdv) : null)
  const liquidityUsd = best.liquidity?.usd ? Number(best.liquidity.usd) : null
  const volume24h = best.volume?.h24 ? Number(best.volume.h24) : null
  const priceChange24h = best.priceChange?.h24 ? Number(best.priceChange.h24) : null
  
  // Extract transaction data if available
  const txns = best.txns?.h24
  const buys24h = txns?.buys || null
  const sells24h = txns?.sells || null
  const txns24h = (buys24h && sells24h) ? buys24h + sells24h : null
  const buyers24h = null // Not available in DexScreener API
  const sellers24h = null // Not available in DexScreener API
  const makers24h = null // Not available in DexScreener API
  
  // Not accurate - removed from display
  const buyVolume24h = null
  const sellVolume24h = null
  
  return { 
    priceUsd: price, marketCapUsd: marketCap, liquidityUsd, volume24h, priceChange24h,
    txns24h, buys24h, sells24h, buyers24h, sellers24h, makers24h, buyVolume24h, sellVolume24h
  }
}

// Simplified version for overview - just MCAP, price and 24h change
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
  
  const best = pairs.reduce((a, b) => ( (a?.liquidity?.usd ?? 0) >= (b?.liquidity?.usd ?? 0) ? a : b ))
  const marketCap = best.marketCap ? Number(best.marketCap) : (best.fdv ? Number(best.fdv) : null)
  const price = best.priceUsd ? Number(best.priceUsd) : null
  const priceChange24h = best.priceChange?.h24 ? Number(best.priceChange.h24) : null
  
  return { address, marketCap, price, priceChange24h }
}

// WETH/USDC pair on Uniswap V3 (high liquidity, reliable ETH/USD proxy)
const CHAIN_ID = 'ethereum'
const PAIR_ADDRESS = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640'

export async function fetchETHPrice(): Promise<number | null> {
  try {
    const url = `${DEX_BASE}/pairs/${CHAIN_ID}/${PAIR_ADDRESS}`
    const res = await fetch(url, { 
      headers: { 'accept': 'application/json' } 
    })
    
    if (!res.ok) {
      console.error('DexScreener API error:', res.status)
      return null
    }
    
    const data = await res.json()
    
    if (!data?.pair?.priceUsd) {
      console.error('Invalid response structure:', data)
      return null
    }
    
    const price = Number(data.pair.priceUsd)
    
    if (isNaN(price) || price <= 0) {
      console.error('Invalid price value:', data.pair.priceUsd)
      return null
    }
    
    return price
  } catch (error) {
    console.error('Failed to fetch ETH price from DexScreener:', error)
    return null
  }
}

