# ETH Historical Price API Research

**Date:** October 8, 2025  
**Goal:** Find the best way to get historical ETH prices for accurate USD P/L tracking

---

## 🎯 **REQUIREMENT**

User needs to know if they're **up or down in USD** on their token trades.

**For ETH-based swaps:**
- Transaction on Oct 1 when ETH = $4,144 → Record as $4,144 spent ✅
- Transaction on Oct 8 when ETH = $4,455 → Record as $4,455 spent ✅
- **Must use ACTUAL ETH price at time of transaction**

**For Stablecoin swaps:**
- USDC/USDT/DAI → Use exact stablecoin amount (already implemented ✅)

---

## 📊 **RESEARCH FINDINGS**

### **Option 1: Etherscan API**

**Documentation:** https://docs.etherscan.io/api-endpoints/stats-1

**Endpoint:**
```
https://api.etherscan.io/v2/api
  ?chainid=1
  &module=stats
  &action=ethdailyprice
  &startdate=2024-10-01
  &enddate=2024-10-08
  &sort=asc
  &apikey=YOUR_KEY
```

**Testing Results:**
- V1 API (`/api`): Returns "deprecated, switch to V2"
- V2 API (`/v2/api`): Returns "API Pro endpoint - upgrade required"

**Conclusion:**
- ❌ **Requires paid API Pro subscription**
- ❌ **Not available on free tier**
- ✅ Would be ideal if we had Pro (single API, no external dependencies)

**Cost:** Unknown - need to check Etherscan pricing

---

### **Option 2: CoinGecko API**

**Current Implementation:** Already using but with rate limit issues

**Free Tier:**
- Endpoint: `https://api.coingecko.com/api/v3/coins/ethereum/history?date=DD-MM-YYYY`
- Rate Limit: ~10-50 calls/minute (aggressive)
- Problem: Multiple transactions = multiple dates = rate limits

**Why it failed before:**
- Called API for EACH transaction date (5 transactions = 5 API calls)
- 300ms delay between calls = too fast
- Hit rate limits on 2nd/3rd wallet load

**How to fix:**
1. **localStorage caching** - store fetched prices permanently
2. **Batch fetching** - get all needed dates, store in cache
3. **Longer delays** - 1-2 seconds between calls
4. **Retry logic** - if rate limited, wait and retry

---

### **Option 3: Alternative Free APIs**

**CryptoCompare API:**
- Historical data: ✅ Daily, hourly, minute-level
- Free tier: ✅ Available
- Rate limits: Moderate (throttles heavy use)
- Endpoint: Similar to CoinGecko

**CoinCap API:**
- Historical data: ✅ Available
- Free tier: ✅ Available
- Quick and simple endpoints
- Lightweight for integration

**Binance API:**
- Historical data: ✅ OHLCV price histories
- Free tier: ✅ Available
- Focus: Trading pairs on Binance
- Might be overkill for our use case

**Moralis API:**
- Mentioned in search results
- Need to research pricing/limits
- Blockchain-focused API platform

**GeckoTerminal API:**
- **Already using in codebase!** (via DexScreener for real-time data)
- Free tier: 30 calls/minute (better than CoinGecko!)
- Focus: DEX trading data (real-time prices, volumes, liquidity)
- Beta release
- Documentation: https://www.geckoterminal.com/dex-api

**Research Finding:**
- ❌ GeckoTerminal is for **real-time DEX data**, not historical prices
- ❌ Doesn't have OHLCV/historical chart data endpoint
- ✅ Good for current prices, not for "what was ETH price on Oct 1st"
- **Conclusion:** Can't use GeckoTerminal for our use case

---

## 🤔 **RESEARCH CONCLUSIONS**

### **Etherscan API Pro:**
- ❌ Cost not clearly documented (need to contact sales)
- ❌ Overkill for just historical prices
- ✅ Would be ideal if already paying for it

### **Free API Options:**
All offer historical ETH prices for free:
1. **CoinGecko** - Most popular, generous free tier
2. **CryptoCompare** - Similar to CoinGecko
3. **CoinCap** - Simpler, lightweight
4. **Binance** - Trading-focused

### **The Real Problem:**
Not the API choice - it's **rate limit handling**!

All free APIs have rate limits. The solution is:
- ✅ **localStorage caching** (persist prices across sessions)
- ✅ **Proper delays** (1-2 seconds, not 300ms)
- ✅ **Smart batching** (fetch only missing dates)
- ✅ **Retry logic** (handle 429 errors gracefully)

---

## 💡 **RECOMMENDED APPROACH**

### **Decision: CoinGecko API + localStorage Caching**

**Why CoinGecko:**
1. ✅ Most popular/reliable free API
2. ✅ Already integrated in codebase
3. ✅ Good documentation
4. ✅ Generous free tier limits
5. ✅ We know it works (just need better caching)

**Implementation Strategy:**

```
Phase 1: Add localStorage caching
├─ Store fetched ETH prices permanently (date → price)
├─ Check cache BEFORE making API calls
└─ Only fetch dates not in cache

Phase 2: Improve rate limiting
├─ Increase delay to 1-2 seconds between calls
├─ Add retry logic for 429 errors
└─ Show user when fetching prices (progress indicator)

Phase 3: Batch optimization
├─ Group transactions by date
├─ Fetch unique dates only (5 transactions might be 3 dates)
└─ Reduce total API calls
```

**Expected Results:**
- First load: Fetch prices, store in cache (might be slow, but one-time)
- Subsequent loads: Use cache, instant and consistent
- New dates: Only fetch new dates, add to cache
- **100% consistent results**

---

## 📝 **IMPLEMENTATION PLAN**

### **Step 1: Add localStorage Cache Helper**
```typescript
// Get/set ETH prices in localStorage
function getETHPriceFromCache(date: string): number | null
function setETHPriceInCache(date: string, price: number): void
```

### **Step 2: Update fetchHistoricalETHPrice**
```typescript
1. Check localStorage first
2. If found → return immediately
3. If not found → fetch from CoinGecko
4. Store in localStorage
5. Add 1-2 second delay
```

### **Step 3: Update calculatePortfolioFromTransfers**
```typescript
1. Extract unique dates from all transactions
2. Check which dates are missing from cache
3. Batch fetch only missing dates
4. Use cached + new prices for calculations
```

### **Step 4: Add User Feedback**
```typescript
- Show "Fetching ETH prices..." message
- Show progress: "Loaded 3/5 dates"
- Cache hit rate for debugging
```

---

## ✅ **FINAL DECISION**

**Use CoinGecko API with proper localStorage caching**

This gives us:
- ✅ Free (no API Pro costs)
- ✅ Reliable (proven API)
- ✅ Consistent (localStorage persistence)
- ✅ Fast (cache hits are instant)
- ✅ Scalable (works for any number of transactions)

**Ready to implement once approved by user.**


