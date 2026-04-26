import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Datasets from './pages/Datasets.jsx'
import Demo from './pages/Demo.jsx'
import Upload from './pages/Upload.jsx'
import Results from './pages/Results.jsx'
import About from './pages/About.jsx'
import DemoScript from './pages/DemoScript.jsx'

export default function App() {
  const location = useLocation()
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white px-3 py-1 rounded shadow">
        Skip to main content
      </a>
      <Navbar />
      <main id="main" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"             element={<Home />} />
            <Route path="/datasets"     element={<Datasets />} />
            <Route path="/demo"         element={<Demo />} />
            <Route path="/upload"       element={<Upload />} />
            <Route path="/results"      element={<Results />} />
            <Route path="/about"        element={<About />} />
            <Route path="/demo-script"  element={<DemoScript />} />
            <Route path="*"             element={<Home />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}