import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition.jsx'
import Card from '../components/Card.jsx'

const STEPS = [
  {
    title: 'Open with the thesis statement',
    route: '/',
    target: 'Hero card on Home',
    say:
      'State the title, your name, and Prof. Hu Dasha as supervisor. Frame the question: medical-image classifiers leak training data — how do we keep them useful while bounding that leakage?'
  },
  {
    title: 'Walk through the system architecture',
    route: '/',
    target: 'Architecture diagram (Figure 7)',
    say:
      'Five stages: Data → Model → DP Layer → Evaluation → Output. The DP Layer is where per-sample gradients are clipped to L₂ norm C and Gaussian noise is injected. The RDP accountant tracks ε spent.'
  },
  {
    title: 'Introduce the two benchmarks',
    route: '/datasets',
    target: 'Dataset Explorer + stat cards',
    say:
      'BloodMNIST — 8 classes, ~12k train, peripheral blood smears. PathMNIST — 9 classes, ~90k train, colorectal histology. Both 28×28×3. The size gap is the headline variable in our results.'
  },
  {
    title: 'Show class distribution',
    route: '/datasets',
    target: 'Class distribution bar chart',
    say:
      'BloodMNIST is mildly imbalanced; PathMNIST is broadly balanced. This matters: under DP-SGD, rare classes lose more accuracy because they contribute fewer per-sample gradients per batch.'
  },
  {
    title: 'Run a Baseline (no-DP) inference',
    route: '/demo',
    target: 'Demo page — pick Baseline, click Run',
    say:
      'Baseline is the upper bound: 93.60% on BloodMNIST, 88.62% on PathMNIST. No noise, no privacy guarantee. Use this as the reference point for everything that follows.'
  },
  {
    title: 'Switch to DP-SGD ε = 8 — observe the noise',
    route: '/demo',
    target: 'Demo page — pick DP-SGD ε=8, watch the gradient panel',
    say:
      'Original gradient → clipped at C → clipped + Gaussian noise. The third panel is what the optimizer actually sees. Mention that σ scales with C / ε in our calibration.'
  },
  {
    title: 'Highlight the privacy budget meter',
    route: '/demo',
    target: 'Privacy budget panel',
    say:
      'ε is the multiplicative privacy loss bound; δ = 10⁻⁵ is the small failure probability. We fix δ and sweep ε ∈ {1, 4, 8}. Lower ε ⇒ stronger privacy ⇒ generally lower utility.'
  },
  {
    title: 'Show the privacy–utility curve',
    route: '/results',
    target: 'Privacy–utility curve (line chart)',
    say:
      'The two curves separate clearly. PathMNIST stays near 84% across all ε; BloodMNIST drops to 68.58% at ε = 1. The curve flattens as ε grows — diminishing returns past ε ≈ 4.'
  },
  {
    title: 'Explain the dataset-size effect',
    route: '/results',
    target: 'Dataset size vs. accuracy drop bar chart',
    say:
      'BloodMNIST loses ~16 pp at ε = 8; PathMNIST loses ~4.6 pp. The 7.5× larger training set lets PathMNIST average DP noise over more per-sample gradients per step. Scale dominates the privacy–utility trade-off here.'
  },
  {
    title: 'Close with clipping sensitivity + RGP/GEP scope',
    route: '/results',
    target: 'Clipping sensitivity + Method comparison table',
    say:
      'Optimal C ∈ [1.0, 2.0], with C = 1.5 reported in Table 2. Note explicitly that RGP and GEP are marked † — theoretical comparison only, not re-implemented because no production library was available. Future work.'
  }
]

export default function DemoScript() {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const pct = ((i + 1) / STEPS.length) * 100

  return (
    <PageTransition>
      <div className="grid gap-6 max-w-3xl mx-auto print:max-w-none">
        <Card>
          <p className="text-xs uppercase tracking-[0.15em] text-brand-teal font-semibold">
            Defence walkthrough
          </p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-bold text-brand-navy">10-step scripted demo</h1>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 print:hidden"
            >
              Print all steps
            </button>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Click <em>Next</em> as you progress through your defence. Each step tells you which page
            to open and what to say. Open this on your phone or second screen.
          </p>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden print:hidden">
            <div className="h-1.5 bg-brand-teal transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-1 print:hidden">
            Step {i + 1} of {STEPS.length}
          </div>
        </Card>

        {/* Live mode — single active step */}
        <div className="print:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
            >
              <Card
                title={`Step ${i + 1} · ${step.title}`}
                subtitle={`Page: ${step.route}  ·  Target: ${step.target}`}
              >
                <p className="text-sm text-slate-700 leading-relaxed">{step.say}</p>
                <div className="mt-4">
                  <Link
                    to={step.route}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs rounded-lg bg-brand-teal text-white font-medium hover:bg-teal-700"
                  >
                    Open {step.route} in new tab ↗
                  </Link>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex justify-between items-center">
            <button
              onClick={() => setI(Math.max(0, i - 1))}
              disabled={i === 0}
              className="px-4 py-2 text-sm rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-50 hover:bg-slate-50"
            >
              ← Previous
            </button>
            <button
              onClick={() => setI(Math.min(STEPS.length - 1, i + 1))}
              disabled={i === STEPS.length - 1}
              className="px-4 py-2 text-sm rounded-lg bg-brand-navy text-white disabled:opacity-50 hover:bg-brand-navyDeep"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Print mode — all steps stacked */}
        <div className="hidden print:grid gap-4">
          {STEPS.map((s, idx) => (
            <div key={idx} className="break-inside-avoid border-b border-slate-200 pb-4">
              <h2 className="text-base font-semibold text-brand-navy">
                Step {idx + 1}. {s.title}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {s.route} · {s.target}
              </p>
              <p className="text-sm text-slate-800 mt-2">{s.say}</p>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  )
}