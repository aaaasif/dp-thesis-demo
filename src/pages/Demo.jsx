import { useState } from 'react'
import PageTransition from '../components/PageTransition.jsx'
import Card from '../components/Card.jsx'
import NoiseViz from '../components/NoiseViz.jsx'
import Spinner from '../components/Spinner.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { api } from '../lib/api.js'
import { DATASETS, MODEL, RESULTS, PRIVACY_SETTINGS } from '../data/results.js'

export default function Demo() {
  const toast = useToast()
  const [dataset, setDataset]         = useState('BloodMNIST')
  const [method, setMethod]           = useState('DP-SGD ε=8')
  const [clip, setClip]               = useState(1.5)
  const [sampleIndex, setSampleIndex] = useState(0)
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [source, setSource]           = useState(null)

  const ds  = DATASETS[dataset]
  const cfg = RESULTS[dataset][method]

  async function runInference() {
    setLoading(true); setResult(null)
    try {
      const data = await api.predict({
        dataset,
        epsilon: cfg.eps,            // null for baseline
        clip_norm: clip,
        sample_index: sampleIndex
      })
      setResult(data)
      setSource('api')
    } catch (e) {
      toast.error(`Backend unreachable: ${e.message}. Using local mock.`)
      setResult(localMock(ds, cfg))
      setSource('local')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="grid gap-6">
        <Card
          title="DP-SGD Live Demo"
          subtitle="Pick a configuration and run a single-image inference through the trained model."
        >
          <div className="grid md:grid-cols-4 gap-4">
            <Field label="Dataset">
              <select
                value={dataset}
                onChange={e => { setDataset(e.target.value); setResult(null) }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {Object.keys(DATASETS).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>

            <Field label="Privacy setting">
              <select
                value={method}
                onChange={e => { setMethod(e.target.value); setResult(null) }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {PRIVACY_SETTINGS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </Field>

            <Field label={`Clipping norm C = ${clip.toFixed(1)}`}>
              <input
                type="range"
                min="0.1" max="3.0" step="0.1"
                value={clip}
                onChange={e => setClip(parseFloat(e.target.value))}
                className="w-full accent-brand-teal"
                aria-label="Clipping norm C"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>0.1</span><span>1.5</span><span>3.0</span>
              </div>
            </Field>

            <Field label="Sample index">
              <input
                type="number" min="0" max="9999"
                value={sampleIndex}
                onChange={e => setSampleIndex(parseInt(e.target.value || '0', 10))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono"
                aria-label="Sample index"
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={runInference}
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-brand-navy text-white font-medium text-sm disabled:opacity-60 hover:bg-brand-navyDeep transition-colors"
            >
              {loading ? 'Running…' : 'Run Inference'}
            </button>
            {loading && <Spinner label="Calling backend" />}
            <p className="text-xs text-slate-500">
              Target accuracy:&nbsp;
              <span className="font-semibold text-brand-navy">{cfg.acc.toFixed(2)}%</span>
              {cfg.eps != null && <> · δ = {MODEL.delta.toExponential(0)}</>}
            </p>
            {source && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                source: {source === 'api' ? 'FastAPI' : 'in-browser fallback'}
              </span>
            )}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Prediction">
            {!result && <p className="text-sm text-slate-500">Run the model to see a prediction.</p>}
            {result && <Prediction result={result} ds={ds} />}
          </Card>

          <Card title="Privacy budget">
            <BudgetPanel method={method} eps={cfg.eps} delta={MODEL.delta} />
          </Card>
        </div>

        <Card
          title="Per-sample gradient transformation"
          subtitle="Original ▸ Clipped (‖·‖₂ ≤ C) ▸ Clipped + Gaussian noise (σ scales with C / ε)"
        >
          <NoiseViz
            epsilon={cfg.eps ?? 0}
            clip={clip}
            demo={result?.gradient_demo}
          />
          <p className="text-[11px] text-slate-500 mt-3 italic">
            {result?.gradient_demo
              ? `Live from backend · σ = ${result.gradient_demo.sigma.toFixed(3)}.`
              : 'Illustrative only — real per-sample gradients are 814,056-dimensional.'}
          </p>
        </Card>
      </div>
    </PageTransition>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  )
}

function Prediction({ result, ds }) {
  // Backend may return labels by name or index. Support both.
  const classes = result.classes || ds.classNames
  const truthIdx = typeof result.true_label === 'string'
    ? classes.indexOf(result.true_label)
    : result.ground_truth ?? 0
  const predIdx  = typeof result.pred_label === 'string'
    ? classes.indexOf(result.pred_label)
    : result.predicted_class ?? 0
  const correct  = result.correct ?? (predIdx === truthIdx)
  const probs    = result.probabilities || result.class_probs || []

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-16 h-16 rounded-lg grid place-items-center text-[11px] font-mono border-2 ${
            correct
              ? 'bg-green-50 border-green-400 text-green-700'
              : 'bg-red-50 border-red-400 text-red-700'
          }`}
        >
          28×28
        </div>
        <div>
          <div className="text-xs text-slate-500">Predicted</div>
          <div className="text-lg font-semibold text-brand-navy">
            {classes[predIdx] ?? '—'}
          </div>
          <div className="text-xs text-slate-500">
            Ground truth: <span className="font-medium text-slate-700">{classes[truthIdx] ?? '—'}</span>{' '}
            {correct
              ? <span className="text-green-600 font-semibold">✓</span>
              : <span className="text-red-600 font-semibold">✗</span>}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {probs.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="w-28 truncate text-slate-600">{classes[i]}</span>
            <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden">
              <div
                className={`h-2 ${i === predIdx ? 'bg-brand-navy' : 'bg-brand-teal/60'}`}
                style={{ width: `${(p * 100).toFixed(1)}%` }}
              />
            </div>
            <span className="font-mono text-slate-500 w-12 text-right">{(p * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BudgetPanel({ method, eps, delta }) {
  if (eps == null) {
    return (
      <div className="text-sm">
        <p className="text-slate-600">
          <span className="font-semibold text-brand-navy">No DP.</span>{' '}
          Baseline trains without privacy accounting — no ε / δ budget spent.
        </p>
        <p className="text-xs text-slate-500 mt-2">Reference only. Not a deployable private model.</p>
      </div>
    )
  }
  const pct = Math.min(100, (eps / 8) * 100)
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>ε spent: <span className="font-mono font-semibold text-brand-navy">{eps.toFixed(2)}</span></span>
        <span>δ = <span className="font-mono">{delta.toExponential(0)}</span></span>
      </div>
      <div className="h-3 bg-slate-100 rounded overflow-hidden">
        <div
          className="h-3 bg-gradient-to-r from-brand-teal to-brand-navy"
          style={{ width: `${pct}%` }}
          aria-label={`Privacy budget: ${eps} of 8`}
        />
      </div>
      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
        Lower ε ⇒ stronger privacy, generally lower utility. Tracked end-to-end via the RDP accountant.
      </p>
    </div>
  )
}

function localMock(ds, cfg) {
  const n = ds.numClasses
  const truth = Math.floor(Math.random() * n)
  const acc = cfg.acc / 100
  const pred = Math.random() < acc
    ? truth
    : (truth + 1 + Math.floor(Math.random() * (n - 1))) % n

  const logits = Array.from({ length: n }, () => Math.random() - 0.5)
  logits[pred] += 2.0 + acc * 2.5
  const m = Math.max(...logits)
  const exps = logits.map(l => Math.exp(l - m))
  const s = exps.reduce((a, b) => a + b, 0)
  const probs = exps.map(e => e / s)

  return {
    classes: ds.classNames,
    true_label: ds.classNames[truth],
    pred_label: ds.classNames[pred],
    correct: pred === truth,
    probabilities: probs,
    gradient_demo: null
  }
}