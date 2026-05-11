// Backend sends image to OpenAI Vision with detail="high". A single 512×512
// tile costs 255 tokens; going above 512px in either dimension pushes us into
// 4 tiles (765 tokens), so 512 is the sweet spot for our "medium" tier.
const MAX_DIMENSION = 512
const JPEG_QUALITY = 0.82
const SKIP_BELOW_BYTES = 80 * 1024 // <80KB — already small enough

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < SKIP_BELOW_BYTES) return file
  try {
    const bitmap = await loadBitmap(file)
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION)
    if (width === bitmap.width && height === bitmap.height && file.type === 'image/jpeg') {
      closeBitmap(bitmap)
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) { closeBitmap(bitmap); return file }
    ctx.drawImage(bitmap, 0, 0, width, height)
    closeBitmap(bitmap)
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

function closeBitmap(bitmap: ImageBitmap | HTMLImageElement) {
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
}

function fitWithin(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w / h
  return ratio > 1
    ? { width: max, height: Math.round(max / ratio) }
    : { width: Math.round(max * ratio), height: max }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
