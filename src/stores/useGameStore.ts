import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { StatsSystem } from '../game/systems/StatsSystem'
import type { ChatMessage, InventorySlot, ItemType, CharacterSyncPayload } from '../types/network'
import {
  STORAGE_KEY,
  safeLocalStorage,
  sanitizePlayerStats,
  clearGameState,
  saveGameState,
} from '../services/storageService'
import { soundService } from '../services/soundService'

/**
 * Interface mendefinisikan struktur data statistik karakter pemain.
 */
export interface PlayerStats {
  name: string
  level: number
  hp: number
  maxHp: number
  exp: number
  maxExp: number
  baseAtk: number
  zeny: number
}

/**
 * Interface informasi monster yang sedang ditarget / diserang oleh pemain.
 */
export interface TargetMonsterInfo {
  name: string
  hp: number
  maxHp: number
  level: number
}

/**
 * Interface mendefinisikan state global game dan aksi-aksi yang dapat dipicu.
 */
export interface GameStoreState {
  // Persisted State (Disimpan otomatis ke LocalStorage)
  accountUsername: string
  player: PlayerStats
  monstersDefeated: number
  inventory: InventorySlot[]
  lastSavedAt: string | null
  soundEnabled: boolean

  // Ephemeral / Runtime State (Tidak disimpan ke LocalStorage)
  targetMonster: TargetMonsterInfo | null
  isGameReady: boolean
  isPaused: boolean
  isServerConnected: boolean
  socketId: string | null
  onlineCount: number
  chatMessages: ChatMessage[]
  isChatFocused: boolean
  isPlayerDead: boolean
  wasLoadedFromSave: boolean
  isAutoFarming: boolean

  // Actions
  takeDamage: (amount: number) => void
  heal: (amount: number) => void
  addExp: (amount: number) => boolean
  addZeny: (amount: number) => void
  setTargetMonster: (target: TargetMonsterInfo | null) => void
  togglePause: () => void
  toggleSound: () => void
  manualSave: () => void
  dismissLoadedBanner: () => void
  incrementMonstersDefeated: () => void
  setGameReady: (ready: boolean) => void
  setServerStatus: (connected: boolean, socketId?: string | null) => void
  setOnlineCount: (count: number) => void
  addChatMessage: (msg: ChatMessage) => void
  setChatFocused: (focused: boolean) => void
  respawnPlayer: () => void
  setAccountUsername: (username: string) => void
  loadServerCharacter: (char: CharacterSyncPayload) => void
  addItemToInventory: (itemId: ItemType, name: string) => void
  useInventoryItem: (itemId: ItemType) => void
  toggleAutoFarming: () => void
  resetGame: () => void
}

// Data awal karakter (Novice Level 1)
export const INITIAL_PLAYER: PlayerStats = {
  name: 'Novice Adventurer',
  level: 1,
  hp: 100,
  maxHp: 100,
  exp: 0,
  maxExp: StatsSystem.calculateRequiredExp(1),
  baseAtk: 12,
  zeny: 0,
}

