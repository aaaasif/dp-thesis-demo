import { META } from '../data/results.js'
import ScopeRibbon from './ScopeRibbon.jsx'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-12">
      <ScopeRibbon />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          © {new Date().getFullYear()} {META.author} · {META.studentId} · {META.college}, {META.university}
        </div>
        <div>
          Supervisor: {META.supervisor} · Academic year {META.academicYear}
        </div>
      </div>
    </footer>
  )
}