/**
 * Etherscan API Integration
 * Official docs: https://docs.etherscan.io/
 * V2 API Migration: https://docs.etherscan.io/v2-migration
 */

// Support both Vite (import.meta.env) and Node.js (process.env) for testing
const ETHERSCAN_API_KEY = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ETHERSCAN_API_KEY) ||
  (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.VITE_ETHERSCAN_API_KEY) ||
  ''
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/v2/api'
const ETHEREUM_MAINNET_CHAINID = '1'
const WETH_CONTRACT_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// Stablecoin contract addresses for direct USD value extraction
const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f'

// Stablecoin decimals
const USDC_DECIMALS = 6
const USDT_DECIMALS = 6
const DAI_DECIMALS = 18

/**
 * ERC-20 Token Transfer Event from Etherscan API
 */
export type TokenTransfer = {
  blockNumber: string
  timeStamp: string
  hash: string
  from: string
  to: string
  value: string // Raw value in smallest unit (needs to be divided by 10^decimals)
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
  transactionIndex: string
  gas: string
  gasPrice: string
  gasUsed: string
  cumulativeGasUsed: string
  input: string
  confirmations: string
}

/**
 * Response from Etherscan tokentx endpoint
 */
type EtherscanTokenTxResponse = {
  status: string // "1" for success, "0" for error
  message: string // "OK" or error message
  result: TokenTransfer[] | string // Array of transfers or error string
}

/**
 * Full transaction details from Etherscan
 */
type EthTransaction = {
  hash: string
  from: string
  to: string
  value: string // ETH amount in hex (Wei)
  gas: string
  gasPrice: string
  blockNumber: string
  timeStamp?: string
}

/**
 * Calculated portfolio data from on-chain transactions
 */
export type WalletPortfolioData = {
  totalTokens: number // Net holdings (buys - sells)
  avgEntryPrice: number // Weighted average entry price in USD
  totalInvestedUSD: number // Total USD spent on buys
  totalReceivedUSD: number // Total USD received from sells
  realizedProfitLoss: number // Realized P/L from completed sells
  transactionCount: number // Number of transactions
  firstBuyTimestamp: number | null // Timestamp of first purchase
  lastActivityTimestamp: number | null // Timestamp of last activity
  errors: string[] // List of errors encountered during calculation
  warnings: string[] // List of warnings (e.g., missing ETH data)
}

/**
 * Fetch token supply information from CoinGecko
 * Returns max supply, current total supply (after burns), circulating supply
 */
