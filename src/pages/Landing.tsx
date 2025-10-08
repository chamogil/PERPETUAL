import { Link } from 'react-router-dom'
import StrategyOverview from '../components/StrategyOverview'

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section - Punk & Minimal */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-[1200px] mx-auto px-6 py-20 text-center">
          {/* Main Title - MASSIVE, BOLD, WHITE */}
          <h1 className="text-6xl md:text-7xl lg:text-9xl font-black mb-6 tracking-tighter text-white">
            VIBE WHEELING
          </h1>
          
          {/* Tagline - Grungy */}
          <p className="text-grungy text-base md:text-lg mb-8">
            Tools for strategy token traders.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 pb-16">
        {/* Hero Cards Grid - PUNK & MINIMAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Launch Simulator Card */}
          <Link to="/launch-simulator" className="block group">
            <div className="border-punk glass-card rounded-lg p-10 h-full hover-lift hover-border transition-all duration-300">
              <div className="flex flex-col h-full">
                <h2 className="text-3xl font-black mb-5 text-white uppercase tracking-tight">
                  LAUNCH SIMULATOR
                </h2>
                
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                  Model new token launches with tax rates, entry timing, and ROI calculations
                </p>
                
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Tax Rate Slider (10%-99%)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Entry/Exit Market Cap Targets</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">ROI Calculator (After Tax)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Historical Mode (Real Launch Data)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Quick Comparison (7 Entry Times)</span>
                  </li>
                </ul>
                
                <button className="btn-punk w-full">
                  Enter →
                </button>
              </div>
            </div>
          </Link>

          {/* Exit Strategy Card */}
          <Link to="/exit-strategy" className="block group">
            <div className="border-punk glass-card rounded-lg p-10 h-full hover-lift hover-border transition-all duration-300">
              <div className="flex flex-col h-full">
                <h2 className="text-3xl font-black mb-5 text-white uppercase tracking-tight">
                  EXIT STRATEGY
                </h2>
                
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                  Track your portfolio and plan exits with preset strategies or custom targets
                </p>
                
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Wallet Integration (Auto-Load)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Preset Templates (Conservative/Balanced/Risky)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Real-Time P/L Tracking</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Custom Target MCAP</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Drag Reorder + Print/Export</span>
                  </li>
                </ul>
                
                <button className="btn-punk w-full">
                  Enter →
                </button>
              </div>
            </div>
          </Link>

          {/* Instant Profit Card */}
          <Link to="/instant-profit" className="block group">
            <div className="border-punk glass-card rounded-lg p-10 h-full hover-lift hover-border transition-all duration-300">
              <div className="flex flex-col h-full">
              <h2 className="text-3xl font-black mb-5 text-white uppercase tracking-tight">
                BREAK EVEN LIVE
              </h2>
              
              <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                Track live launches with real-time break-even and profit targets
              </p>
                
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Dynamic Token Addition</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Wallet Auto-Load (Etherscan)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Live Price Updates (10s)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Embedded Price Chart</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Profit Targets with Alerts</span>
                  </li>
                </ul>
                
                <button className="btn-punk w-full">
                  Enter →
                </button>
              </div>
            </div>
          </Link>
        </div>

        {/* All Strategies Overview */}
        <div className="mb-16">
          <StrategyOverview showTitle={true} />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-800">
          <p>Data from DexScreener API • Updates every 30s</p>
        </div>
      </div>
    </div>
  )
}


