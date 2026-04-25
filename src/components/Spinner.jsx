export default function Spinner({ size = 22, label = 'Loading…' }) {
  return (
    <div
      className="inline-flex items-center gap-2 text-slate-500"
      role="status"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox="0 0 50 50" className="animate-spin">
        <circle cx="25" cy="25" r="20" fill="none" stroke="#cbd5e1" strokeWidth="4" />
        <path
          d="M45 25a20 20 0 0 1-20 20"
          fill="none"
          stroke="#0d9488"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs">{label}</span>
    </div>
  )
}