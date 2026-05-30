import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Roster from './pages/Roster'
import Schedule from './pages/Schedule'
import SubmitScore from './pages/SubmitScore'
import Results from './pages/Results'
import Rules from './pages/Rules'
import ErrorBoundary from './components/ErrorBoundary'

const Admin = lazy(() => import('./pages/Admin'))

export default function App() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--slate)' }}>
      <Nav />
      <ErrorBoundary>
        <Suspense fallback={<p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>Loading…</p>}>
          <Routes>
            <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
            <Route path="/roster" element={<ErrorBoundary><Roster /></ErrorBoundary>} />
            <Route path="/schedule" element={<ErrorBoundary><Schedule /></ErrorBoundary>} />
            <Route path="/submit" element={<ErrorBoundary><SubmitScore /></ErrorBoundary>} />
            <Route path="/results" element={<ErrorBoundary><Results /></ErrorBoundary>} />
            <Route path="/rules" element={<ErrorBoundary><Rules /></ErrorBoundary>} />
            <Route path="/admin" element={<ErrorBoundary><Admin /></ErrorBoundary>} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
