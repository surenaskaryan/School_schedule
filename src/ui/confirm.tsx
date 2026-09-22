import { TriangleAlert } from 'lucide-react'
import { create } from 'zustand'
import { Sheet } from './Sheet'

interface ConfirmRequest {
  title: string
  text?: string
  confirmLabel?: string
  resolve(ok: boolean): void
}

const useConfirmStore = create<{ req: ConfirmRequest | null; set(r: ConfirmRequest | null): void }>((set) => ({
  req: null,
  set: (req) => set({ req }),
}))

/** Подтверждение опасного действия: `if (await confirmAction({...})) …` */
export const confirmAction = (opts: Omit<ConfirmRequest, 'resolve'>) =>
  new Promise<boolean>((resolve) => useConfirmStore.getState().set({ ...opts, resolve }))

export function ConfirmHost() {
  const { req, set } = useConfirmStore()
  const close = (ok: boolean) => {
    req?.resolve(ok)
    set(null)
  }
  return (
    <Sheet
      open={!!req}
      onClose={() => close(false)}
      size="sm"
      title={
        <span className="confirm-title">
          <span className="confirm-icon"><TriangleAlert size={16} /></span>
          {req?.title}
        </span>
      }
      footer={
        <>
          <button className="btn btn--ghost" onClick={() => close(false)}>Отмена</button>
          <button className="btn btn--danger" data-autofocus onClick={() => close(true)}>
            {req?.confirmLabel ?? 'Удалить'}
          </button>
        </>
      }
    >
      {req?.text && <p className="confirm-text">{req.text}</p>}
    </Sheet>
  )
}
