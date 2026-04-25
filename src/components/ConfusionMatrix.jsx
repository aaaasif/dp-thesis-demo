export default function ConfusionMatrix({ matrix, labels }) {
  const n = matrix.length
  const flat = matrix.flat()
  const max = Math.max(...flat)
  const cell = 48
  const pad = 110
  const svgW = pad + n * cell + 20
  const svgH = pad + n * cell + 20

  return (
    <div className="overflow-x-auto" role="figure" aria-label="Confusion matrix heatmap">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="min-w-[560px]">
        {/* Axis labels */}
        <text x={pad + (n * cell) / 2} y={26} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1e3a8a">
          Predicted class
        </text>
        <text
          x={26}
          y={pad + (n * cell) / 2}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="#1e3a8a"
          transform={`rotate(-90, 26, ${pad + (n * cell) / 2})`}
        >
          True class
        </text>

        {/* Column headers */}
        {labels.map((lab, j) => (
          <text
            key={`c${j}`}
            x={pad + j * cell + cell / 2}
            y={pad - 14}
            textAnchor="middle"
            fontSize="10"
            fill="#475569"
          >
            {short(lab)}
          </text>
        ))}

        {/* Row headers */}
        {labels.map((lab, i) => (
          <text
            key={`r${i}`}
            x={pad - 8}
            y={pad + i * cell + cell / 2 + 4}
            textAnchor="end"
            fontSize="10"
            fill="#475569"
          >
            {short(lab)}
          </text>
        ))}

        {/* Cells */}
        {matrix.map((row, i) =>
          row.map((v, j) => {
            const intensity = max > 0 ? v / max : 0
            const bg = `rgba(13, 148, 136, ${0.08 + intensity * 0.85})`
            const fg = intensity > 0.55 ? 'white' : '#0f172a'
            const display = typeof v === 'number' ? v.toFixed(2) : v
            return (
              <g key={`${i}-${j}`}>
                <rect
                  x={pad + j * cell + 2}
                  y={pad + i * cell + 2}
                  width={cell - 4}
                  height={cell - 4}
                  rx="4"
                  fill={bg}
                />
                <text
                  x={pad + j * cell + cell / 2}
                  y={pad + i * cell + cell / 2 + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  fill={fg}
                >
                  {display}
                </text>
              </g>
            )
          })
        )}
      </svg>
    </div>
  )
}

function short(s) {
  return s.length > 10 ? s.slice(0, 9) + '…' : s
}