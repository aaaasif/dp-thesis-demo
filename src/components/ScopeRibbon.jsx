export default function ScopeRibbon() {
  return (
    <div
      className="bg-amber-50 border-y border-amber-200 text-[11px] sm:text-xs text-amber-900 px-4 py-2 text-center leading-relaxed"
      role="note"
      aria-label="Scope and limitations"
    >
      <span className="font-semibold">Scope &amp; Limitations:</span>{' '}
      Empirical results: <span className="font-mono">DP-SGD</span> only (Opacus 1.4.0).{' '}
      <span className="font-mono">RGP</span> and <span className="font-mono">GEP</span>{' '}
      shown as theoretical comparisons (†). Undergraduate thesis prototype.
    </div>
  )
}