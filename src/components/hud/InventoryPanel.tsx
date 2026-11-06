import React from 'react'
import { useGameStore } from '../../stores/useGameStore'
import type { ItemType } from '../../types/network'
import { DraggableRetroWindow } from './DraggableRetroWindow'

/**
 * InventoryPanel — Panel Tas/Inventory Draggable Retro RO.
 */
export const InventoryPanel: React.FC = () => {
  const inventory = useGameStore((state) => state.inventory)
  const useInventoryItem = useGameStore((state) => state.useInventoryItem)

  const handleUseItem = (itemId: ItemType) => {
    useInventoryItem(itemId)
  }

  const totalItems = inventory.reduce((acc, i) => acc + i.quantity, 0)

  return (
    <DraggableRetroWindow
      id="inventory_window"
      title="Item Inventory"
      icon="🎒"
      badgeText={`${totalItems} Items`}
      defaultCollapsed={false}
    >
      <div className="font-mono flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1">
          <span>Shared Loot Active</span>
          <span>Prontera Bag</span>
        </div>

        {inventory.length === 0 ? (
          <div className="text-center py-3 text-xs text-slate-500 italic font-sans">
            Tas kosong. Kalahkan monster untuk mendapatkan item!
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
            {inventory.map((item) => (
              <div
                key={item.itemId}
                className="bg-slate-950/70 border border-slate-800 rounded p-2 flex items-center justify-between text-xs hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <div className="truncate">
                    <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5 font-sans">
                      <span>{item.name}</span>
                      <span className="text-amber-400 text-[10px] font-mono">x{item.quantity}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate font-sans">
                      {item.description}
                    </div>
                  </div>
                </div>

                {item.healAmount ? (
                  <button
                    onClick={() => handleUseItem(item.itemId)}
                    className="ml-2 px-2 py-1 bg-emerald-600/30 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/50 rounded text-[10px] font-bold font-sans transition shrink-0 cursor-pointer"
                  >
                    Gunakan
                  </button>
                ) : (
                  <span className="ml-2 text-[9px] text-slate-500 shrink-0 font-sans">
                    Loot
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DraggableRetroWindow>
  )
}

export default InventoryPanel
