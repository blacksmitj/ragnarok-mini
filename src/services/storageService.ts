import type { StateStorage } from 'zustand/middleware'
import type { PlayerStats } from '../stores/useGameStore'
import { StatsSystem } from '../game/systems/StatsSystem'

export const STORAGE_KEY = 'mini-ragnarok-save-v1'

/**
 * Struktur data progres pemain yang disimpan ke LocalStorage.
 */
export interface GameSaveData {
  player: PlayerStats
  monstersDefeated: number
  lastSavedAt: string | null
  soundEnabled: boolean
}

/**
 * Memvalidasi dan men-sanitasi objek PlayerStats dari LocalStorage
 * agar aplikasi tidak crash apabila pengguna mengedit JSON secara manual / data korup.
 */
export function sanitizePlayerStats(raw: unknown, fallback: PlayerStats): PlayerStats {
  if (!raw || typeof raw !== 'object') return fallback

  const obj = raw as Record<string, unknown>
  const level =
    typeof obj.level === 'number' && Number.isFinite(obj.level) && obj.level >= 1
      ? Math.floor(obj.level)
      : fallback.level

  const maxHp =
    typeof obj.maxHp === 'number' && Number.isFinite(obj.maxHp) && obj.maxHp >= 50
      ? Math.floor(obj.maxHp)
      : 100 + (level - 1) * StatsSystem.HP_PER_LEVEL

  const hp =
    typeof obj.hp === 'number' && Number.isFinite(obj.hp)
      ? Math.max(1, Math.min(maxHp, Math.floor(obj.hp)))
      : maxHp

  const maxExp = StatsSystem.calculateRequiredExp(level)

  const exp =
    typeof obj.exp === 'number' && Number.isFinite(obj.exp) && obj.exp >= 0
      ? Math.min(maxExp - 1, Math.floor(obj.exp))
      : 0

  const baseAtk =
    typeof obj.baseAtk === 'number' && Number.isFinite(obj.baseAtk) && obj.baseAtk >= 1
      ? Math.floor(obj.baseAtk)
      : 12 + (level - 1) * StatsSystem.ATK_PER_LEVEL

  const zeny =
    typeof obj.zeny === 'number' && Number.isFinite(obj.zeny) && obj.zeny >= 0
      ? Math.floor(obj.zeny)
      : 0

  const name =
    typeof obj.name === 'string' && obj.name.trim().length > 0
      ? obj.name.trim()
      : fallback.name

  return {
    name,
    level,
    hp,
    maxHp,
    exp,
    maxExp,
    baseAtk,
    zeny,
  }
}

/**
 * Menyimpan state permainan secara manual ke LocalStorage dengan penanganan error (QuotaExceeded / Private Mode).
 */
export function saveGameState(data: GameSaveData): boolean {
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY)
    const version = 1
    let existingVersion = version

    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw) as { version?: number }
        if (typeof parsed.version === 'number') {
          existingVersion = parsed.version
        }
      } catch {
        // Abaikan jika JSON lama rusak, kita timpa dengan yang baru
      }
    }

    const payload = JSON.stringify({
      state: data,
      version: existingVersion,
    })
    localStorage.setItem(STORAGE_KEY, payload)
    return true
  } catch (err) {
    console.warn('[StorageService] Gagal menyimpan ke LocalStorage:', err)
    return false
  }
}

/**
 * Memuat state permainan dari LocalStorage. Mengembalikan null jika belum ada save atau data korup.
 */
export function loadGameState(): Partial<GameSaveData> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as { state?: Partial<GameSaveData> }
    if (!parsed || typeof parsed !== 'object' || !parsed.state) {
      return null
    }
    return parsed.state
  } catch (err) {
    console.warn('[StorageService] Data LocalStorage korup, mereset ke default:', err)
    return null
  }
}

/**
 * Menghapus data progres permainan dari LocalStorage.
 */
export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.warn('[StorageService] Gagal menghapus LocalStorage:', err)
  }
}

/**
 * Custom StateStorage adapter yang aman untuk Zustand `persist` middleware.
 * Menangani JSON korup secara graceful tanpa melempar uncaught exception.
 */
export const safeLocalStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      const value = localStorage.getItem(name)
      if (!value) return null
      // Pastikan JSON valid sebelum diberikan ke Zustand
      JSON.parse(value)
      return value
    } catch (err) {
      console.warn(`[StorageService] JSON korup terdeteksi pada key "${name}", membersihkan...`, err)
      localStorage.removeItem(name)
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value)
    } catch (err) {
      console.warn(`[StorageService] Gagal menulis ke key "${name}":`, err)
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name)
    } catch (err) {
      console.warn(`[StorageService] Gagal menghapus key "${name}":`, err)
    }
  },
}

