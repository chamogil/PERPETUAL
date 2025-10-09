/**
 * Complete P&L Analysis: ETH Flow + Current Token Holdings
 * 
 * Calculates TRUE P&L including:
 * - ETH received/sent (funding/spending)
 * - Current value of all token holdings
 * - Unrealized gains/losses
 * 
 * Usage:
 * VITE_ETHERSCAN_API_KEY=your_key npx tsx test-complete-pnl.ts
 */

// Etherscan API configuration
const ETHERSCAN_API_KEY = process.env.VITE_ETHERSCAN_API_KEY || ''
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/v2/api'
const ETHEREUM_MAINNET_CHAINID = '1'

// DexScreener API
const DEX_BASE = 'https://api.dexscreener.com/latest/dex'

// Time window: last 2 weeks
const TWO_WEEKS_AGO = Math.floor(Date.now() / 1000) - (14 * 24 * 60 * 60)
const NOW = Math.floor(Date.now() / 1000)

// Wallet addresses
const WALLET_1 = '0xcB920fd68a2C92Be7B2a23ABBF87C20c29604bAb'
const WALLET_2 = '0xD9C17167C4f8daF589c38217020aEe2fAC96d569'

// Known scam/spam tokens to exclude (lowercase addresses)
const SCAM_TOKENS = new Set([
  '0x4aac18de824ec1b553dbf342829834e4ff3f7a9f', // AICC scam token
  '0xb7f7f6c52f2e2fdb1963eab30438024864c313f6', // Wrapped Bitcoin (fake)
])

// Known scam/spam token symbols to exclude
const SCAM_SYMBOLS = new Set([
  'AICC',
  'WETH', // Fake wrapped ETH
  'LUNA 2.0 (lunav2.io)',
  'GemAirdrop.xyz',
  'LOOKSDROP.COM',
  '[sodefi.tech] Visit and claim rewards',
  'Blur Pool',
  'Stars',
  'XMOVE',
  'ETHG',
  'ZIK',
  'THINK',
  'XENA',
  'SUPERX',
  'ERCAI',
])

/**
 * Historical ETH prices (daily closing prices from Sep 18 - Oct 8, 2025)
 */
const ETH_HISTORICAL_PRICES: Record<string, number> = {
  '2025-09-18': 4589.92,
  '2025-09-19': 4470.92,
  '2025-09-20': 4482.27,
  '2025-09-21': 4451.33,
  '2025-09-22': 4202.88,
  '2025-09-23': 4165.50,
  '2025-09-24': 4153.47,
  '2025-09-25': 3868.33,
  '2025-09-26': 4035.89,
  '2025-09-27': 4018.66,
  '2025-09-28': 4141.48,
  '2025-09-29': 4217.34,
  '2025-09-30': 4145.96,
  '2025-10-01': 4351.11,
  '2025-10-02': 4487.92,
  '2025-10-03': 4514.87,
  '2025-10-04': 4489.20,
  '2025-10-05': 4515.42,
  '2025-10-06': 4687.77,
  '2025-10-07': 4451.15,
  '2025-10-08': 4488.87,
}

interface Transaction {
  hash: string
  timeStamp: string
  from: string
  to: string
  value: string
  gasUsed?: string
  gasPrice?: string
}

interface TokenTransfer {
  hash: string
  timeStamp: string
  from: string
  to: string
  value: string
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
  contractAddress: string
}

interface TokenHolding {
  address: string
  symbol: string
  name: string
  balance: number
  decimals: number
  priceUsd: number | null
  valueUsd: number
}

interface NFTHolding {
  contractAddress: string
  tokenId: string
  name: string
  collectionName: string
  floorPriceETH: number | null
  floorPriceUSD: number
}

interface WalletAnalysis {
  address: string
  ethReceived: number
  ethSent: number
  ethGasFees: number
  ethReceivedUSD: number
  ethSentUSD: number
  gasFeeUSD: number
  netETHFlowUSD: number
  tokenHoldings: TokenHolding[]
  totalTokenValueUSD: number
  nftHoldings: NFTHolding[]
  totalNFTValueUSD: number
  trueNetPositionUSD: number
}

/**
 * Get ETH price for a timestamp
 */
