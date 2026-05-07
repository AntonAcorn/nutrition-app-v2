export async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export async function pickPhotoNative(): Promise<File | null> {
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
    })
    if (!photo.webPath) return null
    const res = await fetch(photo.webPath)
    const blob = await res.blob()
    return new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' })
  } catch {
    return null
  }
}
