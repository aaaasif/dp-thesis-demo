import { createContext, useContext, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ToastCtx = createContext(null)

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const push = useCallback((msg, kind = 'info', ttl = 4000) => {
    const id = Math.random().toString(36).slice(2)
    setItems(s => [...s, { id, msg, kind }])
    setTimeout(() => setItems(s => s.filter(t => t.id !== id)), ttl)
  }, [])

  const api = {
    info:    msg => push(msg, 'info'),
    success: msg => push(msg, 'success'),
    error:   msg => push(msg, 'error', 6000)
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence>
          {items.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0,  scale: 1 }}
              exit={{    opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.22 }}
              className={`px-4 py-3 rounded-lg shadow-pop text-sm font-medium text-white ${
                t.kind === 'error'   ? 'bg-red-600'
                : t.kind === 'success' ? 'bg-emerald-600'
                : 'bg-brand-navy'
              }`}
              role="status"
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}