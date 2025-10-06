import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing'
import LaunchSimulator from './pages/LaunchSimulator'
import LaunchStrategyPlanner from './pages/LaunchStrategyPlanner'
import ExitStrategy from './pages/ExitStrategy'
import AllMetrics from './pages/AllMetrics'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/launch-simulator" element={<LaunchSimulator />} />
        <Route path="/launch-strategy-planner" element={<LaunchStrategyPlanner />} />
        <Route path="/exit-strategy" element={<ExitStrategy />} />
        <Route path="/all-metrics" element={<AllMetrics />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
