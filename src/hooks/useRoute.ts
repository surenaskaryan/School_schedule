import { useEffect, useState } from 'react'

/** Маленький hash-роутер: работает на любом статическом хостинге без настройки сервера. */
export type Route = 'home' | 'schedule' | 'sections' | 'settings'
const ROUTES: Route[] = ['home', 'schedule', 'sections', 'settings']

const parse = (): Route => {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return (ROUTES as string[]).includes(h) ? (h as Route) : 'home'
}

export const navigate = (r: Route) => {
  const target = r === 'home' ? '#/' : `#/${r}`
  if (window.location.hash !== target) window.location.hash = target
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(parse)
  useEffect(() => {
    const on = () => {
      setRoute(parse())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
