import { isNativePlatform } from './platform'

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export function getWebSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export async function nativeSpeechAvailable(): Promise<boolean> {
  if (!(await isNativePlatform())) return false
  try {
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
    const { available } = await SpeechRecognition.available()
    return available
  } catch {
    return false
  }
}

export function getConfidenceMessage(confidence: number): string {
  const pct = confidence > 1 ? confidence : confidence * 100
  if (pct >= 80) return 'Looks good, give it a quick review before saving.'
  if (pct >= 55) return 'Decent match, but review the details before saving.'
  return 'Low confidence, review carefully before saving.'
}
