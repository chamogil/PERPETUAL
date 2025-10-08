# How to Add New Token Historical Data to Launch Simulator

**Purpose:** Step-by-step guide for adding any new strategy token's historical launch data  
**Last Updated:** October 8, 2025  
**Difficulty:** Intermediate (requires API calls, data transformation, TypeScript)

> **📁 Documentation Organization:**  
> This repository keeps documentation minimal and focused:
> - `README.md` - Project overview and features
> - `HOW_TO_ADD_NEW_TOKENS.md` - This guide (token addition process)
> - `LAUNCH_STRATEGY_HELP.md` - User help for Launch Strategy Planner
> 
> Investigation/work docs are removed after completion to keep the repo clean.

---

## 🎯 **OVERVIEW**

This guide explains how to add historical launch data for a new token to the Launch Simulator.

**What is "historical data"?**
- Minute-by-minute price/market cap data from token launch
- First 90 minutes after launch
- Used in Launch Simulator "Historical Mode" to model real token performance
- Hardcoded in the codebase (not fetched at runtime)

**Why hardcode it?**
- Historical data never changes - it's from the PAST
- No API rate limits or runtime delays
- Instant load in simulator
- Complete data (90 minutes, no gaps)

---

## 📋 **REQUIREMENTS**

Before starting, you need:

1. ✅ **Token contract address** (e.g., `0xabc123...`)
2. ✅ **GeckoTerminal pool URL** (user usually provides this)
3. ✅ **Pool ID** (extract from GeckoTerminal URL)
4. ✅ **Token symbol** (e.g., `PAINSTR`, `PNKSTR`)
5. ✅ **Token total supply** (usually 1,000,000,000 for strategy tokens)

---

## 🔧 **TOOLS NEEDED**

- Terminal/Command Line
- `curl` (for API calls)
- `jq` (for JSON parsing, optional but helpful)
- Text editor
- Node.js (for transformation script)

---

## 📝 **STEP-BY-STEP GUIDE**

### **Step 1: Extract Pool Information**

**From GeckoTerminal URL:**
```
https://www.geckoterminal.com/eth/pools/[POOL_ID]?utm_source=embed
```

**Extract:**
- Pool ID (the long hex string in the URL)
- Token symbol (visible on the page)
- Token address (visible on the page)

**Example (PAINSTR):**
- URL: `https://www.geckoterminal.com/eth/pools/0x854b75d54826bb26569d2b1184583a5c6a7a2407912f8386b0c10d7232b22e5b`
- Pool ID: `0x854b75d54826bb26569d2b1184583a5c6a7a2407912f8386b0c10d7232b22e5b`
- Token: `PAINSTR`
- Address: `0xdfc3af477979912ec90b138d3e5552d5304c5663`

---

### **Step 2: Fetch Historical OHLCV Data**

**Use GeckoTerminal API:**
```bash
curl -s "https://api.geckoterminal.com/api/v2/networks/eth/pools/[POOL_ID]/ohlcv/minute?limit=1000" > token_ohlcv.json
```

**Replace `[POOL_ID]` with your pool ID.**

**API Details:**
- Endpoint: `/networks/eth/pools/{pool_address}/ohlcv/{timeframe}`
- Timeframe: `minute` (1-minute candles)
- Limit: `1000` (to get enough historical data)
- Rate Limit: 30 calls/minute (free tier)
- Documentation: https://apiguide.geckoterminal.com/

**What you get:**
- Array of OHLCV candles (newest first)
- Each candle: `[timestamp, open, high, low, close, volume]`
- Prices in USD per token
- Volume in USD

**Verify data:**
```bash
cat token_ohlcv.json | jq '.data.attributes.ohlcv_list | length'
```
Should return a number (e.g., 588 data points).

---

### **Step 3: Find Launch Timestamp**

**Extract the first (oldest) timestamp:**
```bash
cat token_ohlcv.json | jq -r '.data.attributes.ohlcv_list | reverse | .[0][0]'
```

**Convert to human-readable date:**
```bash
date -r [TIMESTAMP] -u '+%Y-%m-%dT%H:%M:%SZ'
```

**Example:**
- Timestamp: `1759852800`
- Date: `2025-10-07T16:00:00Z`

**This is your launch date!**

---

### **Step 4: Extract First 90 Minutes**

**Create transformation script** (`/tmp/transform_token_data.js`):

