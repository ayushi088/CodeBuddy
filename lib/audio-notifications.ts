'use client'

/**
 * Text-to-Speech Audio Notifications
 */

interface TextToSpeechOptions {
  rate?: number
  pitch?: number
  volume?: number
}

const VOICE_MUTE_STORAGE_KEY = 'studybuddy.voiceMuted'
const SPEECH_COOLDOWN_MS = 12000
const lastSpeechAtByKey = new Map<string, number>()

function getStoredMutePreference() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(VOICE_MUTE_STORAGE_KEY) === 'true'
}

function persistMutePreference(muted: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(VOICE_MUTE_STORAGE_KEY, muted ? 'true' : 'false')
}

export const audioNotifications = {
  attendanceMarked: () => {
    speak('Attendance marked successfully!', { rate: 1 })
  },

  eyesClosed: () => {
    speak('Hey! Stay focused. Wake up!', { rate: 0.9, pitch: 1.2 })
  },

  faceMissing: () => {
    speak('Come back to the screen. Do not leave your study place.', { rate: 0.9, pitch: 1 })
  },

  noHumanDetected: () => {
    speak('No human detected on camera. Please stay in front of the webcam.', { rate: 0.9, pitch: 1 })
  },

  spoofDetected: () => {
    speak(
      'Live verification issue detected. Please stay centered and improve lighting.',
      { rate: 0.9, pitch: 1 },
      'spoof-detected',
      20000,
    )
  },

  sessionEnding: () => {
    speak('Your study session is ending in 5 minutes', { rate: 0.95 }, 'session-ending', 30000)
  },

  sessionComplete: () => {
    speak('Great job! Your study session is complete.', { rate: 1, pitch: 1.1 }, 'session-complete', 30000)
  },

  isMuted: () => {
    return getStoredMutePreference()
  },

  setMuted: (muted: boolean) => {
    persistMutePreference(muted)

    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  },

  toggleMuted: () => {
    const next = !getStoredMutePreference()
    persistMutePreference(next)

    if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    return next
  },

  stopAll: () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    lastSpeechAtByKey.clear()
  },
}

function speak(text: string, options: TextToSpeechOptions = {}, cooldownKey?: string, cooldownMs = SPEECH_COOLDOWN_MS) {
  if (getStoredMutePreference()) {
    return
  }

  if (!('speechSynthesis' in window)) {
    console.log('Speech Synthesis not supported:', text)
    return
  }

  if (cooldownKey) {
    const now = Date.now()
    const lastSpeechAt = lastSpeechAtByKey.get(cooldownKey) ?? 0
    if (now - lastSpeechAt < cooldownMs) {
      return
    }
    lastSpeechAtByKey.set(cooldownKey, now)
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)

  // Get voice (prefer female voice if available)
  const voices = window.speechSynthesis.getVoices()
  const femaleVoice = voices.find(
    (voice) =>
      voice.name.toLowerCase().includes('female') ||
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('samantha')
  )
  if (femaleVoice) {
    utterance.voice = femaleVoice
  }

  utterance.rate = options.rate ?? 1
  utterance.pitch = options.pitch ?? 1
  utterance.volume = options.volume ?? 1

  window.speechSynthesis.speak(utterance)
}

export function preloadVoices() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices()
  }
}