function getETHPriceAtTimestamp(timestamp: number): number {
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateKey = `${year}-${month}-${day}`
  
  return ETH_HISTORICAL_PRICES[dateKey] || 4400
}

/**
 * Fetch current ETH balance
 */
async function fetchETHBalance(walletAddress: string): Promise<number> {
  try {
    const url = new URL(ETHERSCAN_BASE_URL)
    url.searchParams.append('chainid', ETHEREUM_MAINNET_CHAINID)
    url.searchParams.append('module', 'account')
    url.searchParams.append('action', 'balance')
    url.searchParams.append('address', walletAddress)
    url.searchParams.append('tag', 'latest')
    url.searchParams.append('apikey', ETHERSCAN_API_KEY)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === '1' && data.result) {
      return parseInt(data.result) / 1e18
    }
    return 0
  } catch (error) {
    console.error('Error fetching ETH balance:', error)
    return 0
  }
}

/**
 * Fetch normal ETH transactions
 */
async function fetchNormalTransactions(walletAddress: string): Promise<Transaction[]> {
  try {
    const url = new URL(ETHERSCAN_BASE_URL)
    url.searchParams.append('chainid', ETHEREUM_MAINNET_CHAINID)
    url.searchParams.append('module', 'account')
    url.searchParams.append('action', 'txlist')
    url.searchParams.append('address', walletAddress)
    url.searchParams.append('startblock', '0')
    url.searchParams.append('endblock', '99999999')
    url.searchParams.append('sort', 'desc')
    url.searchParams.append('apikey', ETHERSCAN_API_KEY)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result.filter((tx: Transaction) => {
        const timestamp = parseInt(tx.timeStamp)
        return timestamp >= TWO_WEEKS_AGO && timestamp <= NOW
      })
    }
    return []
  } catch (error) {
    console.error('Error fetching normal transactions:', error)
    return []
  }
}

/**
 * Fetch ALL token transactions (not just last 2 weeks) to calculate current holdings
 */
async function fetchAllTokenTransactions(walletAddress: string): Promise<TokenTransfer[]> {
  try {
    const url = new URL(ETHERSCAN_BASE_URL)
    url.searchParams.append('chainid', ETHEREUM_MAINNET_CHAINID)
    url.searchParams.append('module', 'account')
    url.searchParams.append('action', 'tokentx')
    url.searchParams.append('address', walletAddress)
    url.searchParams.append('startblock', '0')
    url.searchParams.append('endblock', '99999999')
    url.searchParams.append('sort', 'asc')
    url.searchParams.append('apikey', ETHERSCAN_API_KEY)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result
    }
    return []
  } catch (error) {
    console.error('Error fetching token transactions:', error)
    return []
  }
}

/**
 * Fetch token price from DexScreener
 */
async function fetchTokenPrice(tokenAddress: string): Promise<number | null> {
  try {
    const url = `${DEX_BASE}/tokens/${tokenAddress}`
    const res = await fetch(url, { headers: { 'accept': 'application/json' } })
    
    if (!res.ok) return null
    
    const data = await res.json()
    
    if (!data?.pairs || data.pairs.length === 0) return null
    
    // Get pair with highest liquidity
    const best = data.pairs.reduce((a: any, b: any) => 
      ((a?.liquidity?.usd ?? 0) >= (b?.liquidity?.usd ?? 0) ? a : b)
    )
    
    return best.priceUsd ? Number(best.priceUsd) : null
  } catch (error) {
    return null
  }
}

/**
 * Fetch NFT transactions (ERC-721)
 */
async function fetchNFTTransactions(walletAddress: string): Promise<any[]> {
  try {
    const url = new URL(ETHERSCAN_BASE_URL)
    url.searchParams.append('chainid', ETHEREUM_MAINNET_CHAINID)
    url.searchParams.append('module', 'account')
    url.searchParams.append('action', 'tokennfttx')
    url.searchParams.append('address', walletAddress)
    url.searchParams.append('startblock', '0')
    url.searchParams.append('endblock', '99999999')
    url.searchParams.append('sort', 'asc')
    url.searchParams.append('apikey', ETHERSCAN_API_KEY)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result
    }
    return []
  } catch (error) {
    console.error('Error fetching NFT transactions:', error)
    return []
  }
}

/**
 * Fetch NFT collection floor price from Reservoir API
 */
