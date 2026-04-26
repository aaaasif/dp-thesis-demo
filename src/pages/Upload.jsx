import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition.jsx'
import Card from '../components/Card.jsx'
import Spinner from '../components/Spinner.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { api } from '../lib/api.js'
import { DATASETS, MODEL, PRIVACY_SETTINGS } from '../data/results.js'

const MAX_BYTES = 4 * 1024 * 1024
const ACCEPT = 'image/png,image/jpeg,image/webp,image/bmp'

export default function Upload() {
  const toast = useToast()
  const inputRef = useRef(null)
  const [dataset, setDataset] = useState('BloodMNIST')
  const [method, setMethod]   = useState('DP-SGD ε=8')
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [drag, setDrag]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)

  const eps = method === 'Baseline' ? null : Number(method.split('=')[1])
  const classes = DATASETS[dataset].classNames

  function pickFile(f) {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG/JPEG/WEBP/BMP).')
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error('File exceeds the 4 MB upload limit.')
      return
    }
    setFile(f)
    setResult(null)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  async function runUpload() {
    if (!file) {
      toast.info('Pick an image first.')
      return
    }
    setLoading(true); setResult(null)
    try {
      const data = await api.upload(file, dataset, eps)
      setResult(data)
      toast.success('Image processed privately on the server.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setFile(null)
    setResult(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <PageTransition>
      <div className="grid gap-6">
        <Card>
          <p className="text-xs uppercase tracking-[0.15em] text-brand-teal font-semibold mb-2">
            Private upload demo
          </p>
          <h1 className="text-2xl font-bold text-brand-navy">
            Upload an image — released under (ε, δ)-DP
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Upload any image. The backend strips EXIF metadata, centre-crops it
            to 28×28 RGB, and applies the Gaussian mechanism at the chosen
            privacy budget (δ = {MODEL.delta.toExponential(0)}). The original
            bytes are never written to disk.
          </p>
        </Card>

        <Card title="Configure">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Dataset (used for label set)">
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
          </div>
        </Card>

        <Card
          title="Pick an image"
          subtitle="PNG / JPEG / WEBP / BMP · up to 4 MB"
          action={file && (
            <button
              onClick={reset}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
            >
              Clear
            </button>
          )}
        >
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => {
              e.preventDefault(); setDrag(false)
              pickFile(e.dataTransfer.files?.[0])
            }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              drag
                ? 'border-brand-teal bg-brand-tealSoft/40'
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
            }`}
            role="button"
            tabIndex={0}
            aria-label="Drag an image here or click to browse"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={e => pickFile(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex flex-col items-center gap-3">
                {preview && (
                  <img
                    src={preview}
                    alt="Selected upload preview"
                    className="max-h-40 rounded-lg shadow-soft"
                  />
                )}
                <div className="text-sm text-slate-700">
                  <span className="font-medium">{file.name}</span>{' '}
                  <span className="text-slate-400 font-mono text-xs">
                    ({Math.round(file.size / 1024)} KB · {file.type})
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-slate-700">
                  Drag &amp; drop an image, or click to browse
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  PNG · JPEG · WEBP · BMP — up to 4 MB
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={runUpload}
              disabled={!file || loading}
              className="px-5 py-2 rounded-lg bg-brand-navy text-white font-medium text-sm disabled:opacity-50 hover:bg-brand-navyDeep transition-colors"
            >
              {loading ? 'Processing…' : 'Run private inference'}
            </button>
            {loading && <Spinner label="Calling backend" />}
            <p className="text-xs text-slate-500">
              ε = <span className="font-mono">{eps ?? 'baseline'}</span> · δ ={' '}
              <span className="font-mono">{MODEL.delta.toExponential(0)}</span>
            </p>
          </div>
        </Card>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6"
          >
            <Card
              title="Image transformation"
              subtitle="Original (sanitised) → resized to 28×28 → DP-released"
            >
              <div className="grid grid-cols-3 gap-4">
                <ImagePane
                  src={result.image_original_b64}
                  caption="Sanitised original"
                  detail="EXIF stripped, ≤ 256×256 thumbnail"
                />
                <ImagePane
                  src={result.image_28x28_b64}
                  caption="Model input (28×28)"
                  detail="Centre-cropped, bilinear resized"
                />
                <ImagePane
                  src={result.image_dp_b64}
                  caption={`DP release${eps ? ` · ε = ${eps}` : ' (no DP)'}`}
                  detail={
                    eps
                      ? `σ_visual = ${result.sigma_visual.toFixed(1)} · σ_strict ≈ ${result.sigma_strict.toFixed(0)}`
                      : 'Baseline · no Gaussian noise'
                  }
                  highlight
                />
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card title="Prediction">
                <div className="mb-3">
                  <div className="text-xs text-slate-500">Predicted class</div>
                  <div className="text-lg font-semibold text-brand-navy">
                    {result.pred_label}
                  </div>
                </div>
                <div className="space-y-1">
                  {result.probabilities.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className="w-28 truncate text-slate-600">{classes[i]}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden">
                        <div
                          className={`h-2 ${
                            classes[i] === result.pred_label ? 'bg-brand-navy' : 'bg-brand-teal/60'
                          }`}
                          style={{ width: `${(p * 100).toFixed(1)}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-500 w-12 text-right">
                        {(p * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Privacy &amp; security notes">
                <ul className="text-sm text-slate-700 space-y-2 list-disc list-inside leading-relaxed">
                  {result.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 grid grid-cols-2 gap-3">
                  <div>
                    <div className="uppercase tracking-wider text-[10px]">ε spent</div>
                    <div className="font-mono text-brand-navy text-base font-semibold">
                      {result.privacy_spent.epsilon || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider text-[10px]">δ</div>
                    <div className="font-mono text-brand-navy text-base font-semibold">
                      {result.privacy_spent.delta.toExponential(0)}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
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

function ImagePane({ src, caption, detail, highlight = false }) {
  return (
    <div className="text-center">
      <div
        className={`aspect-square w-full rounded-xl border-2 overflow-hidden bg-slate-50 ${
          highlight ? 'border-brand-teal' : 'border-slate-200'
        }`}
      >
        <img
          src={src}
          alt={caption}
          className="w-full h-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <div className={`mt-2 text-xs font-semibold ${highlight ? 'text-brand-teal' : 'text-slate-700'}`}>
        {caption}
      </div>
      <div className="text-[10px] text-slate-500 font-mono">{detail}</div>
    </div>
  )
}