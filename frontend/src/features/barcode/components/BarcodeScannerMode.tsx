import { useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { Camera } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { lookupBarcode, type FoodProduct } from '../model/barcodeApi'
import { addMealManually } from '../../current-day/model/nutritionTotalsApi'

type ScanStatus = 'scanning' | 'loading' | 'found' | 'not_found' | 'camera_error' | 'permission_denied'

interface Props {
  onAdded: () => void
  onCancel: () => void
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export function BarcodeScannerMode({ onAdded, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [scanKey, setScanKey] = useState(0)
  const [status, setStatus] = useState<ScanStatus>('scanning')
  const [product, setProduct] = useState<FoodProduct | null>(null)
  const [portionGrams, setPortionGrams] = useState('100')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [cameraErrorDetail, setCameraErrorDetail] = useState('')

  useEffect(() => {
    let stopped = false
    setStatus('scanning')
    setProduct(null)

    async function start() {
      if (!videoRef.current) return
      try {
        if (Capacitor.isNativePlatform()) {
          const perm = await Camera.requestPermissions({ permissions: ['camera'] })
          if (perm.camera !== 'granted') {
            if (!stopped) setStatus('permission_denied')
            return
          }
        }
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        // 3 = DecodeHintType.TRY_HARDER — tries harder on blurry/partial barcodes
        const hints = new Map([[3, true]])
        const reader = new BrowserMultiFormatReader(hints, 150)
        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          videoRef.current,
          async (result, _err, ctrl) => {
            if (!result || stopped) return
            stopped = true
            ctrl.stop()
            const barcode = result.getText()
            setStatus('loading')
            try {
              const found = await lookupBarcode(barcode)
              setProduct(found)
              setStatus(found ? 'found' : 'not_found')
            } catch {
              setStatus('not_found')
            }
          },
        )
        controlsRef.current = controls

        // Apply autofocus to the track after stream starts
        const stream = videoRef.current.srcObject as MediaStream | null
        const track = stream?.getVideoTracks()[0]
        if (track) {
          const cap = track.getCapabilities() as Record<string, unknown>
          const modes = cap['focusMode'] as string[] | undefined
          // Kick a single-shot focus on center first, then switch to continuous
          if (modes?.includes('single-shot') && cap['pointOfInterest']) {
            await track.applyConstraints({
              advanced: [{ focusMode: 'single-shot', pointOfInterest: { x: 0.5, y: 0.5 } } as MediaTrackConstraintSet],
            }).catch(() => {})
          }
          if (modes?.includes('continuous')) {
            setTimeout(() => {
              track.applyConstraints({
                advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
              }).catch(() => {})
            }, 600)
          }
        }
      } catch (err) {
        if (!stopped) {
          const name = err instanceof Error ? err.name : ''
          const msg = err instanceof Error ? err.message : String(err)
          setCameraErrorDetail(`${name}: ${msg}`)
          setStatus(name === 'NotAllowedError' ? 'permission_denied' : 'camera_error')
        }
      }
    }

    start()

    return () => {
      stopped = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [scanKey])

  function scanAgain() {
    setScanKey((k) => k + 1)
  }

  function handleTapToFocus(e: React.MouseEvent | React.TouchEvent) {
    const video = videoRef.current
    if (!video) return
    const stream = video.srcObject as MediaStream | null
    const track = stream?.getVideoTracks()[0]
    if (!track) return
    const cap = track.getCapabilities() as Record<string, unknown>
    const rect = video.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const poi = cap['pointOfInterest'] as { x?: unknown } | undefined
    if (poi) {
      track.applyConstraints({
        advanced: [{ focusMode: 'single-shot', pointOfInterest: { x, y } } as MediaTrackConstraintSet],
      }).catch(() => {})
    }
  }

  async function handleAdd() {
    if (!product) return
    const grams = Number(portionGrams)
    if (!grams || grams <= 0) return
    setAdding(true)
    setAddError('')
    try {
      const f = grams / 100
      await addMealManually({
        caloriesConsumedKcal: Math.round((product.caloriesPer100g ?? 0) * f),
        proteinGrams: round1((product.proteinPer100g ?? 0) * f),
        fatGrams: round1((product.fatPer100g ?? 0) * f),
        fiberGrams: round1((product.fiberPer100g ?? 0) * f),
        carbsGrams: round1((product.carbsPer100g ?? 0) * f),
      })
      onAdded()
    } catch {
      setAddError('Failed to add. Try again.')
    } finally {
      setAdding(false)
    }
  }

  const grams = Number(portionGrams) || 0
  const f = grams / 100

  return (
    <div className="barcode-scanner-wrapper">
      {/* Camera view — always mounted so the video ref is ready */}
      <div
        className="barcode-camera-view"
        style={{ display: status === 'scanning' ? 'block' : 'none' }}
      >
        <video
          ref={videoRef}
          className="barcode-camera-video"
          autoPlay
          muted
          playsInline
          onClick={handleTapToFocus}
          onTouchStart={handleTapToFocus}
        />
        <div className="barcode-camera-overlay" style={{ pointerEvents: 'none' }}>
          <div className="barcode-viewfinder">
            <span className="barcode-viewfinder__line" />
          </div>
          <p className="barcode-hint">Tap to focus · align barcode with box</p>
        </div>
        <button type="button" className="barcode-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {status === 'loading' && (
        <div className="barcode-state-card">
          <p className="subtle-text">Looking up product…</p>
        </div>
      )}

      {status === 'camera_error' && (
        <div className="barcode-state-card">
          <p className="error-text">Camera not available.</p>
          {cameraErrorDetail && (
            <p className="subtle-text" style={{ marginTop: '0.5rem', fontSize: '0.75rem', wordBreak: 'break-all' }}>
              {cameraErrorDetail}
            </p>
          )}
          <button type="button" className="tab-button tab-button--dark" onClick={onCancel} style={{ marginTop: '1rem' }}>
            Go back
          </button>
        </div>
      )}

      {status === 'permission_denied' && (
        <div className="barcode-state-card">
          <p className="error-text">Camera access is required to scan barcodes.</p>
          <p className="subtle-text" style={{ marginTop: '0.5rem' }}>
            {Capacitor.isNativePlatform()
              ? 'Enable camera access in Settings → Rumbly Eats → Camera.'
              : 'Allow camera access in your browser address bar, then try again.'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            {Capacitor.isNativePlatform() && (
              <button
                type="button"
                className="tab-button tab-button--dark"
                onClick={() => window.open('app-settings://', '_system')}
              >
                Open Settings
              </button>
            )}
            <button type="button" className="profile-logout-btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === 'not_found' && (
        <div className="barcode-state-card">
          <p className="subtle-text">Product not found in the database.</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" className="tab-button tab-button--dark" onClick={scanAgain}>
              Scan again
            </button>
            <button type="button" className="profile-logout-btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === 'found' && product && (
        <div className="barcode-product-card panel">
          <div className="barcode-product-header">
            <p className="barcode-product-name">{product.name}</p>
            <p className="barcode-product-per100">
              {Math.round(product.caloriesPer100g ?? 0)} kcal per 100 g
            </p>
          </div>

          <div className="barcode-portion-section">
            <p className="barcode-portion-label">How much did you eat?</p>
            <div className="barcode-portion-row">
              <button
                type="button"
                className="barcode-portion-btn"
                onClick={() => setPortionGrams(String(Math.max(25, (Number(portionGrams) || 100) - 25)))}
              >−</button>
              <div className="barcode-portion-input-wrap">
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={portionGrams}
                  onChange={(e) => setPortionGrams(e.target.value)}
                  className="barcode-portion-input"
                />
                <span className="barcode-portion-unit">g</span>
              </div>
              <button
                type="button"
                className="barcode-portion-btn"
                onClick={() => setPortionGrams(String((Number(portionGrams) || 100) + 25))}
              >+</button>
            </div>
            <div className="barcode-quick-portions">
              {[50, 100, 150, 200, 250].map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`barcode-quick-btn${Number(portionGrams) === g ? ' barcode-quick-btn--active' : ''}`}
                  onClick={() => setPortionGrams(String(g))}
                >
                  {g}g
                </button>
              ))}
            </div>
          </div>

          {grams > 0 && (
            <div className="barcode-macros-grid">
              <div className="barcode-macro-chip barcode-macro-chip--calories">
                <span className="barcode-macro-chip__value">{Math.round((product.caloriesPer100g ?? 0) * f)}</span>
                <span className="barcode-macro-chip__label">kcal</span>
              </div>
              <div className="barcode-macro-chip barcode-macro-chip--protein">
                <span className="barcode-macro-chip__value">{round1((product.proteinPer100g ?? 0) * f)}</span>
                <span className="barcode-macro-chip__label">protein</span>
              </div>
              <div className="barcode-macro-chip barcode-macro-chip--fat">
                <span className="barcode-macro-chip__value">{round1((product.fatPer100g ?? 0) * f)}</span>
                <span className="barcode-macro-chip__label">fat</span>
              </div>
              <div className="barcode-macro-chip barcode-macro-chip--carbs">
                <span className="barcode-macro-chip__value">{round1((product.carbsPer100g ?? 0) * f)}</span>
                <span className="barcode-macro-chip__label">carbs</span>
              </div>
            </div>
          )}

          {addError && <p className="error-text">{addError}</p>}

          <button
            type="button"
            className="profile-edit-btn"
            disabled={adding || grams <= 0}
            onClick={handleAdd}
          >
            {adding ? 'Adding…' : 'Add to today'}
          </button>

          <button type="button" className="barcode-rescan-link" onClick={scanAgain}>
            Scan a different product
          </button>
        </div>
      )}
    </div>
  )
}
