import { useEffect } from 'react'
import { loadInitialData } from './data/repository'
import { useRoute } from './hooks/useRoute'
import { HomePage } from './pages/HomePage'
import { SchedulePage } from './pages/SchedulePage'
import { SectionsPage } from './pages/SectionsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useSchedule } from './store/useSchedule'
import { AppShell } from './ui/AppShell'
import { ConfirmHost } from './ui/confirm'
import { ImportSheet } from './ui/ImportSheet'
import { LessonFormSheet, LessonViewSheet } from './ui/LessonSheets'
import { ItemFormSheet, SectionFormSheet } from './ui/SectionSheets'
import { ToastHost } from './ui/toast'

export default function App() {
  const route = useRoute()
  const ready = useSchedule((s) => s.ready)

  useEffect(() => {
    void loadInitialData().then((data) => useSchedule.getState().hydrate(data))
  }, [])

  if (!ready) return <div className="boot" aria-busy="true" />

  return (
    <>
      <AppShell route={route}>
        {route === 'home' && <HomePage />}
        {route === 'schedule' && <SchedulePage />}
        {route === 'sections' && <SectionsPage />}
        {route === 'settings' && <SettingsPage />}
      </AppShell>

      <LessonViewSheet />
      <LessonFormSheet />
      <SectionFormSheet />
      <ItemFormSheet />
      <ImportSheet />
      <ConfirmHost />
      <ToastHost />
    </>
  )
}
