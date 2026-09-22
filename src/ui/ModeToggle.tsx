import { Eye, PencilLine } from 'lucide-react'
import { useSchedule } from '../store/useSchedule'
import { Segmented } from './controls'

/** Переключатель «Просмотр / Правка». Режим общий для всего приложения. */
export function ModeToggle({ compact }: { compact?: boolean }) {
  const mode = useSchedule((s) => s.mode)
  const setMode = useSchedule((s) => s.setMode)
  return (
    <Segmented
      className={`seg--mode ${compact ? 'seg--compact' : ''} ${mode === 'edit' ? 'is-edit' : ''}`}
      ariaLabel="Режим"
      value={mode}
      onChange={setMode}
      options={[
        { value: 'view', label: 'Просмотр', icon: <Eye size={15} /> },
        { value: 'edit', label: compact ? 'Правка' : 'Редактирование', icon: <PencilLine size={15} /> },
      ]}
    />
  )
}
