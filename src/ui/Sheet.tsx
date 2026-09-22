import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose(): void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'sm'
}

/**
 * Модальное окно: на телефоне — bottom sheet (со свайпом вниз для закрытия),
 * на широком экране — диалог по центру.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, size = 'md' }: SheetProps) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const drag = useRef<{ y: number; dy: number } | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
    } else if (mounted) {
      setClosing(true)
      const t = setTimeout(() => setMounted(false), 220)
      return () => clearTimeout(t)
    }
  }, [open, mounted])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const prevFocus = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panelRef.current
      el?.focus({ preventScroll: true })
    })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.({ preventScroll: true })
    }
  }, [open])

  if (!mounted) return null

  // Свайп вниз за «ручку» или заголовок закрывает шторку на телефоне.
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || (e.target as HTMLElement).closest('button')) return
    drag.current = { y: e.clientY, dy: 0 }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current || !panelRef.current) return
    drag.current.dy = Math.max(0, e.clientY - drag.current.y)
    panelRef.current.style.transform = `translateY(${drag.current.dy}px)`
    panelRef.current.style.transition = 'none'
  }
  const onPointerUp = () => {
    if (!drag.current || !panelRef.current) return
    const { dy } = drag.current
    panelRef.current.style.transition = ''
    panelRef.current.style.transform = ''
    drag.current = null
    if (dy > 90) onClose()
  }

  return createPortal(
    <div className={`sheet-root ${closing ? 'is-closing' : 'is-open'}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        className={`sheet sheet--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div
          className="sheet-drag"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="sheet-grabber" />
          <div className="sheet-head">
            <div>
              <h2 id={titleId} className="sheet-title">{title}</h2>
              {subtitle && <p className="sheet-sub">{subtitle}</p>}
            </div>
            <button className="btn btn--icon btn--ghost" onClick={onClose} aria-label="Закрыть">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
