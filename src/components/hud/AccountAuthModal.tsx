import React, { useState } from 'react'
import { useGameStore } from '../../stores/useGameStore'
import { networkService } from '../../services/networkService'

/**
 * AccountAuthModal — Modal Login / Buat Akun Retro ala Ragnarok Online.
 * Memungkinkan pemain mengganti identitas karakter atau masuk dengan username baru.
 * Tersimpan secara permanen di database SQLite server.
 */
export const AccountAuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const currentUsername = useGameStore((state) => state.accountUsername)
  const setAccountUsername = useGameStore((state) => state.setAccountUsername)
  const [usernameInput, setUsernameInput] = useState(currentUsername)

  if (!isOpen) return null

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUser = usernameInput.trim().toLowerCase()
    if (!cleanUser) return

    setAccountUsername(cleanUser)
    networkService.joinGame({
      username: cleanUser,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center font-bold text-amber-400">
            RO
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-300">
              Prontera Account Login
            </h3>
            <p className="text-[11px] text-slate-400">
              SQLite Server-Side Database
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username Karakter:
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Contoh: ragnar, novice, healer"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              maxLength={16}
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">
              *Jika belum ada, akun baru akan otomatis dibuatkan di database.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-md"
            >
              Masuk / Login ⚔️
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

