import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Tiny async hook. Tracks { data, loading, error }.
 * Pass deps to refetch when inputs change.
 *
 *   const { data, loading, error, run } = useAsync(() => api.results(), [])
 */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError]     = useState(null)
  const mounted = useRef(true)

  useEffect(() => () => { mounted.current = false }, [])

  const run = useCallback(async (...args) => {
    setLoading(true); setError(null)
    try {
      const result = await fn(...args)
      if (mounted.current) setData(result)
      return result
    } catch (e) {
      if (mounted.current) setError(e.message || String(e))
      throw e
    } finally {
      if (mounted.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (immediate) run().catch(() => { /* error captured in state */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  return { data, loading, error, run, setData }
}