export async function fetchTokenSupply(tokenAddress: string): Promise<{
  maxSupply: number
  totalSupply: number
  circulatingSupply: number
  burned: number
} | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress.toLowerCase()}`
    const res = await fetch(url, {
      headers: { 'accept': 'application/json' }
    })
    
    if (!res.ok) {
      console.error('CoinGecko API error:', res.status)
      return null
    }
    
    const data = await res.json()
    
    const maxSupply = data.market_data?.max_supply || 0
    const totalSupply = data.market_data?.total_supply || 0
    const circulatingSupply = data.market_data?.circulating_supply || 0
    const burned = maxSupply > 0 ? maxSupply - totalSupply : 0
    
    console.log(`Token Supply - Max: ${maxSupply.toLocaleString()}, Total: ${totalSupply.toLocaleString()}, Circulating: ${circulatingSupply.toLocaleString()}, Burned: ${burned.toLocaleString()}`)
    
    return {
      maxSupply,
      totalSupply,
      circulatingSupply,
      burned
    }
  } catch (error) {
    console.error('Error fetching token supply from CoinGecko:', error)
    return null
  }
}

/**
 * Fetch all ERC-20 token transfers for a specific address and token contract
 * 
 * Official endpoint: /v2/api?chainid=1&module=account&action=tokentx
 * Docs: https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
 * V2 API requires chainid parameter
 * 
 * @param walletAddress - User's Ethereum wallet address
 * @param tokenContractAddress - Token contract address (e.g., PNKSTR)
 * @returns Array of token transfer events
 */
export async function fetchTokenTransfers(
  walletAddress: string,
  tokenContractAddress: string
): Promise<TokenTransfer[]> {
  try {
    const url = new URL(ETHERSCAN_BASE_URL)
    url.searchParams.append('chainid', ETHEREUM_MAINNET_CHAINID) // Required for V2 API
    url.searchParams.append('module', 'account')
    url.searchParams.append('action', 'tokentx')
    url.searchParams.append('address', walletAddress)
    url.searchParams.append('contractaddress', tokenContractAddress)
    url.searchParams.append('startblock', '0')
    url.searchParams.append('endblock', '99999999')
    url.searchParams.append('sort', 'asc') // Chronological order
    url.searchParams.append('apikey', ETHERSCAN_API_KEY || '')

    const response = await fetch(url.toString())
    const data: EtherscanTokenTxResponse = await response.json()

    // Check for API errors
    if (data.status === '0') {
      console.error('Etherscan API error:', data.message)
      return []
    }

    // Check if result is a string (error) or array (success)
    if (typeof data.result === 'string') {
      console.error('Etherscan returned error:', data.result)
      return []
    }

    return data.result
  } catch (error) {
    console.error('Error fetching token transfers:', error)
    return []
  }
}

/**
 * Fetch full transaction details to get ETH value spent
 * 
 * @param txHash - Transaction hash
 * @returns Transaction details including ETH value
 */
async function fetchTransactionDetails(txHash: string): Promise<EthTransaction | null> {
  try {
    const url = new URL(ETHERSCAN_BASE_URL)
    url.searchParams.append('chainid', ETHEREUM_MAINNET_CHAINID)
    url.searchParams.append('module', 'proxy')
    url.searchParams.append('action', 'eth_getTransactionByHash')
    url.searchParams.append('txhash', txHash)
    url.searchParams.append('apikey', ETHERSCAN_API_KEY || '')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.result) {
      return data.result as EthTransaction
    }
    return null
  } catch (error) {
    console.error(`Error fetching transaction ${txHash}:`, error)
    return null
  }
}

/**
 * Extract USD value directly from stablecoin transfers in transaction logs
 * Checks for USDC, USDT, or DAI transfers to/from the wallet
 * 
 * @param txHash - Transaction hash
 * @param walletAddress - User's wallet address
 * @param direction - 'sent' for buys (stablecoin out), 'received' for sells (stablecoin in)
 * @returns USD value if stablecoin transfer found, null otherwise
 */
async function extractUSDFromLogs(
  txHash: string,
  walletAddress: string,
  direction: 'sent' | 'received'
): Promise<number | null> {
  try {
    const url = new URL(ETHERSCAN_BASE_URL)
    url.searchParams.append('chainid', ETHEREUM_MAINNET_CHAINID)
    url.searchParams.append('module', 'proxy')
    url.searchParams.append('action', 'eth_getTransactionReceipt')
    url.searchParams.append('txhash', txHash)
    url.searchParams.append('apikey', ETHERSCAN_API_KEY || '')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (!data.result || !data.result.logs) {
      return null
    }

    const logs = data.result.logs
    const walletLower = walletAddress.toLowerCase()
    let totalUSD = 0

    // Parse logs for stablecoin Transfer events
    for (const log of logs) {
      const logAddress = log.address.toLowerCase()
      
      // Check if this is a stablecoin we recognize
      let decimals: number | null = null
      if (logAddress === USDC_ADDRESS.toLowerCase()) decimals = USDC_DECIMALS
      else if (logAddress === USDT_ADDRESS.toLowerCase()) decimals = USDT_DECIMALS
      else if (logAddress === DAI_ADDRESS.toLowerCase()) decimals = DAI_DECIMALS
      
      if (decimals !== null && log.topics.length >= 3 && log.topics[0] === TRANSFER_EVENT_TOPIC) {
        // topics[1] = from address, topics[2] = to address
        const fromAddress = '0x' + log.topics[1].slice(-40)
        const toAddress = '0x' + log.topics[2].slice(-40)
        
        // Check based on direction
        const isMatch = direction === 'sent'
          ? fromAddress.toLowerCase() === walletLower
          : toAddress.toLowerCase() === walletLower
        
        if (isMatch) {
          const amountHex = log.data
          const amountRaw = parseInt(amountHex, 16)
          const usdValue = amountRaw / Math.pow(10, decimals)
          totalUSD += usdValue
        }
      }
    }

    return totalUSD > 0 ? totalUSD : null
  } catch (error) {
    console.error(`Error extracting USD from logs for ${txHash}:`, error)
    return null
  }
}

/**
 * Fetch transaction receipt and parse WETH/ETH transfers from logs
 * UNIFIED function to handle both sent (buys) and received (sells)
 * 
 * @param txHash - Transaction hash
 * @param walletAddress - User's wallet address
 * @param direction - 'sent' for buys (WETH out), 'received' for sells (WETH in)
 * @returns Total WETH sent or received by the wallet in this transaction
 */
async function fetchWETHFromLogs(
  txHash: string,
  walletAddress: string,
  direction: 'sent' | 'received'
): Promise<number> {
  try {
    const url = new URL(ETHERSCAN_BASE_URL)
    url.searchParams.append('chainid', ETHEREUM_MAINNET_CHAINID)
    url.searchParams.append('module', 'proxy')
    url.searchParams.append('action', 'eth_getTransactionReceipt')
    url.searchParams.append('txhash', txHash)
    url.searchParams.append('apikey', ETHERSCAN_API_KEY || '')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (!data.result || !data.result.logs) {
      return 0
    }

    const logs = data.result.logs
    let totalWeth = 0
    const walletLower = walletAddress.toLowerCase()

    // Parse logs for WETH Transfer events
    for (const log of logs) {
      if (log.address.toLowerCase() === WETH_CONTRACT_ADDRESS.toLowerCase()) {
        // Check if this is a Transfer event
        if (log.topics.length >= 3 && log.topics[0] === TRANSFER_EVENT_TOPIC) {
          // topics[1] = from address, topics[2] = to address
          const fromAddress = '0x' + log.topics[1].slice(-40)
          const toAddress = '0x' + log.topics[2].slice(-40)
          
          // Check based on direction
          const isMatch = direction === 'sent'
            ? fromAddress.toLowerCase() === walletLower
            : toAddress.toLowerCase() === walletLower
          
          if (isMatch) {
            const amountHex = log.data
            const amountWei = parseInt(amountHex, 16)
            const amountEth = amountWei / 1e18
            totalWeth += amountEth
          }
        }
      }
    }

    return totalWeth
  } catch (error) {
    console.error(`Error fetching WETH from logs for ${txHash} (${direction}):`, error)
    return 0
  }
}

// localStorage key for ETH price cache
const ETH_PRICE_CACHE_KEY = 'etherscan_eth_price_cache'

/**
 * Get ETH price from localStorage cache
 */
function getETHPriceFromCache(dateStr: string): number | null {
  try {
    const cacheStr = localStorage.getItem(ETH_PRICE_CACHE_KEY)
    if (!cacheStr) return null
    
    const cache = JSON.parse(cacheStr) as Record<string, number>
    return cache[dateStr] || null
  } catch (error) {
    console.error('Error reading ETH price cache:', error)
    return null
  }
}

/**
 * Save ETH price to localStorage cache
 */
function setETHPriceInCache(dateStr: string, price: number): void {
  try {
    const cacheStr = localStorage.getItem(ETH_PRICE_CACHE_KEY)
    const cache = cacheStr ? JSON.parse(cacheStr) : {}
    
    cache[dateStr] = price
    localStorage.setItem(ETH_PRICE_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Error saving ETH price to cache:', error)
  }
}

/**
 * Fetch historical ETH price from CoinGecko for a specific date
 * Uses CoinGecko's /coins/ethereum/history endpoint
 * 
 * @param dateStr - Date in DD-MM-YYYY format (CoinGecko format)
 * @param retryCount - Number of retries attempted
 * @returns ETH price in USD, or null if failed
 */
async function fetchHistoricalETHPriceFromCoinGecko(
  dateStr: string,
  retryCount: number = 0
): Promise<number | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/ethereum/history?date=${dateStr}`
    const response = await fetch(url)
    
    // Handle rate limiting
    if (response.status === 429) {
      if (retryCount < 3) {
        const waitTime = 2000 * (retryCount + 1) // 2s, 4s, 6s
        console.warn(`⚠️ Rate limited, waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return fetchHistoricalETHPriceFromCoinGecko(dateStr, retryCount + 1)
      }
      console.error('Rate limit exceeded after 3 retries')
      return null
    }
    
    const data = await response.json()
    
    if (data.market_data && data.market_data.current_price && data.market_data.current_price.usd) {
      return data.market_data.current_price.usd
    }
    
    console.warn(`Could not fetch ETH price for ${dateStr}`)
    return null
  } catch (error) {
    console.error(`Error fetching ETH price for ${dateStr}:`, error)
    return null
  }
}

/**
 * Batch fetch historical ETH prices for multiple dates
 * Checks localStorage cache first, only fetches missing dates
 * 
 * @param timestamps - Array of Unix timestamps
 * @returns Map of YYYY-MM-DD -> price
 */
async function batchFetchHistoricalETHPrices(
  timestamps: number[]
): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>()
  
  // Extract unique dates
  const uniqueDates = new Set<string>()
  const dateToTimestamp = new Map<string, number>()
  
  for (const timestamp of timestamps) {
    const date = new Date(timestamp * 1000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`
    
    uniqueDates.add(dateKey)
    dateToTimestamp.set(dateKey, timestamp)
  }
  
  console.log(`📅 Need ETH prices for ${uniqueDates.size} unique dates`)
  
  // Check cache first
  const datesToFetch: string[] = []
  let cacheHits = 0
  
  for (const dateKey of uniqueDates) {
    const cachedPrice = getETHPriceFromCache(dateKey)
    if (cachedPrice) {
      priceMap.set(dateKey, cachedPrice)
      cacheHits++
    } else {
      datesToFetch.push(dateKey)
    }
  }
  
  console.log(`💾 Cache hits: ${cacheHits}/${uniqueDates.size}`)
  
  if (datesToFetch.length > 0) {
    console.log(`🌐 Fetching ${datesToFetch.length} prices from CoinGecko...`)
    
    // Fetch missing dates with delays
    for (let i = 0; i < datesToFetch.length; i++) {
      const dateKey = datesToFetch[i]
      const date = new Date(dateToTimestamp.get(dateKey)! * 1000)
      
      // Convert to CoinGecko format (DD-MM-YYYY)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      const coinGeckoDate = `${day}-${month}-${year}`
      
      console.log(`  Fetching ${dateKey} (${i + 1}/${datesToFetch.length})...`)
      
      const price = await fetchHistoricalETHPriceFromCoinGecko(coinGeckoDate)
      
      if (price) {
        priceMap.set(dateKey, price)
        setETHPriceInCache(dateKey, price)
        console.log(`  ✅ ${dateKey}: $${price.toFixed(2)}`)
      } else {
        console.warn(`  ❌ ${dateKey}: Failed to fetch, using fallback`)
        priceMap.set(dateKey, 2400) // Fallback
      }
      
      // Rate limiting: wait 1.5 seconds between calls (except last one)
      if (i < datesToFetch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    }
  }
  
  return priceMap
}

/**
 * Get ETH price for a specific timestamp from the price map
 * 
 * @param timestamp - Unix timestamp
 * @param priceMap - Map of YYYY-MM-DD -> price
 * @returns ETH price at that date
 */
function getETHPriceAtTimestamp(
  timestamp: number,
  priceMap: Map<string, number>
): number {
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateKey = `${year}-${month}-${day}`
  
  const price = priceMap.get(dateKey)
  if (price) {
    return price
  }
  
  console.warn(`No ETH price found for ${dateKey}, using fallback`)
  return 2400 // Fallback
}

/**
 * Fetch internal transactions (ETH transfers within contract calls)
 * This captures ETH received from DEX router swaps
 * 
 * @param walletAddress - User's wallet address  
 * @param startBlock - Starting block number
 * @param endBlock - Ending block number
 * @returns Array of internal transactions
 */
async function fetchInternalTransactions(
  walletAddress: string,
  startBlock: string,
  endBlock: string
): Promise<any[]> {
  try {
    const url = new URL(ETHERSCAN_BASE_URL)
    url.searchParams.append('chainid', ETHEREUM_MAINNET_CHAINID)
    url.searchParams.append('module', 'account')
    url.searchParams.append('action', 'txlistinternal')
    url.searchParams.append('address', walletAddress)
    url.searchParams.append('startblock', startBlock)
    url.searchParams.append('endblock', endBlock)
    url.searchParams.append('sort', 'asc')
    url.searchParams.append('apikey', ETHERSCAN_API_KEY || '')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === '0') {
      return []
    }

    return data.result || []
  } catch (error) {
    console.error('Error fetching internal transactions:', error)
    return []
  }
}


/**
 * Calculate portfolio data from token transfers with ACCURATE entry prices AND realized P/L
 * 
 * Logic:
 * 1. For each INCOMING transfer (buy):
 *    - Fetch full transaction details to get ETH spent
 *    - Get historical ETH price at that timestamp
 *    - Calculate USD cost = ETH spent × ETH price
 * 2. For OUTGOING transfers (sell):
 *    - Fetch ETH received from the sell
 *    - Get historical ETH price at that timestamp
 *    - Calculate USD received = ETH received × ETH price
 *    - Calculate cost basis of sold tokens using avg entry
 *    - Track realized P/L
 * 3. Calculate weighted average entry price
 * 
 * @param transfers - Array of token transfers
 * @param walletAddress - User's wallet address
 * @returns Calculated portfolio data with accurate entry prices and realized P/L
 */
export async function calculatePortfolioFromTransfers(
  transfers: TokenTransfer[],
  walletAddress: string
): Promise<WalletPortfolioData> {
  // Create unique calculation ID for tracking/debugging
  const calcId = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}_${Date.now()}`
  const startTime = Date.now()
  
  console.log(`\n🔍 [${calcId}] Starting portfolio calculation`)
  console.log(`📊 Processing ${transfers.length} transfers`)
  
  const walletLower = walletAddress.toLowerCase()
  
  let totalTokensBought = 0
  let totalTokensSold = 0
  let totalUSDSpent = 0
  let totalUSDReceived = 0
  let buyCount = 0
  let sellCount = 0
  let firstBuyTimestamp: number | null = null
  let lastActivityTimestamp: number | null = null

  // Error and warning tracking
  const errors: string[] = []
  const warnings: string[] = []

  // Early return if no transfers
  if (transfers.length === 0) {
    return {
      totalTokens: 0,
      avgEntryPrice: 0,
      totalInvestedUSD: 0,
      totalReceivedUSD: 0,
      realizedProfitLoss: 0,
      transactionCount: 0,
      firstBuyTimestamp: null,
      lastActivityTimestamp: null,
      errors: [],
      warnings: [],
    }
  }

  // Extract all timestamps for batch price fetching
  const timestamps = transfers.map(t => parseInt(t.timeStamp))
  
  // Batch fetch historical ETH prices (uses cache, only fetches missing dates)
  const ethPriceMap = await batchFetchHistoricalETHPrices(timestamps)

  // Fetch internal transactions to capture ETH received from sells
  const firstBlock = transfers.length > 0 ? transfers[0].blockNumber : '0'
  const lastBlock = transfers.length > 0 ? transfers[transfers.length - 1].blockNumber : '99999999'
  
  console.log(`Fetching internal transactions from block ${firstBlock} to ${lastBlock}...`)
  const internalTxs = await fetchInternalTransactions(walletAddress, firstBlock, lastBlock)
  console.log(`Found ${internalTxs.length} internal ETH transfers`)
  
  // Build map of txHash -> ETH received (from internal transactions)
  const ethReceivedByTx = new Map<string, number>()
  for (const itx of internalTxs) {
    if (itx.to.toLowerCase() === walletLower && itx.value) {
      const ethAmount = parseInt(itx.value) / 1e18
      const existing = ethReceivedByTx.get(itx.hash) || 0
      ethReceivedByTx.set(itx.hash, existing + ethAmount)
    }
  }

  // Process each transfer with rate limiting to respect API limits
  for (let i = 0; i < transfers.length; i++) {
    const transfer = transfers[i]
    const fromLower = transfer.from.toLowerCase()
    const toLower = transfer.to.toLowerCase()
    const decimals = parseInt(transfer.tokenDecimal)
    const tokenAmount = parseFloat(transfer.value) / Math.pow(10, decimals)
    const timestamp = parseInt(transfer.timeStamp)

    // Update last activity
    if (!lastActivityTimestamp || timestamp > lastActivityTimestamp) {
      lastActivityTimestamp = timestamp
    }

    // INCOMING: Someone sent tokens TO this wallet (buy/receive)
    if (toLower === walletLower) {
      totalTokensBought += tokenAmount
      buyCount++
      
      // Track first buy
      if (!firstBuyTimestamp || timestamp < firstBuyTimestamp) {
        firstBuyTimestamp = timestamp
      }

      try {
        // PRIORITY 1: Try to extract USD value directly from stablecoin transfers
        const usdFromStablecoin = await extractUSDFromLogs(transfer.hash, walletAddress, 'sent')
        
        if (usdFromStablecoin) {
          // Found stablecoin transfer - use exact USD value!
          totalUSDSpent += usdFromStablecoin
          console.log(`Buy ${buyCount}: ${tokenAmount.toFixed(2)} tokens for $${usdFromStablecoin.toFixed(2)} (stablecoin swap)`)
        } else {
          // PRIORITY 2: No stablecoin - calculate from ETH spent
          const txDetails = await fetchTransactionDetails(transfer.hash)
          let ethSpent = 0
          
          if (txDetails && txDetails.value) {
            // Convert hex Wei to ETH
            ethSpent = parseInt(txDetails.value, 16) / 1e18
          }
          
          // If no direct ETH, check for WETH in logs
          if (ethSpent === 0) {
            const wethSpent = await fetchWETHFromLogs(transfer.hash, walletAddress, 'sent')
            if (wethSpent > 0) {
              ethSpent = wethSpent
              console.log(`  → Found WETH transfer: ${wethSpent.toFixed(4)} WETH`)
            }
          }
          
          // Calculate USD cost using historical ETH price at transaction time
          if (ethSpent > 0) {
            const ethPriceUSD = getETHPriceAtTimestamp(timestamp, ethPriceMap)
            const usdCost = ethSpent * ethPriceUSD
            totalUSDSpent += usdCost
            console.log(`Buy ${buyCount}: ${tokenAmount.toFixed(2)} tokens for ${ethSpent.toFixed(4)} ETH ($${usdCost.toFixed(2)} at $${ethPriceUSD.toFixed(2)}/ETH)`)
          } else {
            const warningMsg = `Buy ${buyCount} (${transfer.hash}): Unable to determine cost - might be airdrop/transfer`
            warnings.push(warningMsg)
            console.log(`Buy ${buyCount}: ${tokenAmount.toFixed(2)} tokens - Unable to determine cost (might be airdrop/transfer)`)
          }
        }
      } catch (error) {
        const errorMsg = `Error processing BUY transaction ${transfer.hash}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(errorMsg)
        console.error(`Error processing transaction ${transfer.hash}:`, error)
      }
    }
    
    // OUTGOING: This wallet sent tokens TO someone else (sell/send)
    if (fromLower === walletLower) {
      totalTokensSold += tokenAmount
      sellCount++

      try {
        // PRIORITY 1: Try to extract USD value directly from stablecoin transfers
        const usdFromStablecoin = await extractUSDFromLogs(transfer.hash, walletAddress, 'received')
        
        if (usdFromStablecoin) {
          // Found stablecoin transfer - use exact USD value!
          totalUSDReceived += usdFromStablecoin
          console.log(`Sell ${sellCount}: ${tokenAmount.toFixed(2)} tokens for $${usdFromStablecoin.toFixed(2)} (stablecoin swap)`)
        } else {
          // PRIORITY 2: No stablecoin - calculate from ETH received
          // Check internal transactions first (most common for DEX sells)
          let ethReceived = ethReceivedByTx.get(transfer.hash) || 0
          
          // If no internal tx, try WETH in logs
          if (ethReceived === 0) {
            ethReceived = await fetchWETHFromLogs(transfer.hash, walletAddress, 'received')
          }
          
          // Calculate USD received using historical ETH price at transaction time
          if (ethReceived > 0) {
            const ethPriceUSD = getETHPriceAtTimestamp(timestamp, ethPriceMap)
            const usdReceived = ethReceived * ethPriceUSD
            totalUSDReceived += usdReceived
            console.log(`Sell ${sellCount}: ${tokenAmount.toFixed(2)} tokens for ${ethReceived.toFixed(4)} ETH ($${usdReceived.toFixed(2)} at $${ethPriceUSD.toFixed(2)}/ETH)`)
          } else {
            const warningMsg = `Sell ${sellCount} (${transfer.hash}): Unable to determine proceeds - might be transfer/gift`
            warnings.push(warningMsg)
            console.log(`Sell ${sellCount}: ${tokenAmount.toFixed(2)} tokens - Unable to determine proceeds (might be transfer/gift)`)
          }
        }
      } catch (error) {
        const errorMsg = `Error processing SELL transaction ${transfer.hash}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(errorMsg)
        console.error(`Error processing sell transaction ${transfer.hash}:`, error)
      }
    }
  }

  const netTokens = totalTokensBought - totalTokensSold
  const avgEntryPrice = totalTokensBought > 0 ? totalUSDSpent / totalTokensBought : 0
  
  // Calculate realized P/L
  // For sold tokens: compare what we received vs what we spent (cost basis)
  const costBasisOfSoldTokens = totalTokensSold * avgEntryPrice
  const realizedProfitLoss = totalUSDReceived - costBasisOfSoldTokens

  // ====== DATA VALIDATION ======
  // Catch impossible values that indicate calculation errors
  
  // Validate: Net tokens shouldn't be negative (more sells than buys)
  if (netTokens < -0.0001) {
    warnings.push(`Negative holdings detected: ${netTokens.toFixed(2)} tokens (sold more than bought?)`)
  }
  
  // Validate: Average entry price should be reasonable (not $0 or extremely high)
  if (avgEntryPrice > 0 && (avgEntryPrice < 0.000001 || avgEntryPrice > 1000000)) {
    warnings.push(`Unusual avg entry price: $${avgEntryPrice.toFixed(8)} (might indicate data issue)`)
  }
  
  // Validate: Total invested shouldn't be negative
  if (totalUSDSpent < 0) {
    errors.push(`Negative total invested: $${totalUSDSpent.toFixed(2)} (calculation error!)`)
  }
  
  // Validate: Total received shouldn't be negative
  if (totalUSDReceived < 0) {
    errors.push(`Negative total received: $${totalUSDReceived.toFixed(2)} (calculation error!)`)
  }
  
  // Validate: Buy/sell counts should match transaction direction
  if (buyCount === 0 && totalTokensBought > 0) {
    warnings.push(`Tokens bought (${totalTokensBought.toFixed(2)}) but no buy transactions counted`)
  }
  if (sellCount === 0 && totalTokensSold > 0) {
    warnings.push(`Tokens sold (${totalTokensSold.toFixed(2)}) but no sell transactions counted`)
  }
  
  // Validate: Consistency check
  if (totalTokensBought > 0 && totalUSDSpent === 0) {
    warnings.push(`Bought ${totalTokensBought.toFixed(2)} tokens but $0 spent (airdrops/transfers only?)`)
  }
  if (totalTokensSold > 0 && totalUSDReceived === 0) {
    warnings.push(`Sold ${totalTokensSold.toFixed(2)} tokens but $0 received (gifts/burns only?)`)
  }

  // Log summary of any issues
  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} error(s) during calculation:`, errors)
  }
  if (warnings.length > 0) {
    console.warn(`⚠️ ${warnings.length} warning(s) during calculation:`, warnings)
  }

  // Log calculation summary for debugging
  const duration = Date.now() - startTime
  console.log(`\n✅ [${calcId}] Calculation complete in ${duration}ms`)
  console.log(`📈 Results:`)
  console.log(`   • Total Tokens: ${netTokens.toFixed(2)}`)
  console.log(`   • Avg Entry: $${avgEntryPrice.toFixed(8)}`)
  console.log(`   • Total Invested: $${totalUSDSpent.toFixed(2)}`)
  console.log(`   • Total Received: $${totalUSDReceived.toFixed(2)}`)
  console.log(`   • Realized P/L: $${realizedProfitLoss.toFixed(2)}`)
  console.log(`   • Transactions: ${transfers.length} (${buyCount} buys, ${sellCount} sells)`)
  console.log(`   • Historical ETH Prices: ${ethPriceMap.size} days loaded`)
  console.log(`   • Errors: ${errors.length}, Warnings: ${warnings.length}`)

  return {
    totalTokens: netTokens,
    avgEntryPrice,
    totalInvestedUSD: totalUSDSpent,
    totalReceivedUSD: totalUSDReceived,
    realizedProfitLoss,
    transactionCount: transfers.length,
    firstBuyTimestamp,
    lastActivityTimestamp,
    errors,
    warnings,
  }
}

