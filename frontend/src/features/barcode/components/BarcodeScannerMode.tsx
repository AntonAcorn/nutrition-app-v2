import { useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { lookupBarcode, type FoodProduct } from '../model/barcodeApi'
import { addMealManually } from '../../current-day/model/nutritionTotalsApi'

type ScanStatus = 'scanning' | 'loading' | 'found' | 'not_found' | 'camera_error'

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

  useEffect(() => {
    let stopped = false
    setStatus('scanning')
    setProduct(null)

    async function start() {
      if (!videoRef.current) return
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromVideoDevice(
          undefined,
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
      } catch {
        if (!stopped) setStatus('camera_error')
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
        <video ref={videoRef} className="barcode-camera-video" autoPlay muted playsInline />
        <div className="barcode-camera-overlay">
          <div className="barcode-viewfinder" />
          <p className="barcode-hint">Point camera at barcode</p>
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
          <p className="error-text">Camera not available or permission denied.</p>
          <button type="button" className="tab-button tab-button--dark" onClick={onCancel}>
            Go back
          </button>
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
          <p className="profile-section-title" style={{ marginBottom: '0.25rem' }}>
            {product.name}
          </p>
          <p className="subtle-text" style={{ fontSize: '0.75rem', marginBottom: '1.25rem' }}>
            per 100 g: {Math.round(product.caloriesPer100g ?? 0)} kcal ·{' '}
            P {round1(product.proteinPer100g ?? 0)} g ·{' '}
            F {round1(product.fatPer100g ?? 0)} g ·{' '}
            C {round1(product.carbsPer100g ?? 0)} g
          </p>

          <label style={{ display: 'block', marginBottom: '1rem' }}>
            <span style={{ display: 'block', marginBottom: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
              Portion (g)
            </span>
            <input
              type="number"
              min={1}
              max={2000}
              value={portionGrams}
              onChange={(e) => setPortionGrams(e.target.value)}
            />
          </label>

          {grams > 0 && (
            <div className="barcode-totals-row">
              <span>{Math.round((product.caloriesPer100g ?? 0) * f)} kcal</span>
              <span>P {round1((product.proteinPer100g ?? 0) * f)}g</span>
              <span>F {round1((product.fatPer100g ?? 0) * f)}g</span>
              <span>C {round1((product.carbsPer100g ?? 0) * f)}g</span>
            </div>
          )}

          {addError && <p className="error-text" style={{ marginTop: '0.5rem' }}>{addError}</p>}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button type="button" className="profile-logout-btn" onClick={scanAgain}>
              Scan again
            </button>
            <button
              type="button"
              className="profile-edit-btn"
              style={{ flex: 1 }}
              disabled={adding || grams <= 0}
              onClick={handleAdd}
            >
              {adding ? 'Adding…' : 'Add to today'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
