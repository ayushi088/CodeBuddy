'use client'

/**
 * Text-to-Speech Audio Notifications
 */

interface TextToSpeechOptions {
  rate?: number
  pitch?: number
  volume?: number
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

  sessionEnding: () => {
    speak('Your study session is ending in 5 minutes', { rate: 0.95 })
  },

  sessionComplete: () => {
    speak('Great job! Your study session is complete.', { rate: 1, pitch: 1.1 })
  },
}

function speak(text: string, options: TextToSpeechOptions = {}) {
  if (!('speechSynthesis' in window)) {
    console.log('Speech Synthesis not supported:', text)
    return
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
