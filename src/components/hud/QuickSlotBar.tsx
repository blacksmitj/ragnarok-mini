import React, { useEffect } from 'react'
import { useGameStore } from '../../stores/useGameStore'
import type { ItemType } from '../../types/network'

interface HotkeySlot {
  keyLabel: string
  hotkey: string
  itemId?: ItemType
  name: string
  icon: string
  isAutoFarm?: boolean
}

/**
 * QuickSlotBar — Hotbar / Quickslot Dok retro ala Ragnarok Online (Tombol 1, 2, 3, 4, 5).
 * Memungkinkan pemain mengonsumsi Red Potion, Apple, Toggle Auto Farm, dll.
 */
export const QuickSlotBar: React.FC = () => {
  const inventory = useGameStore((state) => state.inventory)
  const useInventoryItem = useGameStore((state) => state.useInventoryItem)
  const isChatFocused = useGameStore((state) => state.isChatFocused)
  const isAutoFarming = useGameStore((state) => state.isAutoFarming)
  const toggleAutoFarming = useGameStore((state) => state.toggleAutoFarming)

  // Konfigurasi Slot Cepat
  const slots: HotkeySlot[] = [
    {
      keyLabel: '1',
      hotkey: '1',
      itemId: 'red_potion',
      name: 'Red Potion',
      icon: '🧪',
    },
    {
      keyLabel: '2',
      hotkey: '2',
      itemId: 'apple',
      name: 'Apple',
      icon: '🍎',
    },
    {
      keyLabel: '3',
      hotkey: '3',
      name: 'Basic Atk',
      icon: '⚔️',
    },
    {
      keyLabel: '4',
      hotkey: '4',
      name: 'Sit/Rest',
      icon: '🧘',
    },
    {
      keyLabel: '5',
      hotkey: '5',
      name: 'Auto Farm',
      icon: isAutoFarming ? '🤖' : '🎯',
      isAutoFarm: true,
    },
  ]

  // Global Key Listener untuk shortcut 1, 2, 3, 4, 5
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Jangan picu jika sedang mengetik di input chat atau formulir
      if (
        isChatFocused ||
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }

      if (e.key === '1') {
        useInventoryItem('red_potion')
      } else if (e.key === '2') {
        useInventoryItem('apple')
      } else if (e.key === '5' || e.key.toLowerCase() === 'f') {
        toggleAutoFarming()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isChatFocused, useInventoryItem, toggleAutoFarming])

  return (
    <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-md border-2 border-slate-600 shadow-xl select-none font-mono">
      {slots.map((slot) => {
        const invItem = slot.itemId
          ? inventory.find((i) => i.itemId === slot.itemId)
          : null
        const quantity = invItem?.quantity ?? 0
        const isUsable = quantity > 0
        const isAutoFarmActive = slot.isAutoFarm && isAutoFarming

        return (
          <button
            key={slot.keyLabel}
            onClick={() => {
              if (slot.isAutoFarm) {
                toggleAutoFarming()
              } else if (slot.itemId && isUsable) {
                useInventoryItem(slot.itemId)
              }
            }}
            disabled={slot.itemId ? !isUsable : false}
            title={`${slot.name} [Tekan ${slot.keyLabel}]`}
            className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded border flex flex-col items-center justify-center transition-all cursor-pointer group ${
              isAutoFarmActive
                ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.5)] animate-pulse'
                : isUsable || !slot.itemId
                ? 'bg-slate-950/80 hover:bg-slate-800 border-slate-700 hover:border-amber-400 active:scale-95'
                : 'bg-slate-950/40 border-slate-800/80 opacity-40 cursor-not-allowed'
            }`}
          >
            {/* Hotkey Tag Badge */}
            <span
              className={`absolute top-0.5 left-1 text-[9px] font-bold drop-shadow ${
                isAutoFarmActive ? 'text-amber-200' : 'text-amber-300'
              }`}
            >
              {slot.keyLabel}
            </span>

            {/* Icon Item */}
            <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform">
              {slot.icon}
            </span>

            {/* Auto Farm Active Badge */}
            {slot.isAutoFarm && (
              <span
                className={`absolute bottom-0.5 text-[8px] font-bold uppercase tracking-wider ${
                  isAutoFarming ? 'text-emerald-400 font-extrabold' : 'text-slate-400'
                }`}
              >
                {isAutoFarming ? 'ON' : 'OFF'}
              </span>
            )}

            {/* Quantity Badge */}
            {slot.itemId && (
              <span
                className={`absolute bottom-0.5 right-1 text-[9px] font-bold ${
                  quantity > 0 ? 'text-amber-200' : 'text-slate-500'
                }`}
              >
                x{quantity}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default QuickSlotBar

