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
            GOOD VIBES CLUB
          </h1>
          
          {/* Tagline - Grungy */}
          <p className="text-grungy text-base md:text-lg mb-8">
            COMMUNITY PERPETUAL STRATEGY SIMULATORS
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 pb-16">
        {/* All Strategies Overview */}
        <div className="mb-16">
          <StrategyOverview showTitle={true} />
        </div>

        {/* Hero Cards Grid - PUNK & MINIMAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Launch Simulator Card */}
          <Link to="/launch-simulator" className="block group">
            <div className="border-punk glass-card rounded-lg p-10 h-full hover-lift hover-border transition-all duration-300">
              <div className="flex flex-col h-full">
                <h2 className="text-3xl font-black mb-5 text-white uppercase tracking-tight">
                  NEW TOKEN LAUNCH SIMULATOR
                </h2>
                
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                  Optimize entry timing for new token launches with the dynamic tax system
                </p>
                
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Dynamic Tax 95% → 10%</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">ROI Calculator</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Entry Optimizer</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Scenario Comparison</span>
                  </li>
                </ul>
                
                <button className="btn-punk w-full">
                  Enter →
                </button>
              </div>
            </div>
          </Link>

          {/* Launch Strategy Planner Card */}
          <Link to="/launch-strategy-planner" className="block group">
            <div className="border-punk glass-card rounded-lg p-10 h-full hover-lift hover-border transition-all duration-300">
              <div className="flex flex-col h-full">
                <h2 className="text-3xl font-black mb-5 text-white uppercase tracking-tight">
                  $VIBESTR LAUNCH SIMULATOR
                </h2>
                
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                  Plan multiple entries with real-time tracking and comprehensive exports
                </p>
                
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Multi-Entry Recording</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Manual & Live Modes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">CSV & HTML Export</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Entry Editing System</span>
                  </li>
                </ul>
                
                <div className="mb-4 text-xs text-gray-500 flex items-center gap-2">
                  <span>💻</span>
                  <span>Model developed by <a href="https://x.com/Gabo_Anany" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors" onClick={(e) => e.stopPropagation()}>@Gabo_Anany</a></span>
                </div>
                
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
                  PORTFOLIO TRACKER / EXIT STRATEGY
                </h2>
                
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                  Track your portfolio and plan strategic exits across market cap targets
                </p>
                
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">6 Strategies Live</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Exit Calculator</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Drag Reorder</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold">—</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Print/PDF</span>
                  </li>
                </ul>
                
                <button className="btn-punk w-full">
                  Enter →
                </button>
              </div>
            </div>
          </Link>
        </div>

        {/* Donation Section */}
        <div className="mt-16 mb-8 text-center">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">
            Donations not encouraged but appreciated
          </p>
          <div className="inline-flex items-center gap-3 glass-card border-punk rounded-lg px-6 py-3">
            <span className="text-xs text-gray-500">ETH</span>
            <code className="text-xs font-mono text-white">
              0xB41Df8AC75d771180d2EB673A10C9FCD0b8418EF
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText('0xB41Df8AC75d771180d2EB673A10C9FCD0b8418EF')
              }}
              className="text-gray-500 hover:text-white transition-colors text-xs"
              title="Copy address"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-800">
          <p>Data from DexScreener API • Updates every 30s</p>
        </div>
      </div>
    </div>
  )
}