/**
 * Fetch and calculate complete portfolio data for a wallet + token
 * WITH ACCURATE ENTRY PRICES based on actual ETH spent and historical prices
 * 
 * @param walletAddress - User's Ethereum wallet address
 * @param tokenContractAddress - Token contract address
 * @returns Calculated portfolio data or null if error
 */
export async function fetchWalletPortfolio(
  walletAddress: string,
  tokenContractAddress: string
): Promise<WalletPortfolioData | null> {
  try {
    console.log(`Fetching portfolio data for ${walletAddress}...`)
    const transfers = await fetchTokenTransfers(walletAddress, tokenContractAddress)
    
    if (transfers.length === 0) {
      console.log('No transactions found for this wallet + token')
      return {
        totalTokens: 0,
        avgEntryPrice: 0,
        totalInvestedUSD: 0,
        totalReceivedUSD: 0,
        realizedProfitLoss: 0,
        transactionCount: 0,
        firstBuyTimestamp: null,
        lastActivityTimestamp: null,
        errors: [],
        warnings: [],
      }
    }

    console.log(`Found ${transfers.length} token transfers. Calculating accurate entry prices...`)
    return await calculatePortfolioFromTransfers(transfers, walletAddress)
  } catch (error) {
    console.error('Error fetching wallet portfolio:', error)
    return null
  }
}

