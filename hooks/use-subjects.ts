'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export interface Subject {
  id: string
  name: string
  color: string
  targetHoursPerWeek: number
  studiedHoursThisWeek: number
}

const SUBJECTS_STORAGE_KEY = 'codebuddy.subjects'
const SUBJECTS_CHANGE_EVENT = 'codebuddy-subjects-change'

function readSubjects(): Subject[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(SUBJECTS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as Subject[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSubjects(subjects: Subject[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(subjects))
  window.dispatchEvent(new Event(SUBJECTS_CHANGE_EVENT))
}

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([])

  useEffect(() => {
    setSubjects(readSubjects())

    const handleStorage = () => setSubjects(readSubjects())
    window.addEventListener('storage', handleStorage)
    window.addEventListener(SUBJECTS_CHANGE_EVENT, handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(SUBJECTS_CHANGE_EVENT, handleStorage)
    }
  }, [])

  const addSubject = useCallback((subject: Omit<Subject, 'id' | 'studiedHoursThisWeek'>) => {
    const nextSubjects = [
      ...readSubjects(),
      {
        ...subject,
        id: globalThis.crypto?.randomUUID?.() || Date.now().toString(),
        studiedHoursThisWeek: 0,
      },
    ]

    writeSubjects(nextSubjects)
    setSubjects(nextSubjects)
  }, [])

  const updateSubject = useCallback((subjectId: string, updates: Partial<Omit<Subject, 'id'>>) => {
    const nextSubjects = readSubjects().map(subject => (
      subject.id === subjectId ? { ...subject, ...updates } : subject
    ))

    writeSubjects(nextSubjects)
    setSubjects(nextSubjects)
  }, [])

  const deleteSubject = useCallback((subjectId: string) => {
    const nextSubjects = readSubjects().filter(subject => subject.id !== subjectId)
    writeSubjects(nextSubjects)
    setSubjects(nextSubjects)
  }, [])

  return useMemo(() => ({
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
  }), [addSubject, deleteSubject, subjects, updateSubject])
}