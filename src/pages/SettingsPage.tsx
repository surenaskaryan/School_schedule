import { Download, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ACCENTS, accentVars } from '../domain/accents'
import { knownSubjects } from '../domain/suggest'
import type { AccentKey, Weekday } from '../domain/types'
import { useSubjectAccent } from '../hooks/useAccent'
import { useEditor } from '../store/useEditor'
import { useSchedule } from '../store/useSchedule'
import { PageHeader } from '../ui/AppShell'
import { confirmAction } from '../ui/confirm'
import { AccentPicker, Switch, WeekdayPicker } from '../ui/controls'
import { Sheet } from '../ui/Sheet'
import { toast } from '../ui/toast'

export function SettingsPage() {
  const data = useSchedule((s) => s.data)
  const { settings } = data
  const update = useSchedule((s) => s.updateSettings)
  const accentOf = useSubjectAccent()
  const subjects = useMemo(() => knownSubjects(data.lessons), [data.lessons])
  const [pick, setPick] = useState<string | null>(null)

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `raspisanie-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast('Резервная копия сохранена')
  }

  const reset = async () => {
    const ok = await confirmAction({
      title: 'Вернуть исходное расписание?',
      text: 'Все изменения уроков, секции и настройки на этом устройстве будут удалены, расписание вернётся к исходному файлу. Сначала лучше сохранить резервную копию.',
      confirmLabel: 'Сбросить',
    })
    if (!ok) return
    useSchedule.getState().resetAll()
    toast('Исходное расписание восстановлено')
  }

  return (
    <>
      <PageHeader eyebrow="Приложение" title="Настройки" />

      <div className="settings">
        <section className="settings-group rise rise-1">
          <h2 className="group-title">Профиль</h2>
          <div className="group">
            <label className="row">
              <span className="row-text">
                <span className="row-title">Имя</span>
                <span className="row-desc">Для приветствия на главной</span>
              </span>
              <input
                className="input input--inline"
                value={settings.studentName}
                placeholder="Имя сына"
                onChange={(e) => update({ studentName: e.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="settings-group rise rise-2">
          <h2 className="group-title">Расписание</h2>
          <div className="group">
            <div className="row row--stack">
              <span className="row-text">
                <span className="row-title">Учебные дни</span>
                <span className="row-desc">Какие дни показывать в переключателе</span>
              </span>
              <WeekdayPicker
                multiple
                value={settings.schoolDays}
                onChange={(d) => d.length && update({ schoolDays: d as Weekday[] })}
              />
            </div>
            <div className="row">
              <span className="row-text">
                <span className="row-title">Приглушать прошедшие уроки</span>
                <span className="row-desc">Сегодняшние уроки, которые уже закончились</span>
              </span>
              <Switch checked={settings.dimPast} onChange={(dimPast) => update({ dimPast })} label="Приглушать прошедшие уроки" />
            </div>
          </div>
        </section>

        {subjects.length > 0 && (
          <section className="settings-group rise rise-3">
            <h2 className="group-title">Цвета предметов</h2>
            <div className="group subject-list">
              {subjects.map((s) => (
                <button key={s} className="row row--button" onClick={() => setPick(s)} style={accentVars(accentOf(s))}>
                  <span className="subject-dot" />
                  <span className="row-title">{s}</span>
                  <span className="row-value">{ACCENTS[accentOf(s)].label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="settings-group rise rise-4">
          <h2 className="group-title">Данные</h2>
          <div className="group">
            <button className="row row--button" onClick={() => useEditor.getState().setImportOpen(true)}>
              <span className="row-icon"><FileSpreadsheet size={17} /></span>
              <span className="row-text">
                <span className="row-title">Импорт расписания</span>
                <span className="row-desc">
                  {data.source
                    ? `Текущее: ${data.source.name}, ${new Date(data.source.importedAt).toLocaleDateString('ru-RU')}`
                    : 'Excel (.xlsx) или CSV — например, выгрузка из Google Таблиц'}
                </span>
              </span>
            </button>
            <button className="row row--button" onClick={exportBackup}>
              <span className="row-icon"><Download size={17} /></span>
              <span className="row-text">
                <span className="row-title">Сохранить резервную копию</span>
                <span className="row-desc">Файл .json со всеми уроками, секциями и настройками</span>
              </span>
            </button>
            <button className="row row--button" onClick={() => useEditor.getState().setImportOpen(true)}>
              <span className="row-icon"><Upload size={17} /></span>
              <span className="row-text">
                <span className="row-title">Восстановить из копии</span>
                <span className="row-desc">Выберите ранее сохранённый .json</span>
              </span>
            </button>
            <button className="row row--button row--danger" onClick={reset}>
              <span className="row-icon"><RotateCcw size={17} /></span>
              <span className="row-text">
                <span className="row-title">Сбросить к исходному</span>
                <span className="row-desc">Вернуть расписание из файла и удалить все изменения</span>
              </span>
            </button>
          </div>
          <p className="group-note">
            Данные хранятся в браузере на этом устройстве и не пропадают после перезагрузки.
            Чтобы перенести расписание на другой телефон, сохраните резервную копию и восстановите её там.
          </p>
        </section>
      </div>

      <Sheet open={!!pick} onClose={() => setPick(null)} title={pick ?? ''} subtitle="Цвет предмета" size="sm">
        {pick && (
          <AccentPicker
            value={accentOf(pick)}
            onChange={(a: AccentKey) => {
              useSchedule.getState().setSubjectAccent(pick, a)
              setPick(null)
            }}
          />
        )}
      </Sheet>
    </>
  )
}
