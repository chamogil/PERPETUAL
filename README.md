# VIBE WHEELING - Perpetual Strategy Helper

**Your complete toolkit for NFT Strategy tokens**

A punk-minimal, utilitarian dashboard for tracking and planning trades on [nftstrategy.fun](https://www.nftstrategy.fun/) tokens.

🌐 **LIVE:** [https://perpetual-lemon.vercel.app/](https://perpetual-lemon.vercel.app/)  
📦 **GitHub:** [https://github.com/chamogil/PERPETUAL](https://github.com/chamogil/PERPETUAL)

---

## ✅ Status

**Version:** 1.0.0  
**Status:** 🟢 Live & Deployed  
**Last Updated:** October 7, 2025

**Recent Updates:**
- ✅ **WALLET INTEGRATION** - Auto-load portfolio from blockchain with accurate entry prices
- ✅ Full ETH + WETH support for all transaction types
- ✅ Historical ETH price fetching for true cost basis calculation
- ✅ New "All Metrics" page with comprehensive live data
- ✅ Added GOBSTR (Gobstrategy) support - 7 strategies tracked
- ✅ Strategies auto-sort by market cap on landing page
- ✅ Clean monochrome design for metrics page
- ✅ Rebranded to VIBE WHEELING
- ✅ Unified punk-minimal color scheme across all pages
- ✅ Launch Simulator with 3-slider system + 10% sell tax
- ✅ Exit Strategy with drag-drop reordering + 10% sell tax
- ✅ Portfolio section now shows "Total Invested" metric
- ✅ Quick Comparison expanded to 7 entry times (0, 15, 30, 45, 60, 75, 85 min)
- ✅ Donation section moved to end of landing page
- ✅ Fixed 404 errors on page refresh (vercel.json routing)
- ✅ All math verified accurate for nftstrategy.fun tokenomics
- ✅ Auto-deploys on push via Vercel

---

## 🎯 What It Does

**VIBE WHEELING** is a free helper tool with 4 main features:

### 1. **Landing Page** (`/`)
- Overview of all 7 NFT Strategy tokens (auto-sorted by market cap)
- Live market cap & 24h % change data
- Navigate to simulator, exit planner, or metrics page

### 2. **Launch Simulator** (`/launch-simulator`)
- Optimize entry timing for new token launches
- Accounts for dynamic buy tax (95% → 10%) + 10% sell tax
- 3-slider system:
  - **Entry Minute**: When you buy (0-90 min)
  - **Entry Market Cap**: MCAP when you buy ($50K-$1M)
  - **Exit Market Cap**: Your target ($Entry→$15M)
- Real-time ROI calculator with accurate tax calculations
- Quick Comparison: 7 entry times (0, 15, 30, 45, 60, 75, 85 min)

### 3. **Exit Strategy Dashboard** (`/exit-strategy`)
- **NEW: Wallet Integration** - Auto-load your portfolio from blockchain
  - Enter your Ethereum wallet address
  - Fetches all token transactions via Etherscan API
  - Calculates accurate average entry price using:
    - Actual ETH/WETH spent per transaction
    - Historical ETH prices at each purchase date
    - Automatic buy tax accounting (you paid = tokens received reflect tax)
  - Works for **ANY ERC-20 token** on Ethereum (not just strategy tokens!)
- Track portfolio value across all strategies
- Plan exits at custom market cap targets (accounts for 10% sell tax)
- Drag-and-drop reorder targets
- Print/export to PDF
- Auto-refresh every 30 seconds
- All proceeds calculated after tax

### 4. **All Metrics** (`/all-metrics`)
- Comprehensive live data for all strategy tokens
- Real-time updates every 30 seconds from DexScreener API
- Complete metrics including:
  - Market Cap, FDV, Liquidity
  - Price changes (5min, 1h, 6h, 24h)
  - Volume data across all timeframes
  - Trading activity (buys/sells/ratios)
  - DEX info and liquidity breakdown
- Clean monochrome design with color only for price changes
- Accessible via "VIEW ALL METRICS" button on landing page

---

## 🎨 Design Philosophy

**Punk & Minimal**
- Gray, black, white only (no colorful gradients)
- Glass-morphism cards with subtle effects
- Huge, bold typography
- Uppercase, wide letter-spacing
- Utilitarian, not salesy
- Simple, direct, grungy

---

## 🏗️ Tech Stack

```
Frontend:       React 19 + TypeScript
Routing:        React Router v6
Styling:        Tailwind CSS v4
Build Tool:     Vite 7
Data APIs:      DexScreener API (market data)
                Etherscan API V2 (blockchain data)
                CoinGecko API (historical ETH prices)
Drag-Drop:      @dnd-kit
State:          React hooks (no Redux/Zustand)
Deployment:     Vercel (recommended)
```

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Install Dependencies
```bash
cd pnkstr-dashboard
npm install
```

### Run Development Server
```bash
npm run dev
```

App runs at: `http://localhost:5173` (or next available port)

### Build for Production
```bash
npm run build
```

Output in `/dist` folder

---

## 🔧 Project Structure

```
pnkstr-dashboard/
├── src/
│   ├── pages/
│   │   ├── Landing.tsx           # Home page
│   │   ├── LaunchSimulator.tsx   # Launch entry optimizer
│   │   └── ExitStrategy.tsx      # Portfolio dashboard
│   ├── components/
│   │   └── StrategyOverview.tsx  # All strategies overview bar
│   ├── api.ts                    # DexScreener API calls
│   ├── lib.d.ts                  # TypeScript types
│   ├── App.tsx                   # Router setup
│   ├── main.tsx                  # App entry
│   └── index.css                 # Global styles
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## 🪙 Supported Strategies

**Current strategies (from nftstrategy.fun):**

| Symbol | Name | Contract Address |
|--------|------|------------------|
| PNKSTR | PunkStrategy | `0xc50673edb3a7b94e8cad8a7d4e0cd68864e33edf` |
| PUDGYSTR | PudgyStrategy | `0xb3d6e9e142a785ea8a4f0050fee73bcc3438c5c5` |
| APESTR | ApeStrategy | `0x9ebf91b8d6ff68aa05545301a3d0984eaee54a03` |
| TOADSTR | ToadzStrategy | `0x92cedfdbce6e87b595e4a529afa2905480368af4` |
| BIRBSTR | BirbStrategy | `0x6bcba7cd81a5f12c10ca1bf9b36761cc382658e8` |
| SQUIGSTR | SquiggleStrategy | `0x742fd09cbbeb1ec4e3d6404dfc959a324deb50e6` |
| GOBSTR | Gobstrategy | `0x5d855d8a3090243fed9bf73999eedfbc2d1dcf21` |

All on **Ethereum** mainnet.

---

## ➕ How to Add New Strategies (When They Launch)

**⚠️ IMPORTANT: This is a MANUAL process - No automatic detection**

When a new strategy launches on nftstrategy.fun, follow these steps:

### Step 1: Get New Token Info
From nftstrategy.fun or Etherscan, collect:
- Token name (e.g., "DoodzStrategy")
- Symbol (e.g., "DOODZSTR")
- Contract address (e.g., "0x...")
- Decimals (usually 18)

### Step 2: Update Coin List
**File:** `src/components/StrategyOverview.tsx`

Add new entry to the `COINS` array:

```typescript
const COINS: CoinConfig[] = [
  { id: 'pnkstr', name: 'PunkStrategy', symbol: 'PNKSTR', address: '0xc50673edb3a7b94e8cad8a7d4e0cd68864e33edf' },
  { id: 'pudgystr', name: 'PudgyStrategy', symbol: 'PUDGYSTR', address: '0xb3d6e9e142a785ea8a4f0050fee73bcc3438c5c5' },
  // ... existing coins ...
  
  // ADD NEW COIN HERE:
  { id: 'doodzstr', name: 'DoodzStrategy', symbol: 'DOODZSTR', address: '0xNEW_CONTRACT_ADDRESS' },
]
```

**That's it!** The new strategy will:
- ✅ Appear in All Strategies overview
- ✅ Be selectable in coin dropdown
- ✅ Fetch live data from DexScreener
- ✅ Work with all features (portfolio, exit calculator)

### Step 3: Test & Deploy
```bash
# Test locally
npm run dev
# Verify new coin shows up

# Deploy
git add .
git commit -m "Add DoodzStrategy"
git push
# Auto-deploys on Vercel
```

### Why No Automation?
- DexScreener API doesn't filter by "nftstrategy.fun" tokens
- No on-chain registry of all strategies
- Manual verification ensures quality (real tokens only)
- Prevents scam tokens from appearing

**Estimated time to add new strategy: ~2 minutes**

---

## 🎯 Launch Simulator Explained

### Dynamic Tax System (From nftstrategy.fun)
New tokens launch with anti-sniper protection:

```
Minute 0:   95% buy tax  🔴 (prevents bots)
Minute 1:   94% buy tax
Minute 2:   93% buy tax
...
Minute 85:  10% buy tax  🟢 (minimum reached)
Minute 86+: 10% buy tax  🟢 (stays at minimum)
```

**Tax Formula:** `tax_rate = max(10, 95 - minutes_elapsed)`

### Why It Matters
- **Early buyers**: High tax BUT potentially lower entry price
- **Late buyers**: Low tax BUT entry price may be much higher
- **The trade-off**: Tax vs Price growth

### Simulator Helps You:
1. Model different entry scenarios
2. Calculate effective cost after tax
3. See ROI at various exit targets
4. Find optimal entry timing

### Example Calculation:
```
Entry Minute:     30 (tax = 65%)
Entry Market Cap: $200K (price = $0.0002)
Investment:       $1,000
Exit Target:      $10M

After 65% tax:    $350 invested
Tokens received:  1,750,000
Exit price:       $0.01
Exit value:       $17,500
Profit:           $16,500
ROI:              +1,650% 🚀
```

---

## 📊 Exit Strategy Features

### Portfolio Tracking
- Input your holdings and average entry price
- See real-time portfolio value
- Calculate unrealized P/L
- Supports all 6 strategies

### Dynamic Exit Planning
- Add custom exit targets with "+" button
- Input target market cap (any number + Million/Billion)
- Set percentage to sell at each target
- Auto-calculates:
  - Implied price at target
  - Tokens to sell
  - Proceeds (USD)
  - Remaining tokens
  - Cumulative proceeds

### Drag-Drop Reordering
- Drag targets by handle (≡) to reorder
- Calculations update automatically
- Helps visualize your strategy

### Print/Export
- Click "Print" to export strategy
- Save as PDF using browser
- Professional formatting
- Shareable document

---

## 🔌 API Integration

### DexScreener API
- **Endpoint**: `https://api.dexscreener.com/latest/dex/tokens/{address}`
- **Rate Limit**: 300 requests/minute
- **Update Frequency**: Every 30 seconds
- **Data Retrieved**:
  - Price (USD)
  - Market Cap / FDV
  - Liquidity
  - 24h Volume
  - 24h % Change
  - Transaction counts (buys/sells)

### Etherscan API V2 (NEW!)
- **Endpoint**: `https://api.etherscan.io/v2/api`
- **API Key**: Required (free tier: 100K requests/day, 5 req/sec)
- **Purpose**: Fetch token transactions for wallet integration
- **Data Retrieved**:
  - Token transfer events (ERC-20)
  - Full transaction details (ETH value)
  - Transaction receipts (WETH detection from logs)

### CoinGecko API
- **Endpoint**: `https://api.coingecko.com/api/v3/coins/ethereum/history`
- **API Key**: Not required (free tier)
- **Purpose**: Historical ETH prices for accurate cost basis
- **Rate Limit**: Handled with caching and 300ms delays

### Data Accuracy
✅ **Shown (accurate from APIs):**
- Price, Market Cap, Liquidity (DexScreener)
- 24h Volume, Change, Transactions (DexScreener)
- Buys/Sells count (DexScreener)
- **Token holdings, avg entry price (Etherscan + CoinGecko)**
- **Historical ETH prices (CoinGecko)**

❌ **Hidden (not available in APIs):**
- Holder count
- Individual buyer/seller addresses
- Separate buy/sell volume

**All displayed data is verified accurate** - no estimates or calculations.

---

## 🔗 Wallet Integration Feature

### Overview
**Auto-load your portfolio directly from the Ethereum blockchain!**

Works for **ANY ERC-20 token** on Ethereum - not just strategy tokens.

### How It Works
1. Enter your Ethereum wallet address in the Exit Strategy page
2. Select the token you want to analyze
3. Click "Load Data"
4. System automatically:
   - Fetches all your token transactions from Etherscan
   - Gets full transaction details (ETH/WETH spent)
   - Retrieves historical ETH prices for each transaction date
   - Calculates weighted average entry price
   - Auto-populates Holdings and Avg Entry fields

### Calculation Method
```
For each token purchase:
  1. Get ETH spent (direct transfer value OR WETH from logs)
  2. Get historical ETH price at transaction date
  3. Calculate USD cost = ETH spent × ETH price
  
Average Entry Price = Total USD Spent ÷ Total Tokens Bought
```

### ETH + WETH Support
The system intelligently handles:
- **Direct ETH:** Standard ETH → token swaps
- **WETH:** Wrapped ETH transactions (complex DEX routes)
- **Auto-Detection:** Parses transaction logs when direct ETH = 0

### Example
```
Your Wallet: 0xABC...
Token: PNKSTR

Found 4 transactions:
  • Buy 1: 0.5000 ETH @ $4,144 = $2,072 → 19,121 tokens
  • Buy 2: 0.5590 ETH @ $4,516 = $2,524 → 10,927 tokens  
  • Buy 3: 0.5500 ETH @ $4,488 = $2,468 → 9,178 tokens
  • Buy 4: 0.5931 WETH @ $4,488 = $2,662 → 9,079 tokens (WETH detected!)

Result:
  Holdings: 48,305 PNKSTR
  Avg Entry: $0.201/token
  Total Invested: $9,726
```

### Accuracy Features
✅ **100% Accurate ETH Amounts** - Extracted from blockchain  
✅ **Real Historical Prices** - ETH price at exact transaction date  
✅ **Buy Tax Included** - Tokens received already reflect tax paid  
✅ **WETH Detection** - Catches all transaction types via log parsing  
✅ **Smart Caching** - Minimizes API calls by caching ETH prices  

### Privacy & Security
- ✅ **Read-Only:** Only reads public blockchain data
- ✅ **No Storage:** Wallet address never stored
- ✅ **No Permissions:** Doesn't access wallet or require signatures
- ✅ **Public Data:** Uses publicly available blockchain info

### Universal Compatibility
Works with **ANY ERC-20 token:**
- Strategy tokens (PNKSTR, PUDGYSTR, APESTR, etc.)
- Major tokens (USDC, LINK, UNI, etc.)
- New/obscure tokens
- Any valid ERC-20 contract address

---

## 🎨 Customization

### Update Colors
**File:** `src/index.css`

Current palette (punk minimal):
```css
Background: #000000 (black)
Cards:      #1A1A1A (dark gray)
Text:       #FFFFFF (white)
Borders:    #374151 (gray)
Positive:   #10B981 (green)
Negative:   #EF4444 (red)
```

### Update Launch Parameters
**File:** `src/pages/LaunchSimulator.tsx`

```typescript
const LAUNCH_PRICE = 0.0001           // Default launch price
const TOTAL_SUPPLY = 1_000_000_000    // 1 billion tokens
```

### Update Slider Ranges
```typescript
// Entry Market Cap: $50K - $1M
min="50000" max="1000000"

// Exit Market Cap: Entry → $15M
min={entryMarketCap} max="15000000"
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
npm run dev
```

### API Not Loading
- Check console for CORS errors
- DexScreener API is public (no key needed)
- Verify contract addresses are correct
- Wait 30s for auto-refresh

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json dist .vite
npm install
npm run dev
```

### Tailwind Not Working
```bash
# Ensure PostCSS configured correctly
# Check postcss.config.js has @tailwindcss/postcss
```

---

## 📱 Responsive Design

**Breakpoints:**
- Mobile: < 640px (sm)
- Tablet: 640-1024px (md)
- Desktop: 1024px+ (lg)

**Tested on:**
- ✅ iPhone (Safari)
- ✅ iPad (Safari)
- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Touch devices (drag-drop works)

---

## 🔐 Security & Privacy

- **No user data stored** - Everything local
- **No tracking or analytics**
- **No cookies**
- **No backend** - Pure frontend
- **API calls**: Only to DexScreener (public API)
- **No wallet connection required**

---

## 🚀 Deployment Guide

### Deploy to Vercel (Recommended)

**1. Prepare Git Repository:**
```bash
cd /Users/juangomez/EL\ MILLON/pnkstr-dashboard

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "VIBE WHEELING - Perpetual Strategy Helper"
```

**2. Push to GitHub:**
```bash
# Create repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/fly-wheeling.git
git branch -M main
git push -u origin main
```

**3. Deploy on Vercel:**
- Go to [vercel.com](https://vercel.com)
- Sign up with GitHub
- Click "Add New Project"
- Import your repository
- Vercel auto-detects Vite settings
- Click "Deploy"
- Get URL: `fly-wheeling.vercel.app`

**4. Future Updates:**
```bash
# Make changes
git add .
git commit -m "Add new strategy"
git push

# Vercel auto-deploys in ~30 seconds!
```

### Custom Domain (Optional)
- Go to Vercel project settings
- Add custom domain
- Update DNS records
- HTTPS automatic

### Analytics & Tracking

**Vercel Analytics (Built-in, Recommended):**
- Go to your Vercel project dashboard
- Click "Analytics" tab
- Enable "Web Analytics" for free
- View: Page views, visitors, countries, devices
- Privacy-friendly (no cookies, GDPR compliant)

**Google Analytics 4 (Optional):**
- More detailed tracking available
- Requires manual setup in `index.html`
- Note: GA4 setup was tested but removed to keep deployment simple
- Stick with Vercel Analytics for best results

---

## 📝 Maintenance & Updates

### Adding New Strategies (Manual Process)

**⚠️ No Automatic Detection** - You must manually add new tokens

**When a new strategy launches on nftstrategy.fun:**

**Step 1: Gather Token Information**
From nftstrategy.fun or Etherscan:
- Token name (e.g., "MiladyStrategy")
- Symbol (e.g., "MILADYSTR")
- Contract address (e.g., "0x...")
- Chain: Ethereum (all strategies are on Ethereum)

**Step 2: Update COINS Array**

Open: `src/components/StrategyOverview.tsx`

Add new entry:
```typescript
const COINS: CoinConfig[] = [
  // Existing coins...
  { id: 'pnkstr', name: 'PunkStrategy', symbol: 'PNKSTR', address: '0xc50673edb3a7b94e8cad8a7d4e0cd68864e33edf' },
  { id: 'pudgystr', name: 'PudgyStrategy', symbol: 'PUDGYSTR', address: '0xb3d6e9e142a785ea8a4f0050fee73bcc3438c5c5' },
  { id: 'apestr', name: 'ApeStrategy', symbol: 'APESTR', address: '0x9ebf91b8d6ff68aa05545301a3d0984eaee54a03' },
  { id: 'toadstr', name: 'ToadzStrategy', symbol: 'TOADSTR', address: '0x92cedfdbce6e87b595e4a529afa2905480368af4' },
  { id: 'birbstr', name: 'BirbStrategy', symbol: 'BIRBSTR', address: '0x6bcba7cd81a5f12c10ca1bf9b36761cc382658e8' },
  { id: 'squigstr', name: 'SquiggleStrategy', symbol: 'SQUIGSTR', address: '0x742fd09cbbeb1ec4e3d6404dfc959a324deb50e6' },
  
  // NEW STRATEGY - Add here:
  { id: 'miladystr', name: 'MiladyStrategy', symbol: 'MILADYSTR', address: '0xNEW_CONTRACT_ADDRESS_HERE' },
]
```

**Step 3: Test Locally**
```bash
npm run dev
# Check new strategy appears in overview
# Select it in dropdown
# Verify data loads from DexScreener
```

**Step 4: Deploy**
```bash
git add .
git commit -m "Add MiladyStrategy"
git push
# Auto-deploys to Vercel
```

**Time Required:** ~2-3 minutes per new strategy

### Why Manual?
- ✅ **Quality control** - Verify it's a real nftstrategy.fun token
- ✅ **No scams** - Prevent malicious tokens
- ✅ **Intentional** - Only add verified strategies
- ❌ **No API to auto-detect** - DexScreener doesn't filter by source
- ❌ **No on-chain registry** - nftstrategy.fun tokens not tagged

---

## 📚 Launch Mechanics Explained

### Dynamic Tax System

**How nftstrategy.fun tokens launch:**
- Token deploys with **95% buy tax** at minute 0
- Tax decreases by **1% every minute**
- Reaches minimum **10% tax** at minute 85
- Stays at 10% forever after that

**Purpose:**
- Anti-sniper/bot protection
- Fair distribution period
- Organic price discovery
- Rewards patient buyers

### Tax Schedule
```
Time        Tax    Color
-------------------------------
Minute 0    95%    🔴 Red
Minute 10   85%    🔴
Minute 20   75%    🔴
Minute 30   65%    🟠 Orange
Minute 40   55%    🟠
Minute 50   45%    🟡 Yellow
Minute 60   35%    🟡
Minute 70   25%    🟢 Green
Minute 80   15%    🟢
Minute 85   10%    🟢 (minimum)
Minute 90+  10%    🟢 (forever)
```

### Simulator Math

**Key Formulas:**

1. **Tax Rate:**
```javascript
tax_rate = Math.max(10, 95 - minutes_since_launch)
```

2. **Entry Price:**
```javascript
entry_price = entry_market_cap / total_supply
```

3. **Tokens Received (After Tax):**
```javascript
effective_investment = investment * (1 - tax_rate / 100)
tokens_received = effective_investment / entry_price
```

4. **Effective Cost Per Token:**
```javascript
effective_cost = investment / tokens_received
```

5. **Exit Price:**
```javascript
exit_price = exit_market_cap / total_supply
```

6. **ROI:**
```javascript
exit_value = tokens_received * exit_price
profit = exit_value - investment
roi = (profit / investment) * 100
```

### Fixed Parameters (v1)
```javascript
LAUNCH_PRICE = $0.0001
TOTAL_SUPPLY = 1,000,000,000 tokens
```

**Note:** Price behavior during tax period is user-inputted via Entry Market Cap slider (realistic for 90-minute launch window).

---

## 🎯 Exit Strategy Features

### Portfolio Calculator
- Track holdings across all 6 strategies
- Calculate portfolio value at current price
- Show unrealized P/L vs average entry
- Real-time updates

### Dynamic Exit Targets
- **Add targets** with "+" button
- **Input format**: Number + Million/Billion toggle
  - Example: "37" + "Million" = $37M target
  - Example: "2.5" + "Billion" = $2.5B target
- **% to sell** at each target
- **Auto-calculated**:
  - Implied price (what price will be at that MCAP)
  - Tokens to sell (based on percentage)
  - Proceeds (USD)
  - Remaining tokens (running total)
  - Cumulative proceeds (running total)

### Drag-Drop Reordering
- Powered by @dnd-kit library
- Grab handle (≡) to reorder targets
- Calculations automatically adjust
- Works on touch devices

### Print/Export
- Native browser print (Cmd/Ctrl+P or button)
- Clean formatting for printing
- Shows:
  - Coin info, current price, holdings
  - All exit targets with calculations
  - Summary totals
  - Timestamp
- Save as PDF from print dialog

---

## 🔄 Data Refresh

- **Auto-refresh**: Every 30 seconds
- **Manual refresh**: Click "Refresh" button on metrics
- **On coin switch**: Immediately fetches new coin data
- **Parallel loading**: All 6 strategies overview loads simultaneously

---

## 🎨 Design System

### Typography
```
Hero Title:      72-144px, font-black, tracking-tighter
Section Headers: 32-40px, font-black, uppercase
Card Titles:     20-24px, font-bold, uppercase
Body Text:       14-16px, regular
Small/Labels:    12px, uppercase, tracking-wide
Numbers:         Tabular-nums, monospace
```

### Spacing
- Container: max-width 1200px, 24px padding
- Card spacing: 24px gaps
- Section spacing: 64px vertical
- Internal padding: 24-32px

### Components
- **Glass Cards**: `rgba(26, 26, 26, 0.6)` + backdrop-blur
- **Borders**: `1px solid rgba(255, 255, 255, 0.1)`
- **Hover**: Border intensity increases, subtle lift
- **Transitions**: 200-300ms ease

---

## ⚡ Performance

- **Bundle size**: ~150KB gzipped
- **Load time**: <2 seconds
- **Libraries**:
  - React 19: ~40KB
  - React Router: ~10KB
  - @dnd-kit: ~15KB
  - Tailwind: ~10KB (purged)
- **No heavy dependencies**
- **Optimized**: Vite build with code splitting

---

## 🧪 Testing Checklist

Before deploying updates:

**Functionality:**
- [ ] All 3 pages load
- [ ] Navigation works (back buttons)
- [ ] Coin selector switches coins
- [ ] All metrics load from API
- [ ] Portfolio calculator works
- [ ] Exit targets add/delete/reorder
- [ ] Launch simulator sliders work
- [ ] All calculations accurate
- [ ] Print functionality works
- [ ] Donation copy button works

**Visual:**
- [ ] Punk aesthetic consistent
- [ ] Responsive on mobile
- [ ] No visual bugs
- [ ] Hover effects work
- [ ] Glass-morph renders correctly

**Technical:**
- [ ] No console errors
- [ ] No linter warnings
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors

---

## 📄 License & Usage

- **License**: Use freely, modify as needed
- **Attribution**: Not required but appreciated
- **Commercial use**: Allowed
- **Open source**: Feel free to fork/modify

---

## 💰 Donations

**Donations not encouraged but appreciated**

ETH: `0xB41Df8AC75d771180d2EB673A10C9FCD0b8418EF`

Helps maintain and improve the tool.

---

## 🛠️ Future Enhancements (Optional)

**Potential additions (not currently implemented):**
- [ ] Save portfolio data to localStorage
- [ ] Export exit strategy to CSV
- [ ] Historical price charts
- [ ] Multiple portfolio support
- [ ] Custom launch parameters in simulator
- [ ] Tax decay visualization chart
- [ ] Mobile app version
- [ ] Wallet connection for auto-fill holdings
- [ ] Price alerts/notifications

---

## 📞 Support

**Found a bug?**
- Check console for errors
- Verify contract addresses are correct
- Try clearing cache: `rm -rf .vite dist`

**Need help?**
- Read this README thoroughly
- Check FLYWHEEL-MASTERPLAN.md for implementation details
- All code is documented with comments

**Want to contribute?**
- Fork the repo
- Make improvements
- Share back (optional)

---

## 📊 Project Stats

- **Total Lines of Code**: ~2,000
- **Components**: 6
- **Pages**: 3
- **Features**: 20+
- **Build Time**: ~2 seconds
- **Bundle Size**: ~150KB
- **Dependencies**: 8 packages
- **Development Time**: 1 session (with AI assist)

---

## 🎯 Key Files Reference

### Core Logic
- `src/api.ts` - DexScreener API integration
- `src/pages/LaunchSimulator.tsx` - Tax & ROI calculations
- `src/pages/ExitStrategy.tsx` - Exit planning logic

### Data Configuration
- `src/components/StrategyOverview.tsx` - **COINS array** (add new strategies here)
- `src/lib.d.ts` - TypeScript types for API

### Styling
- `src/index.css` - Global styles, punk utilities, print CSS
- `tailwind.config.js` - Tailwind configuration

---

**Built with 🤘 for NFT Strategy traders**

**Last Updated:** October 5, 2025
