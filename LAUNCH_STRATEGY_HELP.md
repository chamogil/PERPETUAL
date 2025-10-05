# Launch Strategy Planner - Help Guide

## **Investment ($)**
The dollar amount you're planning to invest at a specific minute. Adjust this to test different investment sizes. The simulation shows how many tokens you'd get after buy tax is deducted.

---

## **Market Cap ($)**
The starting market cap at minute 1 of the launch. Set this to match the expected launch market cap and leave it. This determines the initial token price (MC ÷ 1 billion tokens).

---

## **MC +/Min ($)**
How much the market cap increases every minute during the 86-minute period. This models the growth rate:
- **$0** = flat price (no growth)
- **$50,000** = moderate growth ($50k added per minute)
- **$100,000+** = aggressive growth

Set this based on how bullish you think the launch will be, then leave it to see the full 86-minute projection.

---

## **Token Price ($)**
Auto-calculated. Shows current token price based on your Market Cap setting. You can't adjust this directly.

---

## **ETH Price ($)**
Live price from DexScreener, updates every 30 seconds. Used to convert all USD values to ETH. You can't adjust this.

---

# Controls & Functionality

## **Current Minute Slider (Manual Mode)**
Manually scrub through minutes 0-86 to explore different entry points. The simulation table updates to show what happens if you enter at that specific minute.

---

## **Start Now Button**
Switches to live mode and starts a real-time countdown/timer. The current minute will automatically advance every 60 seconds (or every 3 seconds if 20x speed is enabled). Use this to simulate a live launch in real-time.

---

## **Stop Button**
Stops the live timer and returns to manual mode. Resets the current minute back to 0.

---

## **20x Speed Mode** (checkbox, only visible in live mode)
Accelerates time so the full 86 minutes completes in ~4 minutes 18 seconds. Each real second = 20 simulated seconds.

---

## **Record Entry Button**
Takes a snapshot of your current parameters (investment amount, current minute, market cap, tokens bought, breakeven price) and saves it to the Recorded Entries table. This lets you compare multiple entry scenarios side-by-side.

---

## **Recorded Entries Table**
Displays all your saved entries with:
- **Edit**: Modify investment, minute, or tokens for that entry
- **Delete**: Remove that entry
- **Clear All**: Delete all recorded entries
- **Export to HTML/CSV**: Download your strategy for reference

The TOTALS row shows your overall breakeven across all entries (properly weighted, not a simple average).

---

## **86-Minute Simulation Table**
Shows the full 86-minute projection based on your current parameters. Each row displays:
- Buy tax % for that minute
- Projected market cap and price
- Tokens you'd get with your investment amount
- Breakeven price/MC needed to exit profitably (accounting for 10% sell tax)

