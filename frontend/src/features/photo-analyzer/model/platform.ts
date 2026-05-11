export async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export class PhotoPickError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'PhotoPickError'
  }
}

export type PhotoSource = 'prompt' | 'camera' | 'photos'

export async function pickPhotoNative(source: PhotoSource = 'prompt'): Promise<File | null> {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
  const sourceMap = {
    prompt: CameraSource.Prompt,
    camera: CameraSource.Camera,
    photos: CameraSource.Photos,
  } as const

  let photo
  try {
    photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: sourceMap[source],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/cancel/i.test(msg) || /User cancelled/i.test(msg)) return null
    throw new PhotoPickError('camera_failed', msg || 'Camera unavailable')
  }

  if (!photo.base64String) {
    throw new PhotoPickError('no_data', 'Camera returned no image data')
  }

  const mime = photo.format ? `image/${photo.format}` : 'image/jpeg'
  const binary = atob(photo.base64String)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], `photo.${photo.format || 'jpg'}`, { type: mime })
}
