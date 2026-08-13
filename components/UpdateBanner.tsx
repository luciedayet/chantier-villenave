'use client'
import { useEffect, useRef, useState } from 'react'

export default function UpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [showPopup, setShowPopup] = useState(true)
  const reloadedRef = useRef(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let registration: ServiceWorkerRegistration | null = null

    function handleNewWorker(worker: ServiceWorker) {
      setWaitingWorker(worker)
      setShowPopup(true)
    }

    async function register() {
      registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })

      if (registration.waiting) {
        handleNewWorker(registration.waiting)
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration!.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            handleNewWorker(installing)
          }
        })
      })
    }

    register()

    function handleControllerChange() {
      if (reloadedRef.current) return
      reloadedRef.current = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        registration?.update()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  if (!waitingWorker) return null

  function handleUpdate() {
    waitingWorker!.postMessage({ type: 'SKIP_WAITING' })
  }

  if (showPopup) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(26,29,35,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }}
      >
        <div
          style={{
            background: '#FFFFFF', border: '1px solid #DDE1E9',
            borderRadius: 12, padding: 28, width: '100%', maxWidth: 360,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <div style={{ color: '#1A1D23', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            Nouvelle version disponible
          </div>
          <div style={{ color: '#5A6275', fontSize: 14, marginBottom: 24 }}>
            Une mise à jour de l&apos;application est prête à être installée.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowPopup(false)}
              style={{
                flex: 1, padding: '10px 0', background: '#F4F5F7',
                color: '#1A1D23', border: '1px solid #DDE1E9', borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Plus tard
            </button>
            <button
              onClick={handleUpdate}
              style={{
                flex: 1, padding: '10px 0', background: '#E6A800',
                color: '#1A1D23', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Mettre à jour
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'sticky', top: 0, zIndex: 999,
        background: '#1A1D23', color: '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
        gap: 12,
      }}
    >
      <span>Une nouvelle version est disponible.</span>
      <button
        onClick={() => setShowPopup(true)}
        style={{
          background: '#E6A800', color: '#1A1D23', border: 'none',
          borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Mettre à jour
      </button>
    </div>
  )
}
