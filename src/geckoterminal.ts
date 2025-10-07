/**
 * GeckoTerminal API Integration
 * Returns HARDCODED historical launch data (first 90 minutes) for strategy tokens
 * This data is from the PAST and will NEVER change - no API calls needed!
 * API Docs: https://apiguide.geckoterminal.com/
 */

import { HISTORICAL_LAUNCH_DATA } from './historicalData'

// Pool configuration for all 7 strategy tokens
const POOL_CONFIG: Record<string, { symbol: string; poolId: string; launchDate: string }> = {
  '0xc50673edb3a7b94e8cad8a7d4e0cd68864e33edf': {
    symbol: 'PNKSTR',
    poolId: '0xbdb0f9c31367485f85e691f638345f3de673a78effaff71ce34bc7ff1d54fddc',
    launchDate: '2025-09-06T16:38:11Z',
  },
  '0xb3d6e9e142a785ea8a4f0050fee73bcc3438c5c5': {
    symbol: 'PUDGYSTR',
    poolId: '0x4d40c47b13be30724b89019be0549ead71e363e50cef119a56bd64ead4e35016',
    launchDate: '2025-09-19T17:16:35Z',
  },
  '0x9ebf91b8d6ff68aa05545301a3d0984eaee54a03': {
    symbol: 'APESTR',
    poolId: '0x5f875bfcaa76bfb9f38193dd406a4c084ad2f3a91689769e9ec95fd7a7d7e8a1',
    launchDate: '2025-09-19T17:16:11Z',
  },
  '0x92cedfdbce6e87b595e4a529afa2905480368af4': {
    symbol: 'TOADSTR',
    poolId: '0x4d3ae5eb9bfc17778917672c9ba3f339aaf81013da2cb0d33ed5823b40b0b764',
    launchDate: '2025-09-27T15:00:11Z',
  },
  '0x6bcba7cd81a5f12c10ca1bf9b36761cc382658e8': {
    symbol: 'BIRBSTR',
    poolId: '0x29aceb9aea1d8f4f9ee40dfffb7e46285d69cd4e9b8999c08da265f27fd0f9a8',
    launchDate: '2025-09-19T17:16:23Z',
  },
  '0x742fd09cbbeb1ec4e3d6404dfc959a324deb50e6': {
    symbol: 'SQUIGSTR',
    poolId: '0xb0214c79008d1d71816166fbe17c01884386ccfc5560ce8b3cbb7a15dba93dce',
    launchDate: '2025-09-26T15:00:11Z',
  },
  '0x5d855d8a3090243fed9bf73999eedfbc2d1dcf21': {
    symbol: 'GOBSTR',
    poolId: '0x134060a0672f5df29449673c9b2de0dc0beed4cd5354e532f801f0a3258906f8',
    launchDate: '2025-10-06T16:00:23Z',
  },
}

const TOTAL_SUPPLY = 1_000_000_000 // All strategy tokens have 1 billion supply

// TypeScript interfaces
export interface HistoricalDataPoint {
  minute: number        // 0-89 (minutes from launch)
  timestamp: number     // Unix timestamp
  open: number          // Opening price in USD
  high: number          // Highest price in USD
  low: number           // Lowest price in USD
  close: number         // Closing price in USD
  volume: number        // Volume in USD
  marketCap: number     // Calculated market cap
}

export interface HistoricalLaunchData {
  tokenAddress: string
  tokenSymbol: string
  poolId: string
  launchTimestamp: number
  dataPoints: HistoricalDataPoint[]  // 90 data points (first 90 minutes)
  currentMarketCap: number            // Live market cap
}

// No longer need caching since data is hardcoded

/**
 * Check if token is supported (has pool configuration)
 */
export function isTokenSupported(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() in POOL_CONFIG
}

/**
 * Get pool configuration for a token
 */
function getPoolConfig(tokenAddress: string) {
  const config = POOL_CONFIG[tokenAddress.toLowerCase()]
  if (!config) {
    throw new Error(`Token ${tokenAddress} not supported`)
  }
  return config
}

/**
 * Return HARDCODED historical launch data (first 90 minutes) for strategy tokens
 * Data is COMPLETE - gaps pre-filled, exactly 90 data points (minutes 0-89)
 * No runtime processing needed!
 */
export async function fetchHistoricalLaunchData(
  tokenAddress: string
): Promise<HistoricalLaunchData | null> {
  try {
    const config = getPoolConfig(tokenAddress)
    const launchTimestamp = Math.floor(new Date(config.launchDate).getTime() / 1000)
    
    // Get HARDCODED COMPLETE data for this token (gaps already filled)
    const completeData = HISTORICAL_LAUNCH_DATA[config.symbol]
    
    if (!completeData || completeData.length === 0) {
      console.error(`No hardcoded data available for ${config.symbol}`)
      return null
    }
    
    console.log(`Loading complete historical data for ${config.symbol}...`)
    
    // Data is COMPLETE - exactly 90 data points with marketCap already calculated
    // Just use it directly!
    const dataPoints: HistoricalDataPoint[] = completeData.map(point => ({
      minute: point.minute,
      timestamp: point.timestamp,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
      marketCap: point.marketCap  // Already calculated in the hardcoded data
    }))
    
    // Fetch current market cap from DexScreener (this is the only API call we need)
    const currentMarketCap = await fetchCurrentMarketCap(tokenAddress)
    
    const result: HistoricalLaunchData = {
      tokenAddress,
      tokenSymbol: config.symbol,
      poolId: config.poolId,
      launchTimestamp,
      dataPoints,
      currentMarketCap,
    }
    
    console.log(`Loaded ${dataPoints.length} complete data points for ${config.symbol} (minutes 0-89)`)
    
    return result
  } catch (error) {
    console.error('Error loading historical launch data:', error)
    return null
  }
}

/**
 * Fetch historical launch data (no caching needed - data is hardcoded)
 */
export async function fetchLaunchDataCached(
  tokenAddress: string
): Promise<HistoricalLaunchData | null> {
  // Just return the hardcoded data directly
  // No caching needed since the data is hardcoded and never changes
  return fetchHistoricalLaunchData(tokenAddress)
}

/**
 * Fetch current market cap from existing DexScreener API
 * (Reuses the API integration already in the codebase)
 */
async function fetchCurrentMarketCap(tokenAddress: string): Promise<number> {
  try {
    // Import and use existing API function
    const { fetchCoinOverview } = await import('./api')
    const data = await fetchCoinOverview(tokenAddress)
    return data?.marketCap || 0
  } catch (error) {
    console.error('Error fetching current market cap:', error)
    return 0
  }
}

// Cache functions removed - no longer needed with hardcoded data
