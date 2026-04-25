import { useState, useMemo } from 'react'
import PageTransition from '../components/PageTransition.jsx'
import Card from '../components/Card.jsx'
import ConfusionMatrix from '../components/ConfusionMatrix.jsx'
import {
  DATASETS, RESULTS,
  CLIPPING_SENSITIVITY, CLIPPING_OPTIMAL_BAND,
  METHODS, CONFUSION, CONFUSION_NOTE, MODEL
} from '../data/results.js'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, BarChart, Bar, ReferenceArea
} from 'recharts'

const EPSILONS = [1, 4, 8]

export default function Results() {
  const [dataset, setDataset] = useState('BloodMNIST')
  const [method, setMethod]   = useState('DP-SGD ε=8')

  const privUtilData = EPSILONS.map(eps => ({
    eps,
    BloodMNIST: RESULTS.BloodMNIST[`DP-SGD ε=${eps}`].acc,
    PathMNIST:  RESULTS.PathMNIST[`DP-SGD ε=${eps}`].acc
  }))

  const drops = [
    {
      dataset: 'BloodMNIST',
      trainSize: DATASETS.BloodMNIST.trainSize,
      baseline: RESULTS.BloodMNIST.Baseline.acc,
      eps8:     RESULTS.BloodMNIST['DP-SGD ε=8'].acc,
      drop: +(RESULTS.BloodMNIST.Baseline.acc - RESULTS.BloodMNIST['DP-SGD ε=8'].acc).toFixed(2)
    },
    {
      dataset: 'PathMNIST',
      trainSize: DATASETS.PathMNIST.trainSize,
      baseline: RESULTS.PathMNIST.Baseline.acc,
      eps8:     RESULTS.PathMNIST['DP-SGD ε=8'].acc,
      drop: +(RESULTS.PathMNIST.Baseline.acc - RESULTS.PathMNIST['DP-SGD ε=8'].acc).toFixed(2)
    }
  ]

  const cm = useMemo(() => CONFUSION[`${dataset}|${method}`], [dataset, method])
  const labels = DATASETS[dataset].classNames

  return (
    <PageTransition>
      <div className="grid gap-6">
        {/* Main table */}
        <Card
          title="Main results"
          subtitle={`Test accuracy (%) · δ = ${MODEL.delta.toExponential(0)} · DP-SGD empirical`}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b">
                  <th className="py-2 pr-4">Dataset</th>
                  <th className="py-2 pr-4">Baseline</th>
                  <th className="py-2 pr-4">ε = 1</th>
                  <th className="py-2 pr-4">ε = 4</th>
                  <th className="py-2 pr-4">ε = 8</th>
                  <th className="py-2">Drop @ ε=8</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(RESULTS).map(d => {
                  const r = RESULTS[d]
                  const drop = (r.Baseline.acc - r['DP-SGD ε=8'].acc).toFixed(2)
                  return (
                    <tr key={d} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-semibold text-brand-navy">{d}</td>
                      <td className="py-2 pr-4 font-mono">{r.Baseline.acc.toFixed(2)}%</td>
                      <td className="py-2 pr-4 font-mono">{r['DP-SGD ε=1'].acc.toFixed(2)}%</td>
                      <td className="py-2 pr-4 font-mono">{r['DP-SGD ε=4'].acc.toFixed(2)}%</td>
                      <td className="py-2 pr-4 font-mono">{r['DP-SGD ε=8'].acc.toFixed(2)}%</td>
                      <td className="py-2 font-mono text-red-600">−{drop} pp</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Privacy-utility curve */}
        <Card
          title="Privacy–utility curve"
          subtitle={`Test accuracy vs. ε at δ = ${MODEL.delta.toExponential(0)} · DP-SGD empirical`}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={privUtilData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="eps"
                  type="number"
                  domain={[0.5, 9]}
                  ticks={[1, 4, 8]}
                  label={{ value: 'Privacy budget ε', position: 'insideBottom', offset: -5 }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[60, 100]} label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="BloodMNIST" stroke="#1e3a8a" strokeWidth={2.5} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="PathMNIST"  stroke="#0d9488" strokeWidth={2.5} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Dataset size vs. DP accuracy drop" subtitle="Baseline − DP-SGD ε = 8 (percentage points)">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={drops}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dataset" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'Δ accuracy (pp)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar dataKey="drop" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="text-xs text-slate-600 mt-3 grid gap-1">
              {drops.map(d => (
                <li key={d.dataset}>
                  <span className="font-semibold">{d.dataset}</span> ({d.trainSize.toLocaleString()} train):{' '}
                  <span className="font-mono">{d.baseline}%</span> →{' '}
                  <span className="font-mono">{d.eps8}%</span>{' '}
                  <span className="text-red-600">( −{d.drop} pp )</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Clipping-norm sensitivity" subtitle="BloodMNIST · ε = 4 · optimal region C ∈ [1.0, 2.0]">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={CLIPPING_SENSITIVITY} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="C"
                    type="number"
                    domain={[0.3, 2.2]}
                    ticks={[0.5, 1.0, 1.5, 2.0]}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Clipping norm C', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis domain={[70, 82]} tick={{ fontSize: 11 }} label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <ReferenceArea
                    x1={CLIPPING_OPTIMAL_BAND.from}
                    x2={CLIPPING_OPTIMAL_BAND.to}
                    strokeOpacity={0}
                    fill="#0d9488"
                    fillOpacity={0.08}
                    label={{ value: 'optimal band', position: 'insideTopRight', fontSize: 10, fill: '#0d9488' }}
                  />
                  <Line type="monotone" dataKey="acc" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              C = 1.5 flagged as optimal in Table 2 of the thesis (exact value withheld from the public demo).
            </p>
          </Card>
        </div>

        {/* Confusion matrix */}
        <Card
          title="Confusion matrix"
          subtitle={CONFUSION_NOTE}
        >
          <div className="flex flex-wrap gap-3 mb-4" role="group" aria-label="Confusion matrix filters">
            <div className="flex gap-2">
              {Object.keys(DATASETS).map(k => (
                <button
                  key={k}
                  onClick={() => setDataset(k)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    dataset === k ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >{k}</button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {['Baseline', 'DP-SGD ε=8', 'DP-SGD ε=4', 'DP-SGD ε=1'].map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    method === m ? 'bg-brand-teal text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >{m}</button>
              ))}
            </div>
          </div>
          <ConfusionMatrix matrix={cm} labels={labels} />
        </Card>

        {/* Method comparison */}
        <Card title="Method comparison" subtitle="DP-SGD empirical · RGP / GEP theoretical only">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b">
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Per-sample gradient</th>
                  <th className="py-2 pr-4">Mechanism</th>
                  <th className="py-2 pr-4">Memory cost</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {METHODS.map(m => (
                  <tr key={m.name} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-4 font-semibold text-brand-navy">{m.name}</td>
                    <td className="py-2 pr-4">{m.type}</td>
                    <td className="py-2 pr-4">{m.perSampleGrad}</td>
                    <td className="py-2 pr-4">{m.mechanism}</td>
                    <td className="py-2 pr-4">{m.cost}</td>
                    <td className="py-2">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 italic">
            † RGP and GEP are discussed for theoretical comparison only; no empirical re-implementation was attempted.
          </p>
        </Card>
      </div>
    </PageTransition>
  )
}