```javascript
const fs = require('fs');

// Read the JSON file
const csvData = fs.readFileSync('/tmp/token_ohlcv.json', 'utf8');
const json = JSON.parse(csvData);

// Get the first 90 minutes (data is newest first, so reverse and take first 90)
const ohlcvList = json.data.attributes.ohlcv_list.reverse().slice(0, 90);

const TOTAL_SUPPLY = 1_000_000_000; // 1 billion tokens (adjust if different)

const transformedData = ohlcvList.map((entry, index) => {
  const [timestamp, open, high, low, close, volume] = entry;
  
  // Calculate average price (open + close) / 2
  // This is DOCUMENTED and accounts for volatility within the minute
  const avgPrice = (open + close) / 2;
  
  // Calculate market cap
  const marketCap = avgPrice * TOTAL_SUPPLY;
  
  return {
    minute: index,
    timestamp,
    open,
    high,
    low,
    close,
    volume,
    marketCap
  };
});

// Output as JavaScript array
console.log(`'[TOKEN_SYMBOL]': [`);
transformedData.forEach((data, i) => {
  const comma = i < transformedData.length - 1 ? ',' : '';
  console.log(`  { minute: ${data.minute}, timestamp: ${data.timestamp}, open: ${data.open}, high: ${data.high}, low: ${data.low}, close: ${data.close}, volume: ${data.volume}, marketCap: ${data.marketCap} }${comma}`);
});
console.log(`],`);

// Also log some stats
console.log('\n\n=== STATS ===');
console.log(`Data Points: ${transformedData.length}`);
console.log(`Launch Timestamp: ${transformedData[0].timestamp}`);
console.log(`First Minute MCAP: $${transformedData[0].marketCap.toFixed(2)}`);
console.log(`Last Minute (89) MCAP: $${transformedData[89].marketCap.toFixed(2)}`);
console.log(`Growth: ${(transformedData[89].marketCap / transformedData[0].marketCap).toFixed(2)}x`);
```

**Run the script:**
```bash
node /tmp/transform_token_data.js > /tmp/token_transformed.txt
```

**Verify output:**
```bash
head -20 /tmp/token_transformed.txt
```

You should see formatted JavaScript object with 90 data points.

---

### **Step 5: Add Pool Configuration**

**File:** `src/geckoterminal.ts`

**Find the `POOL_CONFIG` object and add:**
```typescript
'[TOKEN_ADDRESS_LOWERCASE]': {
  symbol: '[TOKEN_SYMBOL]',
  poolId: '[POOL_ID]',
  launchDate: '[LAUNCH_DATE_ISO8601]',
},
```

**Example (PAINSTR):**
```typescript
'0xdfc3af477979912ec90b138d3e5552d5304c5663': {
  symbol: 'PAINSTR',
  poolId: '0x854b75d54826bb26569d2b1184583a5c6a7a2407912f8386b0c10d7232b22e5b',
  launchDate: '2025-10-07T16:00:00Z',
},
```

**Important:**
- Token address must be lowercase
- Launch date in ISO 8601 format with `Z` suffix
- Add AFTER the last token, BEFORE the closing `}`

---

### **Step 6: Add Historical Data**

**File:** `src/historicalData.ts`

**Find the `HISTORICAL_LAUNCH_DATA` object and add:**

1. Copy the entire output from `/tmp/token_transformed.txt` (the JavaScript array)
2. Paste it at the end of the object, BEFORE the closing `}`
3. Make sure to replace `[TOKEN_SYMBOL]` with the actual symbol

**Example structure:**
```typescript
'PAINSTR': [
  { minute: 0, timestamp: 1759852800, open: 0.000114698497217827, high: 0.000126337001403976, low: 0.000113290930442775, close: 0.000120715732672111, volume: 123571.82304443182, marketCap: 117707.11494496901 },
  { minute: 1, timestamp: 1759852860, open: 0.000120715732672111, high: 0.000138747857384787, low: 0.00011463699425213, close: 0.000117149554303915, volume: 161026.91444951284, marketCap: 118932.64348801298 },
  // ... 88 more data points ...
  { minute: 89, timestamp: 1759858140, open: 0.00236740788568697, high: 0.00236740788568697, low: 0.00232437537967994, close: 0.00236169139500587, volume: 6745.0448008774265, marketCap: 2364549.64034642 },
],
```

**Important:**
- Must have EXACTLY 90 data points (minute 0-89)
- Keep all decimal precision from the transformation script
- Add comma at the end if there are more tokens below

---

### **Step 7: Test Build**

**Run TypeScript build:**
```bash
cd pnkstr-dashboard
npm run build
```

**Expected output:**
```
✓ built in XXXms
```

**If you see errors:**
- Check for syntax errors (missing commas, brackets)
- Verify data format matches other tokens
- Check that pool config and historical data use same symbol

---

### **Step 8: Test in Browser**

**Run dev server:**
```bash
npm run dev
```

