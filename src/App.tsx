import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing'
import LaunchSimulator from './pages/LaunchSimulator'
import ExitStrategy from './pages/ExitStrategy'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/launch-simulator" element={<LaunchSimulator />} />
        <Route path="/exit-strategy" element={<ExitStrategy />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
