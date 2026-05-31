import { useCallback, useEffect, useRef, useState } from 'react'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape'
import { usePreventBackgroundScroll } from '../hooks/usePreventBackgroundScroll'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from './icons'

const MIN_SCALE = 1
const MAX_SCALE = 10

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getTouchDistance(touches: React.TouchList) {
  if (touches.length < 2) return 0
  const first = touches[0]
  const second = touches[1]
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
}

function getTouchCenter(touches: React.TouchList, rect: DOMRect) {
  if (touches.length < 2) {
    const touch = touches[0]
    return {
      x: touch.clientX - rect.left - rect.width / 2,
      y: touch.clientY - rect.top - rect.height / 2,
    }
  }
  const first = touches[0]
  const second = touches[1]
  return {
    x: (first.clientX + second.clientX) / 2 - rect.left - rect.width / 2,
    y: (first.clientY + second.clientY) / 2 - rect.top - rect.height / 2,
  }
}

interface TemplateImagePreviewProps {
  images: string[]
  initialIndex: number
  title: string
  onClose: () => void
}

export default function TemplateImagePreview({ images, initialIndex, title, onClose }: TemplateImagePreviewProps) {
  const [index, setIndex] = useState(() => clamp(initialIndex, 0, Math.max(0, images.length - 1)))
  const containerRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const txRef = useRef(0)
  const tyRef = useRef(0)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, baseTx: 0, baseTy: 0 })
  const touchRef = useRef<
    | { mode: 'none' }
    | { mode: 'pan'; startX: number; startY: number; baseTx: number; baseTy: number }
    | {
        mode: 'pinch'
        startDistance: number
        startCenterX: number
        startCenterY: number
        baseScale: number
        baseTx: number
        baseTy: number
      }
  >({ mode: 'none' })
  const [, forceRender] = useState(0)
  const rerender = useCallback(() => forceRender((value) => value + 1), [])

  useCloseOnEscape(images.length > 0, onClose)
  usePreventBackgroundScroll(images.length > 0)

  const resetZoom = useCallback(() => {
    scaleRef.current = 1
    txRef.current = 0
    tyRef.current = 0
    rerender()
  }, [rerender])

  useEffect(() => {
    resetZoom()
  }, [index, resetZoom])

  const apply = useCallback((scale: number, tx: number, ty: number) => {
    const nextScale = clamp(scale, MIN_SCALE, MAX_SCALE)
    scaleRef.current = nextScale
    txRef.current = nextScale <= 1 ? 0 : tx
    tyRef.current = nextScale <= 1 ? 0 : ty
    rerender()
  }, [rerender])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = event.clientX - rect.left - rect.width / 2
      const my = event.clientY - rect.top - rect.height / 2
      const currentScale = scaleRef.current
      const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15
      const nextScale = clamp(currentScale * factor, MIN_SCALE, MAX_SCALE)
      const ratio = nextScale / currentScale
      apply(nextScale, mx - ratio * (mx - txRef.current), my - ratio * (my - tyRef.current))
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [apply])

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragRef.current.active) return
      apply(
        scaleRef.current,
        dragRef.current.baseTx + event.clientX - dragRef.current.startX,
        dragRef.current.baseTy + event.clientY - dragRef.current.startY,
      )
    }
    const onUp = () => {
      dragRef.current.active = false
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [apply])

  const goTo = useCallback((nextIndex: number) => {
    if (images.length <= 1) return
    setIndex(((nextIndex % images.length) + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTo(index - 1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(index + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, index])

  if (images.length === 0) return null

  const src = images[index] || images[0]
  const scale = scaleRef.current
  const isZoomed = scale > 1
  const showNav = images.length > 1 && !isZoomed

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[90] flex select-none items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      style={{ cursor: isZoomed ? (dragRef.current.active ? 'grabbing' : 'grab') : 'zoom-in' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        if (scaleRef.current > 1) {
          apply(1, 0, 0)
        } else {
          const rect = containerRef.current?.getBoundingClientRect()
          const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
          const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
          apply(3, -(event.clientX - cx) * 2, -(event.clientY - cy) * 2)
        }
      }}
      onTouchStart={(event) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        if (event.touches.length >= 2) {
          event.preventDefault()
          event.stopPropagation()
          const center = getTouchCenter(event.touches, rect)
          touchRef.current = {
            mode: 'pinch',
            startDistance: getTouchDistance(event.touches),
            startCenterX: center.x,
            startCenterY: center.y,
            baseScale: scaleRef.current,
            baseTx: txRef.current,
            baseTy: tyRef.current,
          }
          return
        }
        const touch = event.touches[0]
        if (touch && scaleRef.current > 1) {
          event.preventDefault()
          touchRef.current = {
            mode: 'pan',
            startX: touch.clientX,
            startY: touch.clientY,
            baseTx: txRef.current,
            baseTy: tyRef.current,
          }
        }
      }}
      onTouchMove={(event) => {
        const touchState = touchRef.current
        if (touchState.mode === 'pinch' && event.touches.length >= 2) {
          const rect = containerRef.current?.getBoundingClientRect()
          if (!rect || touchState.startDistance <= 0) return
          event.preventDefault()
          event.stopPropagation()
          const currentDistance = getTouchDistance(event.touches)
          const center = getTouchCenter(event.touches, rect)
          const nextScale = clamp(touchState.baseScale * (currentDistance / touchState.startDistance), MIN_SCALE, MAX_SCALE)
          const ratio = nextScale / touchState.baseScale
          apply(
            nextScale,
            center.x - ratio * (touchState.startCenterX - touchState.baseTx),
            center.y - ratio * (touchState.startCenterY - touchState.baseTy),
          )
          return
        }
        if (touchState.mode === 'pan' && event.touches.length === 1 && scaleRef.current > 1) {
          const touch = event.touches[0]
          event.preventDefault()
          apply(
            scaleRef.current,
            touchState.baseTx + touch.clientX - touchState.startX,
            touchState.baseTy + touch.clientY - touchState.startY,
          )
        }
      }}
      onTouchEnd={(event) => {
        if (event.touches.length === 0) {
          touchRef.current = { mode: 'none' }
          return
        }
        if (event.touches.length === 1 && scaleRef.current > 1) {
          const touch = event.touches[0]
          touchRef.current = {
            mode: 'pan',
            startX: touch.clientX,
            startY: touch.clientY,
            baseTx: txRef.current,
            baseTy: tyRef.current,
          }
        }
      }}
      onTouchCancel={() => {
        touchRef.current = { mode: 'none' }
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-black/45 p-2 text-white backdrop-blur transition hover:bg-black/65"
        aria-label="关闭预览"
        title="关闭"
      >
        <CloseIcon className="h-5 w-5" />
      </button>

      {showNav && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              goTo(index - 1)
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur transition hover:bg-black/65"
            aria-label="上一张"
            title="上一张"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              goTo(index + 1)
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur transition hover:bg-black/65"
            aria-label="下一张"
            title="下一张"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </>
      )}

      <div
        className="relative flex items-center justify-center"
        style={{
          transform: `translate(${txRef.current}px, ${tyRef.current}px) scale(${scale})`,
          transition: dragRef.current.active ? 'none' : 'transform 0.18s ease-out',
        }}
      >
        <img
          src={src}
          alt={title}
          referrerPolicy="no-referrer"
          className="max-h-[84vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          onMouseDown={(event) => {
            if (scaleRef.current <= 1 || event.button !== 0) return
            event.preventDefault()
            dragRef.current = {
              active: true,
              startX: event.clientX,
              startY: event.clientY,
              baseTx: txRef.current,
              baseTy: tyRef.current,
            }
          }}
          onDragStart={(event) => event.preventDefault()}
        />
      </div>

      <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1.5 text-xs text-white/85 backdrop-blur">
        {images.length > 1 ? `${index + 1} / ${images.length} · ` : ''}{Math.round(scale * 100)}%
      </div>
    </div>
  )
}