**Test the simulator:**
1. Open browser to `http://localhost:5173`
2. Navigate to "Launch Simulator"
3. Switch to "Historical Mode" (toggle at top)
4. Select your new token from dropdown
5. Verify:
   - Data loads without errors
   - Chart displays correctly
   - Market cap numbers look reasonable
   - All 90 minutes are present

---

### **Step 9: Deploy**

**Commit changes:**
```bash
git add src/geckoterminal.ts src/historicalData.ts
git commit -m "feat: add [TOKEN_SYMBOL] historical data to launch simulator"
git push origin main
```

**Verify deployment:**
- Vercel will auto-deploy from main branch
- Check deployment status at https://vercel.com
- Test on live site once deployed

---

## 📐 **IMPORTANT FORMULAS**

### **Market Cap Calculation**
```javascript
avgPrice = (open + close) / 2
marketCap = avgPrice * TOTAL_SUPPLY
```

**Why use average of (open + close) / 2?**
- Each minute candle has volatility (open ≠ close)
- Using the average gives a realistic mid-point entry price
- More accurate than just using `close` price
- Accounts for people entering at different times within that minute

**This is documented in `historicalData.ts`:**
```typescript
// Market cap calculated using AVERAGE of (open + close) / 2 for more accurate entry pricing
// This accounts for volatility within each minute and gives a realistic mid-point entry price
```

---

## ✅ **CHECKLIST**

Before marking as complete, verify:

- [ ] Pool ID extracted from GeckoTerminal URL
- [ ] Launch timestamp found and converted to ISO 8601 date
- [ ] 90 minutes of OHLCV data fetched from API
- [ ] Data transformed with market cap calculated (using avg price)
- [ ] Pool configuration added to `src/geckoterminal.ts`
- [ ] Historical data added to `src/historicalData.ts`
- [ ] Build succeeds with no TypeScript errors
- [ ] Token appears in Historical Mode dropdown
- [ ] Data displays correctly in simulator
- [ ] Changes committed and pushed to GitHub
- [ ] Deployment verified on live site

---

## 🔍 **TROUBLESHOOTING**

### **"No data available" in simulator**
- Check token symbol matches between `geckoterminal.ts` and `historicalData.ts`
- Verify data structure matches other tokens
- Check browser console for errors

### **TypeScript build errors**
- Look for syntax errors (missing commas, brackets)
- Verify all fields are present (minute, timestamp, open, high, low, close, volume, marketCap)
- Check that numbers don't have quotes around them

### **Wrong market cap values**
- Verify `TOTAL_SUPPLY` is correct for the token
- Check that avgPrice calculation is `(open + close) / 2`
- Ensure you're not using `close` price directly

### **Missing data points**
- Must have exactly 90 data points (minute 0-89)
- If API returns fewer, you may need to fetch from a different source
- Check that you reversed the array (API returns newest first)

---

## 📚 **REFERENCE: PAINSTR EXAMPLE**

**Full example of adding PAINSTR (October 7, 2025 launch):**

**Data collected:**
- Token Address: `0xdfc3af477979912ec90b138d3e5552d5304c5663`
- Pool ID: `0x854b75d54826bb26569d2b1184583a5c6a7a2407912f8386b0c10d7232b22e5b`
- Launch Date: `2025-10-07T16:00:00Z`
- Launch Timestamp: `1759852800`
- Symbol: `PAINSTR`
- Total Supply: `1,000,000,000`

**Launch Stats:**
- First Minute (0): MCAP $117,707 (avg price $0.00011771)
- Last Minute (89): MCAP $2,364,550 (avg price $0.00236455)
- Growth: ~20x in first 90 minutes

**Files modified:**
1. `src/geckoterminal.ts` - Added pool config
2. `src/historicalData.ts` - Added 90 data points

**Result:** PAINSTR now available in Historical Mode dropdown with full launch data.

---

## 🚀 **TIPS**

1. **Save intermediate files** - Keep the raw JSON and transformation scripts for reference
2. **Document in git commit** - Include token symbol and launch date in commit message
3. **Test before pushing** - Always verify in browser before deploying
4. **Double-check math** - Market cap should make sense relative to price
5. **Use the same process** - This guide works for any strategy token
6. **Keep precision** - Don't round numbers in the historical data
7. **Verify timestamps** - Make sure they're sequential (60 seconds apart)

---

## 📞 **NEED HELP?**

Common issues:
- API rate limits: Wait 1 minute between calls
- Missing data: Try fetching with `limit=1000` to get more history
- Wrong format: Compare your output to existing tokens in `historicalData.ts`

---

**End of Guide** ✅

