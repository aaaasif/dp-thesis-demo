import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import PageTransition from '../components/PageTransition.jsx'
import Card from '../components/Card.jsx'
import Spinner from '../components/Spinner.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { useAsync } from '../lib/useAsync.js'
import { api } from '../lib/api.js'
import { DATASETS } from '../data/results.js'

export default function Datasets() {
  const toast = useToast()
  const [selected, setSelected] = useState('BloodMNIST')

  const dsQ = useAsync(() => api.datasets(), [])
  const samplesQ = useAsync(() => api.samplesIndex(selected), [selected])

  if (dsQ.error && !dsQ.loading) {
    toast.error?.(`Backend offline: ${dsQ.error}. Using local cache.`)
  }

  // Defensive: backend may return [] or { datasets: [] } depending on wrapper
  const dsList = Array.isArray(dsQ.data)
    ? dsQ.data
    : Array.isArray(dsQ.data?.datasets)
      ? dsQ.data.datasets
      : []
  const fromApi = dsList.find(d => d.name === selected)

  const local = DATASETS[selected]
  const ds = fromApi
    ? { ...local, ...fromApi, classNames: fromApi.classes, classCounts: local.classCounts }
    : local

  const distData = ds.classNames.map((c, i) => ({ name: c, count: ds.classCounts[i] }))

  const samplesIndex = Array.isArray(samplesQ.data?.classes)
    ? samplesQ.data.classes
    : []

  return (
    <PageTransition>
      <div className="grid gap-6">
        <Card
          title="Dataset Explorer"
          subtitle="Pick a benchmark to inspect class balance and representative samples."
          action={(dsQ.loading || samplesQ.loading) && <Spinner label="Fetching…" />}
        >
          <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Dataset selector">
            {Object.keys(DATASETS).map(k => (
              <button
                key={k}
                role="tab"
                aria-selected={selected === k}
                onClick={() => setSelected(k)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selected === k
                    ? 'bg-brand-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </Card>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Train set"  value={(ds.num_train ?? ds.trainSize).toLocaleString()} />
          <Stat label="Test set"   value={(ds.num_test  ?? ds.testSize).toLocaleString()} />
          <Stat label="Classes"    value={ds.num_classes ?? ds.numClasses} />
          <Stat label="Image size" value={ds.imageSize}  />
        </div>

        <Card
          title="Class distribution"
          subtitle="Training-set count per class"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  angle={-28}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 11 }}
                  height={70}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#0d948820' }} />
                <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Sample images"
          subtitle="Real test-set patches served by the backend (MedMNIST v2)"
          action={samplesQ.loading && <Spinner label="Loading samples…" />}
        >
          {samplesQ.error && (
            <p className="text-sm text-red-600 mb-3">
              Backend sample endpoint unreachable: {samplesQ.error}.{' '}
              Make sure the backend is running and <code>medmnist</code> is installed.
            </p>
          )}

          {(!ds.classNames || ds.classNames.length === 0) ? (
            <p className="text-sm text-slate-500">No class names available.</p>
          ) : (
            <div className="space-y-5">
              {ds.classNames.map((cls, i) => {
                const count = samplesIndex[i]?.sample_count ?? 0
                return (
                  <div key={cls}>
                    <div className="flex items-baseline justify-between mb-2">
                      <div className="text-xs font-semibold text-slate-700">{cls}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        class {i} · {count > 0 ? `${count} samples` : 'loading…'}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <SampleImg
                          key={j}
                          dataset={selected}
                          classIdx={i}
                          sampleIdx={j}
                          label={`${cls} sample ${j + 1}`}
                          available={count === 0 ? true : j < count}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}

function SampleImg({ dataset, classIdx, sampleIdx, label, available }) {
  const [ok, setOk] = useState(true)
  const [loaded, setLoaded] = useState(false)

  if (!available || !ok) {
    return (
      <div
        className="aspect-square rounded-lg border border-slate-200 grid place-items-center text-[10px] text-slate-400 font-mono bg-slate-50"
        aria-label={`${label} (not available)`}
        role="img"
      >
        n/a
      </div>
    )
  }

  return (
    <div className="relative aspect-square">
      {!loaded && (
        <div className="absolute inset-0 rounded-lg bg-slate-100 animate-pulse" />
      )}
      <img
        src={api.sampleUrl(dataset, classIdx, sampleIdx)}
        alt={label}
        onError={() => setOk(false)}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 w-full h-full rounded-lg border border-slate-200 object-cover transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ imageRendering: 'pixelated' }}
        loading="lazy"
        decoding="async"
        fetchpriority="low"
      />
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-brand-navy">{value}</div>
    </div>
  )
}