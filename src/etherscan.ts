/**
 * Etherscan API Integration
 * Official docs: https://docs.etherscan.io/
 * V2 API Migration: https://docs.etherscan.io/v2-migration
 */

const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/v2/api'
const ETHEREUM_MAINNET_CHAINID = '1'
const WETH_CONTRACT_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

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
  transactionCount: number // Number of transactions
  firstBuyTimestamp: number | null // Timestamp of first purchase
  lastActivityTimestamp: number | null // Timestamp of last activity
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
 * Fetch transaction receipt and parse WETH transfers from logs
 * This captures WETH spent when direct ETH value is 0
 * 
 * @param txHash - Transaction hash
 * @param walletAddress - User's wallet address
 * @returns Total WETH sent from the user's address in this transaction
 */
async function fetchWETHSpentFromLogs(
  txHash: string,
  walletAddress: string
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
    let totalWethSent = 0
    const walletLower = walletAddress.toLowerCase()

    // Parse logs for WETH Transfer events FROM the user's wallet
    for (const log of logs) {
      if (log.address.toLowerCase() === WETH_CONTRACT_ADDRESS.toLowerCase()) {
        // Check if this is a Transfer event
        if (log.topics.length >= 3 && log.topics[0] === TRANSFER_EVENT_TOPIC) {
          // topics[1] = from address, topics[2] = to address
          const fromAddress = '0x' + log.topics[1].slice(-40)
          
          if (fromAddress.toLowerCase() === walletLower) {
            // This is a WETH transfer FROM the user
            const amountHex = log.data
            const amountWei = parseInt(amountHex, 16)
            const amountEth = amountWei / 1e18
            totalWethSent += amountEth
          }
        }
      }
    }

    return totalWethSent
  } catch (error) {
    console.error(`Error fetching WETH from logs for ${txHash}:`, error)
    return 0
  }
}

/**
 * Fetch historical ETH price in USD at a specific date
 * Uses CoinGecko's free API (no key required)
 * 
 * @param timestamp - Unix timestamp
 * @returns ETH price in USD at that time
 */
async function fetchHistoricalETHPrice(timestamp: number): Promise<number> {
  try {
    // Convert timestamp to date format: DD-MM-YYYY
    const date = new Date(timestamp * 1000)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const dateStr = `${day}-${month}-${year}`

    const url = `https://api.coingecko.com/api/v3/coins/ethereum/history?date=${dateStr}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.market_data && data.market_data.current_price && data.market_data.current_price.usd) {
      return data.market_data.current_price.usd
    }

    // Fallback: use current ETH price if historical not available
    console.warn(`Could not fetch historical ETH price for ${dateStr}, using fallback`)
    return 2400 // Approximate fallback
  } catch (error) {
    console.error('Error fetching historical ETH price:', error)
    return 2400 // Fallback price
  }
}

/**
 * Calculate portfolio data from token transfers with ACCURATE entry prices
 * 
 * Logic:
 * 1. For each INCOMING transfer (buy):
 *    - Fetch full transaction details to get ETH spent
 *    - Get historical ETH price at that timestamp
 *    - Calculate USD cost = ETH spent × ETH price
 * 2. For OUTGOING transfers (sell): subtract tokens
 * 3. Calculate weighted average entry price
 * 
 * @param transfers - Array of token transfers
 * @param walletAddress - User's wallet address
 * @returns Calculated portfolio data with accurate entry prices
 */
export async function calculatePortfolioFromTransfers(
  transfers: TokenTransfer[],
  walletAddress: string
): Promise<WalletPortfolioData> {
  const walletLower = walletAddress.toLowerCase()
  
  let totalTokensBought = 0
  let totalTokensSold = 0
  let totalUSDSpent = 0
  let buyCount = 0
  let firstBuyTimestamp: number | null = null
  let lastActivityTimestamp: number | null = null

  // Cache for ETH prices by date to avoid redundant API calls
  const ethPriceCache: Map<string, number> = new Map()

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
        // Get transaction details to see ETH spent (direct transfer)
        const txDetails = await fetchTransactionDetails(transfer.hash)
        let ethSpent = 0
        
        if (txDetails && txDetails.value) {
          // Convert hex Wei to ETH
          ethSpent = parseInt(txDetails.value, 16) / 1e18
        }
        
        // If no direct ETH, check for WETH in logs
        if (ethSpent === 0) {
          const wethSpent = await fetchWETHSpentFromLogs(transfer.hash, walletAddress)
          if (wethSpent > 0) {
            ethSpent = wethSpent
            console.log(`  → Found WETH transfer: ${wethSpent.toFixed(4)} WETH`)
          }
        }
        
        // Only calculate cost if we found ETH or WETH spent
        if (ethSpent > 0) {
          // Get historical ETH price (with caching)
          const dateKey = new Date(timestamp * 1000).toDateString()
          let ethPriceUSD: number
          
          if (ethPriceCache.has(dateKey)) {
            ethPriceUSD = ethPriceCache.get(dateKey)!
          } else {
            ethPriceUSD = await fetchHistoricalETHPrice(timestamp)
            ethPriceCache.set(dateKey, ethPriceUSD)
            
            // Rate limiting: wait 300ms between CoinGecko calls to avoid hitting limits
            if (i < transfers.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300))
            }
          }
          
          // Calculate USD cost
          const usdCost = ethSpent * ethPriceUSD
          totalUSDSpent += usdCost
          
          console.log(`Buy ${buyCount}: ${tokenAmount.toFixed(2)} tokens for ${ethSpent.toFixed(4)} ETH ($${usdCost.toFixed(2)} at $${ethPriceUSD.toFixed(2)}/ETH)`)
        } else {
          console.log(`Buy ${buyCount}: ${tokenAmount.toFixed(2)} tokens - Unable to determine cost (might be airdrop/transfer)`)
        }
      } catch (error) {
        console.error(`Error processing transaction ${transfer.hash}:`, error)
      }
    }
    
    // OUTGOING: This wallet sent tokens TO someone else (sell/send)
    if (fromLower === walletLower) {
      totalTokensSold += tokenAmount
    }
  }

  const netTokens = totalTokensBought - totalTokensSold
  const avgEntryPrice = totalTokensBought > 0 ? totalUSDSpent / totalTokensBought : 0

  return {
    totalTokens: netTokens,
    avgEntryPrice,
    totalInvestedUSD: totalUSDSpent,
    transactionCount: transfers.length,
    firstBuyTimestamp,
    lastActivityTimestamp,
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
        transactionCount: 0,
        firstBuyTimestamp: null,
        lastActivityTimestamp: null,
      }
    }

    console.log(`Found ${transfers.length} token transfers. Calculating accurate entry prices...`)
    return await calculatePortfolioFromTransfers(transfers, walletAddress)
  } catch (error) {
    console.error('Error fetching wallet portfolio:', error)
    return null
  }
}

