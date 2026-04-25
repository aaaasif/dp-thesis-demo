// 5-layer pipeline diagram — mirrors Figure 7 of the thesis.
// Pure SVG, responsive, colour-coded per stage.

const LAYERS = [
  { title: 'Data',       items: ['BloodMNIST · PathMNIST', '28 × 28 × 3 RGB', 'Train / val / test split'], color: '#1e3a8a' },
  { title: 'Model',      items: ['MedCNN', '814,056 params', 'GroupNorm (8 groups)'],                        color: '#2563eb' },
  { title: 'DP Layer',   items: ['Per-sample L₂ clip C', 'Gaussian noise σ', 'RDP accountant'],             color: '#0d9488' },
  { title: 'Evaluation', items: ['Accuracy · Loss', 'Confusion matrix', 'ε spent vs. budget'],              color: '#0891b2' },
  { title: 'Output',     items: ['Predicted class', 'Confidence vector', 'Privacy report'],                 color: '#475569' }
]

export default function ArchDiagram() {
  const W = 1040, H = 360, cardW = 180, gap = 22
  const startX = (W - (LAYERS.length * cardW + (LAYERS.length - 1) * gap)) / 2

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="System architecture. Five stages: Data, Model, DP Layer, Evaluation, Output."
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
        </marker>
      </defs>

      <text x={W/2} y="32" textAnchor="middle" fontSize="18" fontWeight="700" fill="#1e3a8a">
        DP Medical Imaging Pipeline
      </text>
      <text x={W/2} y="52" textAnchor="middle" fontSize="12" fill="#64748b">
        End-to-end flow — raw images to privacy-accounted predictions
      </text>

      {LAYERS.map((L, i) => {
        const x = startX + i * (cardW + gap)
        const y = 90
        return (
          <g key={L.title}>
            {/* Card */}
            <rect x={x} y={y} width={cardW} height="200" rx="14" ry="14" fill="white" stroke={L.color} strokeWidth="1.5" />
            {/* Header */}
            <path d={`M${x} ${y+14} Q${x} ${y} ${x+14} ${y} L${x+cardW-14} ${y} Q${x+cardW} ${y} ${x+cardW} ${y+14} L${x+cardW} ${y+46} L${x} ${y+46} Z`} fill={L.color} />
            <text x={x + cardW/2} y={y + 30} textAnchor="middle" fontSize="15" fontWeight="600" fill="white">
              {i+1}. {L.title}
            </text>
            {/* Items */}
            {L.items.map((it, j) => (
              <text key={j} x={x + cardW/2} y={y + 78 + j * 32} textAnchor="middle" fontSize="12" fill="#334155">
                {it}
              </text>
            ))}
            {/* Arrow to next */}
            {i < LAYERS.length - 1 && (
              <line
                x1={x + cardW}
                y1={y + 100}
                x2={x + cardW + gap - 2}
                y2={y + 100}
                stroke="#94a3b8"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
            )}
          </g>
        )
      })}

      <text x={W/2} y="330" textAnchor="middle" fontSize="11" fill="#64748b">
        δ = 10⁻⁵ across all experiments — RDP accountant tracks ε per optimizer step
      </text>
    </svg>
  )
}