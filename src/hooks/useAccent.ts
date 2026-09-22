import { useCallback } from 'react'
import { guessSubjectAccent, normalizeSubject } from '../domain/accents'
import { useSchedule } from '../store/useSchedule'

/** Цвет предмета: явно выбранный в настройках или угаданный по названию. */
export function useSubjectAccent() {
  const map = useSchedule((s) => s.data.subjectAccents)
  return useCallback((subject: string) => map[normalizeSubject(subject)] ?? guessSubjectAccent(subject), [map])
}
