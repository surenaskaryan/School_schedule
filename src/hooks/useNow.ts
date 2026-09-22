import { useEffect, useState } from 'react'

/**
 * Текущее время, обновляется раз в 15 секунд.
 * Для проверки вёрстки можно открыть сайт с ?now=2026-09-22T10:30 —
 * часы пойдут от этого момента.
 */
const offset = (() => {
  if (typeof window === 'undefined') return 0
  const raw = new URLSearchParams(window.location.search).get('now')
  const t = raw ? new Date(raw).getTime() : NaN
  return Number.isFinite(t) ? t - Date.now() : 0
})()

export const getNow = () => new Date(Date.now() + offset)

export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(getNow)
  useEffect(() => {
    const tick = () => setNow(getNow())
    const id = setInterval(tick, intervalMs)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])
  return now
}
