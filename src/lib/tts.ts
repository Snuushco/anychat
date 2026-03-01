// Text-to-Speech using Web Speech Synthesis API

let currentUtterance: SpeechSynthesisUtterance | null = null

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!isTTSSupported()) return []
  return speechSynthesis.getVoices()
}

export function getDutchVoice(): SpeechSynthesisVoice | null {
  const voices = getVoices()
  // Prefer Dutch female voice
  const dutchFemale = voices.find(v => v.lang.startsWith('nl') && v.name.toLowerCase().includes('female'))
  const dutch = voices.find(v => v.lang.startsWith('nl'))
  return dutchFemale || dutch || null
}

export function speak(text: string, lang = 'nl-NL', voiceName?: string): void {
  if (!isTTSSupported()) return
  stop()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 1.0
  utterance.pitch = 1.0

  if (voiceName) {
    const voice = getVoices().find(v => v.name === voiceName)
    if (voice) utterance.voice = voice
  } else {
    const dutch = getDutchVoice()
    if (dutch) utterance.voice = dutch
  }

  currentUtterance = utterance
  speechSynthesis.speak(utterance)
}

export function stop(): void {
  if (isTTSSupported()) {
    speechSynthesis.cancel()
  }
  currentUtterance = null
}

export function isSpeaking(): boolean {
  return isTTSSupported() && speechSynthesis.speaking
}

export function getAutoSpeak(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('anychat_auto_speak') === 'true'
}

export function setAutoSpeak(enabled: boolean): void {
  localStorage.setItem('anychat_auto_speak', String(enabled))
}

export function getSelectedVoice(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('anychat_tts_voice')
}

export function setSelectedVoice(name: string): void {
  localStorage.setItem('anychat_tts_voice', name)
}