function getCurrentTimeLabel(): string {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Zustand Store untuk Mini Ragnarok dengan middleware `persist` (Fase 10).
 * - Menyimpan progres `player`, `monstersDefeated`, `lastSavedAt`, dan `soundEnabled` ke LocalStorage.
 * - Melakukan sanitasi data saat rehydration agar kebal terhadap modifikasi JSON korup.
 */
export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      accountUsername: 'novice',
      player: INITIAL_PLAYER,
      monstersDefeated: 0,
      inventory: [
        {
          itemId: 'red_potion',
          name: 'Red Potion',
          quantity: 3,
          icon: '🧪',
          description: 'Memulihkan 35 HP karakter seketika.',
          healAmount: 35
        }
      ],
      lastSavedAt: null,
      soundEnabled: true,

      targetMonster: null,
      isGameReady: false,
      isPaused: false,
      wasLoadedFromSave: false,
      isServerConnected: false,
      socketId: null,
      onlineCount: 1,
      chatMessages: [
        {
          id: 'welcome-msg',
          senderId: 'system',
          senderName: 'Sistem',
          text: 'Selamat datang di Prontera Training Ground! Tekan [Enter] untuk membuka chat.',
          timestamp: Date.now(),
          type: 'system'
        }
      ],
      isChatFocused: false,
      isPlayerDead: false,
      isAutoFarming: false,

      takeDamage: (amount: number) =>
        set((state) => {
          const nextHp = Math.max(0, state.player.hp - amount)
          return {
            player: {
              ...state.player,
              hp: nextHp,
            },
            isPlayerDead: nextHp === 0,
            lastSavedAt: getCurrentTimeLabel(),
          }
        }),

      respawnPlayer: () =>
        set((state) => ({
          player: {
            ...state.player,
            hp: state.player.maxHp,
          },
          isPlayerDead: false,
          lastSavedAt: getCurrentTimeLabel(),
        })),

      heal: (amount: number) => {
        soundService.playHeal(get().soundEnabled)
        set((state) => ({
          player: {
            ...state.player,
            hp: Math.min(state.player.maxHp, state.player.hp + amount),
          },
          lastSavedAt: getCurrentTimeLabel(),
        }))
      },

      addExp: (amount: number): boolean => {
        const currentPlayer = get().player
        const result = StatsSystem.applyExpGain(currentPlayer, amount)

        if (result.leveledUp) {
          soundService.playLevelUp(get().soundEnabled)
        }

        set({
          player: result.updatedPlayer,
          lastSavedAt: getCurrentTimeLabel(),
        })
        return result.leveledUp
      },

      addZeny: (amount: number) =>
        set((state) => ({
          player: {
            ...state.player,
            zeny: state.player.zeny + Math.max(0, amount),
          },
          lastSavedAt: getCurrentTimeLabel(),
        })),

      setTargetMonster: (target: TargetMonsterInfo | null) =>
        set({ targetMonster: target }),

      togglePause: () =>
        set((state) => ({
          isPaused: !state.isPaused,
        })),

      toggleSound: () =>
        set((state) => ({
          soundEnabled: !state.soundEnabled,
          lastSavedAt: getCurrentTimeLabel(),
        })),

      manualSave: () => {
        const timestamp = getCurrentTimeLabel()
        const state = get()
        saveGameState({
          player: state.player,
          monstersDefeated: state.monstersDefeated,
          lastSavedAt: timestamp,
          soundEnabled: state.soundEnabled,
        })
        set({ lastSavedAt: timestamp })
      },

      dismissLoadedBanner: () => set({ wasLoadedFromSave: false }),

      incrementMonstersDefeated: () =>
        set((state) => ({
          monstersDefeated: state.monstersDefeated + 1,
          lastSavedAt: getCurrentTimeLabel(),
        })),

      setGameReady: (ready: boolean) => set({ isGameReady: ready }),

      setServerStatus: (connected: boolean, socketId: string | null = null) =>
        set({ isServerConnected: connected, socketId }),

      setOnlineCount: (count: number) => set({ onlineCount: count }),

      addChatMessage: (msg: ChatMessage) =>
        set((state) => ({
          chatMessages: [...state.chatMessages.slice(-49), msg] // Batasi maksimal 50 pesan terakhir
        })),

      setChatFocused: (focused: boolean) => set({ isChatFocused: focused }),

      setAccountUsername: (username: string) => set({ accountUsername: username }),

      loadServerCharacter: (char: CharacterSyncPayload) => {
        set((state) => ({
          accountUsername: char.username,
          player: {
            name: char.name,
            level: char.level,
            hp: char.hp,
            maxHp: char.maxHp,
            exp: char.exp,
            maxExp: char.maxExp,
            baseAtk: char.baseAtk,
            zeny: char.zeny,
          },
          inventory: char.inventory && char.inventory.length > 0 ? char.inventory : state.inventory,
          lastSavedAt: getCurrentTimeLabel(),
          wasLoadedFromSave: true,
        }))
      },

      addItemToInventory: (itemId: ItemType, name: string) => {
        set((state) => {
          const existing = state.inventory.find((i) => i.itemId === itemId)
          if (existing) {
            return {
              inventory: state.inventory.map((i) =>
                i.itemId === itemId ? { ...i, quantity: i.quantity + 1 } : i
              ),
              lastSavedAt: getCurrentTimeLabel(),
            }
          }

          let icon = '📦'
          let desc = 'Barang temuan hasil berburu.'
          let healAmount: number | undefined

          if (itemId === 'jellopy') {
            icon = '💎'
            desc = 'Kristal lendir bening yang dijatuhkan Poring.'
          } else if (itemId === 'apple') {
            icon = '🍎'
            desc = 'Apel manis lezat. Memulihkan 15 HP.'
            healAmount = 15
          } else if (itemId === 'wolf_claw') {
            icon = '🐾'
            desc = 'Kuku tajam Desert Wolf. Bahan kerajinan.'
          } else if (itemId === 'red_potion') {
            icon = '🧪'
            desc = 'Ramuan merah Prontera. Memulihkan 35 HP.'
            healAmount = 35
          }

          return {
            inventory: [
              ...state.inventory,
              { itemId, name, quantity: 1, icon, description: desc, healAmount }
            ],
            lastSavedAt: getCurrentTimeLabel(),
          }
        })
      },

      useInventoryItem: (itemId: ItemType) => {
        const item = get().inventory.find((i) => i.itemId === itemId)
        if (!item || item.quantity <= 0) return

        if (item.healAmount) {
          get().heal(item.healAmount)
        }

        set((state) => ({
          inventory: state.inventory
            .map((i) => (i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0),
          lastSavedAt: getCurrentTimeLabel(),
        }))
      },

      toggleAutoFarming: () => {
        set((state) => ({
          isAutoFarming: !state.isAutoFarming,
        }))
      },

      resetGame: () => {
        clearGameState()
        set((state) => ({
          player: INITIAL_PLAYER,
          monstersDefeated: 0,
          lastSavedAt: null,
          targetMonster: null,
          isGameReady: state.isGameReady,
          isPaused: false,
          isPlayerDead: false,
          wasLoadedFromSave: false,
          isAutoFarming: false,
        }))
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      // Hanya simpan field progres karakter ke LocalStorage (jangan simpan state sementara seperti isPaused / targetMonster)
      partialize: (state) => ({
        accountUsername: state.accountUsername,
        player: state.player,
        monstersDefeated: state.monstersDefeated,
        inventory: state.inventory,
        lastSavedAt: state.lastSavedAt,
        soundEnabled: state.soundEnabled,
      }),
      // Sanitasi data saat dimuat dari LocalStorage agar aman dari JSON korup
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState
        }
        const persisted = persistedState as Partial<GameStoreState>
        const sanitizedPlayer = sanitizePlayerStats(persisted.player, INITIAL_PLAYER)
        const hasProgress =
          sanitizedPlayer.level > 1 ||
          sanitizedPlayer.exp > 0 ||
          (typeof persisted.monstersDefeated === 'number' && persisted.monstersDefeated > 0)

        return {
          ...currentState,
          player: sanitizedPlayer,
          monstersDefeated:
            typeof persisted.monstersDefeated === 'number' &&
            persisted.monstersDefeated >= 0
              ? Math.floor(persisted.monstersDefeated)
              : 0,
          lastSavedAt:
            typeof persisted.lastSavedAt === 'string' ? persisted.lastSavedAt : null,
          soundEnabled:
            typeof persisted.soundEnabled === 'boolean' ? persisted.soundEnabled : true,
          wasLoadedFromSave: hasProgress,
        }
      },
    }
  )
)
