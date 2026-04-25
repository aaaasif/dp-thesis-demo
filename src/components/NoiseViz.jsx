export default function NoiseViz({ epsilon, clip, demo }) {
  let orig, clipped, noisy, sigmaLabel
  if (demo && demo.original?.length) {
    orig    = demo.original
    clipped = demo.clipped
    noisy   = demo.noisy
    sigmaLabel = `σ = ${demo.sigma.toFixed(3)}`
  } else {
    const N = 24
    orig = Array.from({ length: N }, (_, i) =>
      Math.sin(i * 0.55) * 2.2 + Math.cos(i * 1.1) + Math.sin(i * 0.2) * 0.8
    )
    const norm = Math.sqrt(orig.reduce((s, v) => s + v * v, 0))
    const scale = norm > clip ? clip / norm : 1
    clipped = orig.map(v => v * scale)
    const sigma = epsilon && epsilon > 0 ? (clip * 1.8) / epsilon : 0
    noisy = clipped.map((v, i) => v + Math.sin(i * 3.17 + (epsilon || 1) * 0.9) * sigma * 0.6)
    sigmaLabel = sigma > 0 ? `σ ≈ ${sigma.toFixed(2)}` : 'no noise'
  }

  const series = [
    { name: 'Original gradient ∇ℓ',                   data: orig,    color: '#94a3b8' },
    { name: `Clipped ‖·‖₂ ≤ C = ${(clip ?? 1).toFixed(1)}`, data: clipped, color: '#0d9488' },
    { name: epsilon
        ? `Clipped + Gaussian noise (${sigmaLabel})`
        : 'No noise added (Baseline, no DP)',          data: noisy,   color: '#1e3a8a' }
  ]

  const N = orig.length
  const W = 640, H = 140, pad = 14
  const allVals = series.flatMap(s => s.data)
  const maxAbs = Math.max(...allVals.map(Math.abs), 0.1)
  const scaleY = (H / 2 - pad) / maxAbs
  const barW = (W - 2 * pad) / N

  return (
    <div className="space-y-4" role="figure" aria-label="Per-sample gradient transformation under DP-SGD">
      {series.map(s => {
        const l2 = Math.sqrt(s.data.reduce((a, v) => a + v * v, 0))
        return (
          <div key={s.name}>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
              <span>{s.name}</span>
              <span className="font-mono text-[11px] text-slate-400">‖g‖₂ = {l2.toFixed(2)}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 bg-slate-50 rounded-lg">
              <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke="#cbd5e1" strokeWidth="1" />
              {s.data.map((v, i) => (
                <rect
                  key={i}
                  x={pad + i * barW + 2}
                  y={v >= 0 ? H / 2 - v * scaleY : H / 2}
                  width={Math.max(barW - 4, 2)}
                  height={Math.max(Math.abs(v * scaleY), 0.5)}
                  fill={s.color}
                  opacity="0.88"
                />
              ))}
            </svg>
          </div>
        )
      })}
    </div>
  )
}