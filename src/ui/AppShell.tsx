import { CalendarRange, House, LayoutGrid, Settings2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { navigate, type Route } from '../hooks/useRoute'
import { useSchedule } from '../store/useSchedule'
import { ModeToggle } from './ModeToggle'

const NAV: { id: Route; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Сегодня', icon: House },
  { id: 'schedule', label: 'Расписание', icon: CalendarRange },
  { id: 'sections', label: 'Секции', icon: LayoutGrid },
  { id: 'settings', label: 'Настройки', icon: Settings2 },
]

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const name = useSchedule((s) => s.data.settings.studentName)
  const mode = useSchedule((s) => s.mode)

  return (
    <div className={`shell ${mode === 'edit' ? 'is-edit-mode' : ''}`}>
      <aside className="sidebar">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <span className="brand-text">
            <span className="brand-name">Расписание</span>
            {name && <span className="brand-sub">{name}</span>}
          </span>
        </a>

        <nav className="nav" aria-label="Разделы">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={n.id === 'home' ? '#/' : `#/${n.id}`}
              className={`nav-item ${route === n.id ? 'is-active' : ''}`}
              aria-current={route === n.id ? 'page' : undefined}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-label">Режим</div>
          <ModeToggle compact />
        </div>
      </aside>

      <main className="main">
        <div className="page" key={route}>
          {children}
        </div>
      </main>

      <nav className="tabbar" aria-label="Разделы">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`tab ${route === n.id ? 'is-active' : ''}`}
            aria-current={route === n.id ? 'page' : undefined}
            onClick={() => navigate(n.id)}
          >
            <span className="tab-icon"><n.icon size={20} /></span>
            <span className="tab-label">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head rise">
      <div className="page-head-text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}
