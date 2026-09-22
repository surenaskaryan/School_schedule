import type { AppData } from '../domain/types'
import { createSeed } from './seed'
import { sanitizeAppData } from './validate'

/**
 * Слой хранения. Приложение знает только этот интерфейс,
 * поэтому localStorage можно заменить на backend / синхронизацию,
 * не трогая UI и store: достаточно новой реализации ScheduleRepository.
 */
export interface ScheduleRepository {
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
  clear(): Promise<void>
}

const STORAGE_KEY = 'school-schedule:v1'

export class LocalStorageRepository implements ScheduleRepository {
  constructor(private key = STORAGE_KEY) {}

  async load() {
    try {
      const raw = localStorage.getItem(this.key)
      if (!raw) return null
      return sanitizeAppData(JSON.parse(raw))
    } catch {
      return null
    }
  }

  async save(data: AppData) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data))
    } catch (e) {
      console.warn('Не удалось сохранить расписание', e)
    }
  }

  async clear() {
    try {
      localStorage.removeItem(this.key)
    } catch {
      /* ignore */
    }
  }
}

/* Пример будущей реализации:
export class HttpRepository implements ScheduleRepository {
  constructor(private baseUrl: string, private token: string) {}
  async load() { return sanitizeAppData(await (await fetch(`${this.baseUrl}/schedule`, …)).json()) }
  async save(data: AppData) { await fetch(`${this.baseUrl}/schedule`, { method: 'PUT', body: JSON.stringify(data), … }) }
  async clear() { … }
}
*/

export const repository: ScheduleRepository = new LocalStorageRepository()

/**
 * Первый запуск: сохранённые данные → `initial-schedule.json` рядом с сайтом
 * (файл, полученный из исходного расписания) → пустой seed.
 */
export async function loadInitialData(repo: ScheduleRepository = repository): Promise<AppData> {
  const stored = await repo.load()
  if (stored) return stored
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}initial-schedule.json`, { cache: 'no-store' })
    if (res.ok) {
      const data = sanitizeAppData(await res.json())
      if (data) return data
    }
  } catch {
    /* файла нет — это нормально */
  }
  return createSeed()
}
