import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

/**
 * Loads data from the mock backend and automatically refetches whenever the
 * backend changes (a check-in, a seat, a reorder, ...) whether triggered from
 * this tab or another one.
 */
export function useLiveData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): { data: T | null; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    fetcher().then((result) => {
      if (!cancelled) {
        setData(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cancel = load()
    const unsubscribe = api.subscribe(() => load())
    return () => {
      cancel()
      unsubscribe()
    }
  }, [load])

  return { data, loading, refresh: load }
}