async function fetchNFTFloorPrice(contractAddress: string): Promise<number | null> {
  try {
    const url = `https://api.reservoir.tools/collections/v7?id=${contractAddress}`
    const res = await fetch(url, { 
      headers: { 
        'accept': 'application/json',
        'x-api-key': 'demo-api-key' // Using demo key, limited rate
      } 
    })
    
    if (!res.ok) return null
    
    const data = await res.json()
    
    if (data?.collections?.[0]?.floorAsk?.price?.amount?.native) {
      return data.collections[0].floorAsk.price.amount.native
    }
    
    return null
  } catch (error) {
    console.error('Error fetching NFT floor price:', error)
    return null
  }
}

/**
 * Calculate current NFT holdings
 */
async function calculateNFTHoldings(
  walletAddress: string,
  nftTransfers: any[]
): Promise<NFTHolding[]> {
  const walletLower = walletAddress.toLowerCase()
  
  // Track which NFTs the wallet currently owns
  const ownedNFTs = new Map<string, {
    contractAddress: string
    tokenId: string
    tokenName: string
    collectionName: string
  }>()
  
  for (const transfer of nftTransfers) {
    const fromLower = transfer.from.toLowerCase()
    const toLower = transfer.to.toLowerCase()
    const nftKey = `${transfer.contractAddress}-${transfer.tokenID}`
    
    if (toLower === walletLower) {
      // Received NFT
      ownedNFTs.set(nftKey, {
        contractAddress: transfer.contractAddress,
        tokenId: transfer.tokenID,
        tokenName: transfer.tokenName,
        collectionName: transfer.tokenName
      })
    } else if (fromLower === walletLower) {
      // Sent NFT (no longer owns it)
      ownedNFTs.delete(nftKey)
    }
  }
  
  if (ownedNFTs.size === 0) return []
  
  console.log(`  🖼️  Found ${ownedNFTs.size} NFTs, fetching floor prices...`)
  
  const currentETHPrice = ETH_HISTORICAL_PRICES['2025-10-08']
  const holdings: NFTHolding[] = []
  
  // Get unique collections
  const collections = new Map<string, {
    contractAddress: string
    collectionName: string
    tokenIds: string[]
  }>()
  
  for (const [, nft] of ownedNFTs) {
    if (!collections.has(nft.contractAddress)) {
      collections.set(nft.contractAddress, {
        contractAddress: nft.contractAddress,
        collectionName: nft.collectionName,
        tokenIds: []
      })
    }
    collections.get(nft.contractAddress)!.tokenIds.push(nft.tokenId)
  }
  
  let count = 0
  for (const [, collection] of collections) {
    count++
    console.log(`     [${count}] ${collection.collectionName} (${collection.tokenIds.length} NFTs)...`)
    
    const floorPriceETH = await fetchNFTFloorPrice(collection.contractAddress)
    const floorPriceUSD = floorPriceETH ? floorPriceETH * currentETHPrice : 0
    
    for (const tokenId of collection.tokenIds) {
      holdings.push({
        contractAddress: collection.contractAddress,
        tokenId,
        name: `#${tokenId}`,
        collectionName: collection.collectionName,
        floorPriceETH,
        floorPriceUSD
      })
    }
    
    if (floorPriceETH) {
      console.log(`     ✅ Floor: ${floorPriceETH.toFixed(4)} ETH ($${floorPriceUSD.toFixed(2)}) × ${collection.tokenIds.length} = $${(floorPriceUSD * collection.tokenIds.length).toFixed(2)}`)
    } else {
      console.log(`     ⚠️  Floor price not available`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return holdings
}

/**
 * Calculate current token holdings (excluding scam tokens)
 */
async function calculateTokenHoldings(
  walletAddress: string,
  tokenTransfers: TokenTransfer[]
): Promise<TokenHolding[]> {
  const walletLower = walletAddress.toLowerCase()
  
  // Calculate net balance for each token
  const tokenBalances = new Map<string, {
    symbol: string
    name: string
    decimals: number
    balance: number
  }>()
  
  for (const transfer of tokenTransfers) {
    const fromLower = transfer.from.toLowerCase()
    const toLower = transfer.to.toLowerCase()
    const contractLower = transfer.contractAddress.toLowerCase()
    const decimals = parseInt(transfer.tokenDecimal)
    const amount = parseFloat(transfer.value) / Math.pow(10, decimals)
    
    // Skip scam tokens (by address or symbol)
    if (SCAM_TOKENS.has(contractLower) || SCAM_SYMBOLS.has(transfer.tokenSymbol)) {
      continue
    }
    
    // Initialize if first time seeing this token
    if (!tokenBalances.has(contractLower)) {
      tokenBalances.set(contractLower, {
        symbol: transfer.tokenSymbol,
        name: transfer.tokenName,
        decimals,
        balance: 0
      })
    }
    
    const tokenData = tokenBalances.get(contractLower)!
    
    // Update balance
    if (toLower === walletLower) {
      tokenData.balance += amount
    }
    if (fromLower === walletLower) {
      tokenData.balance -= amount
    }
  }
  
  // Filter to tokens with positive balance and fetch prices
  const holdings: TokenHolding[] = []
  
  console.log(`  💰 Found ${tokenBalances.size} unique tokens (scams filtered), fetching prices...`)
  
  let count = 0
  for (const [address, data] of tokenBalances.entries()) {
    if (data.balance > 0.000001) { // Ignore dust
      count++
      console.log(`     [${count}] ${data.symbol}: ${data.balance.toFixed(4)} tokens...`)
      
      const priceUsd = await fetchTokenPrice(address)
      const valueUsd = priceUsd ? data.balance * priceUsd : 0
      
      holdings.push({
        address,
        symbol: data.symbol,
        name: data.name,
        balance: data.balance,
        decimals: data.decimals,
        priceUsd,
        valueUsd
      })
      
      if (priceUsd) {
        console.log(`     ✅ $${priceUsd.toFixed(8)} = $${valueUsd.toFixed(2)} USD`)
      } else {
        console.log(`     ⚠️  Price not available`)
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  return holdings.sort((a, b) => b.valueUsd - a.valueUsd)
}

/**
 * Analyze complete wallet P&L
 */
async function analyzeWallet(walletAddress: string): Promise<WalletAnalysis> {
  const walletLower = walletAddress.toLowerCase()
  
  console.log(`\n🔍 Analyzing ${walletAddress}...`)
  
  // Fetch ETH transactions
  console.log('  📥 Fetching ETH transactions...')
  const normalTxs = await fetchNormalTransactions(walletAddress)
  console.log(`  ✅ Found ${normalTxs.length} ETH transactions in last 2 weeks`)
  
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Fetch ALL token transactions for holdings calculation
  console.log('  📥 Fetching ALL token transactions (for current holdings)...')
  const allTokenTxs = await fetchAllTokenTransactions(walletAddress)
  console.log(`  ✅ Found ${allTokenTxs.length} token transactions (all time)`)
  
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Calculate ETH flow
  let ethReceived = 0
  let ethSent = 0
  let totalGasFees = 0
  let ethReceivedUSD = 0
  let ethSentUSD = 0
  let gasFeeUSD = 0
  
  console.log('  💰 Processing ETH transactions...')
  for (const tx of normalTxs) {
    const timestamp = parseInt(tx.timeStamp)
    const ethAmount = parseInt(tx.value) / 1e18
    const gasFee = tx.gasUsed && tx.gasPrice 
      ? (parseInt(tx.gasUsed) * parseInt(tx.gasPrice)) / 1e18
      : 0
    
    const ethPrice = getETHPriceAtTimestamp(timestamp)
    
    if (tx.to.toLowerCase() === walletLower && ethAmount > 0) {
      ethReceived += ethAmount
      ethReceivedUSD += ethAmount * ethPrice
    } else if (tx.from.toLowerCase() === walletLower) {
      ethSent += ethAmount
      ethSentUSD += ethAmount * ethPrice
    }
    
    if (tx.from.toLowerCase() === walletLower && gasFee > 0) {
      totalGasFees += gasFee
      gasFeeUSD += gasFee * ethPrice
    }
  }
  
  console.log(`  ✅ ETH Flow: Received $${ethReceivedUSD.toFixed(2)}, Sent $${ethSentUSD.toFixed(2)}, Gas $${gasFeeUSD.toFixed(2)}`)
  
  // Calculate current token holdings
  console.log('  🪙 Calculating current token holdings...')
  const tokenHoldings = await calculateTokenHoldings(walletAddress, allTokenTxs)
  const totalTokenValueUSD = tokenHoldings.reduce((sum, h) => sum + h.valueUsd, 0)
  console.log(`  ✅ Total token value: $${totalTokenValueUSD.toFixed(2)} USD`)
  
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Fetch NFT holdings
  console.log('  🖼️  Fetching NFT holdings...')
  const allNFTTxs = await fetchNFTTransactions(walletAddress)
  console.log(`  ✅ Found ${allNFTTxs.length} NFT transactions (all time)`)
  
  const nftHoldings = await calculateNFTHoldings(walletAddress, allNFTTxs)
  const totalNFTValueUSD = nftHoldings.reduce((sum, h) => sum + h.floorPriceUSD, 0)
  console.log(`  ✅ Total NFT value: $${totalNFTValueUSD.toFixed(2)} USD`)
  
  // Fetch current ETH balance
  console.log('  💎 Fetching current ETH balance...')
  const currentETHBalance = await fetchETHBalance(walletAddress)
  const currentETHPrice = ETH_HISTORICAL_PRICES['2025-10-08']
  const currentETHValueUSD = currentETHBalance * currentETHPrice
  console.log(`  ✅ Current ETH: ${currentETHBalance.toFixed(4)} ETH ($${currentETHValueUSD.toFixed(2)})`)
  
  const netETHFlowUSD = ethReceivedUSD - ethSentUSD - gasFeeUSD
  const trueNetPositionUSD = netETHFlowUSD + totalTokenValueUSD + totalNFTValueUSD + currentETHValueUSD
  
  return {
    address: walletAddress,
    ethReceived,
    ethSent,
    ethGasFees: totalGasFees,
    ethReceivedUSD,
    ethSentUSD,
    gasFeeUSD,
    netETHFlowUSD,
    tokenHoldings,
    totalTokenValueUSD,
    nftHoldings,
    totalNFTValueUSD,
    trueNetPositionUSD
  }
}

/**
 * Print wallet analysis
 */
function printWalletAnalysis(analysis: WalletAnalysis) {
  console.log('\n' + '='.repeat(80))
  console.log(`📊 COMPLETE P&L ANALYSIS: ${analysis.address}`)
  console.log('='.repeat(80))
  
  console.log(`\n📅 Period: Last 2 weeks (Sep 24 - Oct 8, 2025)`)
  
  console.log(`\n💰 ETH FLOW (Last 2 Weeks):`)
  console.log(`   Received: ${analysis.ethReceived.toFixed(4)} ETH ($${analysis.ethReceivedUSD.toFixed(2)})`)
  console.log(`   Sent: ${analysis.ethSent.toFixed(4)} ETH ($${analysis.ethSentUSD.toFixed(2)})`)
  console.log(`   Gas Fees: ${analysis.ethGasFees.toFixed(4)} ETH ($${analysis.gasFeeUSD.toFixed(2)})`)
  
  const netEmoji = analysis.netETHFlowUSD >= 0 ? '🟢' : '🔴'
  const netSign = analysis.netETHFlowUSD >= 0 ? '+' : ''
  console.log(`   Net ETH Flow: ${netEmoji} ${netSign}$${analysis.netETHFlowUSD.toFixed(2)} USD`)
  
  console.log(`\n🪙 CURRENT TOKEN HOLDINGS:`)
  if (analysis.tokenHoldings.length > 0) {
    analysis.tokenHoldings.forEach((holding, i) => {
      const emoji = holding.priceUsd ? '💎' : '❓'
      console.log(`   ${i + 1}. ${emoji} ${holding.symbol}: ${holding.balance.toFixed(4)} tokens`)
      if (holding.priceUsd) {
        console.log(`      @ $${holding.priceUsd.toFixed(8)} = $${holding.valueUsd.toFixed(2)} USD`)
      } else {
        console.log(`      Price unavailable`)
      }
    })
    console.log(`\n   💰 Total Token Value: $${analysis.totalTokenValueUSD.toFixed(2)} USD`)
  } else {
    console.log(`   No token holdings`)
  }
  
  console.log(`\n🖼️  CURRENT NFT HOLDINGS:`)
  if (analysis.nftHoldings.length > 0) {
    const collections = new Map<string, NFTHolding[]>()
    analysis.nftHoldings.forEach(nft => {
      if (!collections.has(nft.collectionName)) {
        collections.set(nft.collectionName, [])
      }
      collections.get(nft.collectionName)!.push(nft)
    })
    
    let idx = 0
    for (const [collectionName, nfts] of collections) {
      idx++
      const totalValue = nfts.reduce((sum, nft) => sum + nft.floorPriceUSD, 0)
      const floorETH = nfts[0].floorPriceETH
      console.log(`   ${idx}. 🖼️  ${collectionName} (${nfts.length} NFTs)`)
      if (floorETH) {
        console.log(`      Floor: ${floorETH.toFixed(4)} ETH = $${totalValue.toFixed(2)} USD`)
      } else {
        console.log(`      Floor price unavailable`)
      }
    }
    console.log(`\n   🎨 Total NFT Value: $${analysis.totalNFTValueUSD.toFixed(2)} USD`)
  } else {
    console.log(`   No NFT holdings`)
  }
  
  console.log(`\n📈 TRUE NET POSITION:`)
  const totalEmoji = analysis.trueNetPositionUSD >= 0 ? '🟢' : '🔴'
  const totalSign = analysis.trueNetPositionUSD >= 0 ? '+' : ''
  console.log(`   ${totalEmoji} ${totalSign}$${analysis.trueNetPositionUSD.toFixed(2)} USD`)
  console.log(`   (ETH Flow + Tokens + NFTs + Current ETH)`)
}

/**
 * Main analysis
 */
async function main() {
  console.log('\n🔍 COMPLETE P&L ANALYSIS (ETH + TOKEN HOLDINGS)')
  console.log('═'.repeat(80))
  
  if (!ETHERSCAN_API_KEY) {
    console.error('\n❌ Error: VITE_ETHERSCAN_API_KEY environment variable not set')
    process.exit(1)
  }
  
  console.log(`\n📝 Configuration:`)
  console.log(`   Wallet 1: ${WALLET_1}`)
  console.log(`   Wallet 2: ${WALLET_2}`)
  console.log(`   Analysis Period: Last 2 weeks`)
  console.log(`   Holdings: All time (current balances)`)
  
  console.log('\n💱 Using historical ETH prices (Sep 18 - Oct 8, 2025)')
  console.log(`   ✅ ${Object.keys(ETH_HISTORICAL_PRICES).length} days of price data loaded`)
  
  try {
    // Analyze both wallets
    const analysis1 = await analyzeWallet(WALLET_1)
    printWalletAnalysis(analysis1)
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const analysis2 = await analyzeWallet(WALLET_2)
    printWalletAnalysis(analysis2)
    
    // Combined summary
    console.log('\n\n' + '='.repeat(80))
    console.log('📊 COMBINED SUMMARY (BOTH WALLETS)')
    console.log('='.repeat(80))
    
    const totalETHFlowUSD = analysis1.netETHFlowUSD + analysis2.netETHFlowUSD
    const totalTokenValueUSD = analysis1.totalTokenValueUSD + analysis2.totalTokenValueUSD
    const totalNFTValueUSD = analysis1.totalNFTValueUSD + analysis2.totalNFTValueUSD
    const totalTrueNetUSD = analysis1.trueNetPositionUSD + analysis2.trueNetPositionUSD
    
    console.log(`\n💸 Combined ETH Flow (2 weeks): ${totalETHFlowUSD >= 0 ? '🟢' : '🔴'} ${totalETHFlowUSD >= 0 ? '+' : ''}$${totalETHFlowUSD.toFixed(2)} USD`)
    console.log(`💎 Combined Token Holdings: $${totalTokenValueUSD.toFixed(2)} USD`)
    console.log(`🎨 Combined NFT Holdings: $${totalNFTValueUSD.toFixed(2)} USD`)
    console.log(`\n📈 COMBINED TRUE NET POSITION: ${totalTrueNetUSD >= 0 ? '🟢' : '🔴'} ${totalTrueNetUSD >= 0 ? '+' : ''}$${totalTrueNetUSD.toFixed(2)} USD`)
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ Complete Analysis Done!')
    console.log('='.repeat(80) + '\n')
    
  } catch (error) {
    console.error('\n❌ Error during analysis:', error)
    process.exit(1)
  }
}

main()

