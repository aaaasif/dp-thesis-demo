export default function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
  as: Tag = 'section'
}) {
  return (
    <Tag className={`bg-white rounded-xl shadow-soft border border-slate-100 p-5 sm:p-6 ${className}`}>
      {(title || subtitle || action) && (
        <header className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>}
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </header>
      )}
      {children}
    </Tag>
  )
}