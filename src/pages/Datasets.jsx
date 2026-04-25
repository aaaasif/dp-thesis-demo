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

  // Backend metadata (authoritative when up). Class counts always local —
  // backend doesn't expose per-class counts; replace with real values pre-defence.
  const { data, loading, error } = useAsync(() => api.datasets(), [])

  if (error && data == null) {
    // first load failed — toast once
    if (!loading) toast.error?.(`Backend offline: ${error}. Using local cache.`)
  }

  const fromApi = data?.find(d => d.name === selected)
  const local   = DATASETS[selected]
  const ds = fromApi
    ? { ...local, ...fromApi, classNames: fromApi.classes, classCounts: local.classCounts }
    : local

  const distData = ds.classNames.map((c, i) => ({ name: c, count: ds.classCounts[i] }))

  return (
    <PageTransition>
      <div className="grid gap-6">
        <Card
          title="Dataset Explorer"
          subtitle="Pick a benchmark to inspect class balance and representative samples."
          action={loading && <Spinner label="Fetching metadata…" />}
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
          subtitle="Training-set count per class (illustrative — replace with exact MedMNIST v2 counts)"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" angle={-28} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={70} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#0d948820' }} />
                <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Sample images"
          subtitle="Eight placeholder patches per class. Swap with real MedMNIST v2 samples before defence."
        >
          <div className="space-y-5">
            {ds.classNames.map((cls, i) => (
              <div key={cls}>
                <div className="text-xs font-semibold text-slate-700 mb-2">{cls}</div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <div
                      key={j}
                      className="aspect-square rounded-lg border border-slate-200 grid place-items-center text-[10px] text-slate-400 font-mono"
                      style={{ background: `linear-gradient(135deg, ${swatch(i, j)} 0%, white 100%)` }}
                      aria-label={`${cls} sample ${j + 1}`}
                      role="img"
                    >
                      28×28
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
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

function swatch(i, j) {
  const palette = [
    '#fef3c7', '#fecaca', '#bfdbfe', '#bbf7d0', '#e9d5ff',
    '#fed7aa', '#a5f3fc', '#fecdd3', '#ddd6fe'
  ]
  return palette[(i * 3 + j) % palette.length]
}