import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/',             label: 'Home' },
  { to: '/datasets',     label: 'Datasets' },
  { to: '/demo',         label: 'Demo' },
  { to: '/upload',       label: 'Upload' },
  { to: '/results',      label: 'Results' },
  { to: '/about',        label: 'Methodology' },
  { to: '/demo-script',  label: 'Defence script' }
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" aria-label="Primary navigation">
        <NavLink to="/" className="flex items-center gap-2" aria-label="Home">
          <div className="w-9 h-9 rounded-lg bg-brand-navy grid place-items-center shadow-soft">
            <span className="text-white font-bold text-sm">DP</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-brand-navy">DP Medical</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Thesis Demo</div>
          </div>
        </NavLink>
        <ul className="flex items-center gap-1 flex-wrap justify-end">
          {LINKS.map(l => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `px-2.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-white bg-brand-navy'
                      : 'text-slate-600 hover:text-brand-navy hover:bg-slate-100'
                  }`
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}