// Minimal DexScreener types used in app
export type DexTokenInfo = {
  priceUsd?: string
  fdv?: number
  marketCap?: number
}

export type DexPair = {
  chainId: string
  dexId: string
  url: string
  pairAddress?: string
  labels?: string[]
  baseToken: { address: string; name: string; symbol: string }
  quoteToken: { address: string; name: string; symbol: string }
  priceUsd?: string
  priceNative?: string
  liquidity?: { usd?: number; base?: number; quote?: number }
  fdv?: number
  marketCap?: number
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number }
  priceChange?: { h24?: number; h6?: number; h1?: number; m5?: number }
  txns?: { 
    h24?: { buys?: number; sells?: number }
    h6?: { buys?: number; sells?: number }
    h1?: { buys?: number; sells?: number }
    m5?: { buys?: number; sells?: number }
  }
  pairCreatedAt?: number
  info?: {
    imageUrl?: string
    header?: string
    openGraph?: string
    websites?: Array<{ label: string; url: string }>
    socials?: Array<{ type: string; url: string }>
  }
}

export type DexScreenerTokenResponse = {
  schemaVersion: string
  pairs?: DexPair[]
}


