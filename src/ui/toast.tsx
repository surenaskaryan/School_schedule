import { Check } from 'lucide-react'
import { useEffect } from 'react'
import { create } from 'zustand'

interface Toast {
  id: number
  text: string
  action?: { label: string; run(): void }
}

interface ToastState {
  toast: Toast | null
  show(text: string, action?: Toast['action']): void
  hide(): void
}

export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (text, action) => set({ toast: { id: Date.now(), text, action } }),
  hide: () => set({ toast: null }),
}))

export const toast = (text: string, action?: Toast['action']) => useToast.getState().show(text, action)

export function ToastHost() {
  const { toast: t, hide } = useToast()
  useEffect(() => {
    if (!t) return
    const id = setTimeout(hide, t.action ? 5000 : 2600)
    return () => clearTimeout(id)
  }, [t, hide])
  if (!t) return null
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div className="toast" key={t.id}>
        <span className="toast-icon"><Check size={14} strokeWidth={2.5} /></span>
        <span>{t.text}</span>
        {t.action && (
          <button
            className="toast-action"
            onClick={() => {
              t.action!.run()
              hide()
            }}
          >
            {t.action.label}
          </button>
        )}
      </div>
    </div>
  )
}
