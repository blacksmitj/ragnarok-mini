import React, { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../../stores/useGameStore'
import { networkService } from '../../services/networkService'

/**
 * ChatWindow — Panel obrolan real-time retro ala Ragnarok Online.
 * Terletak di sudut kiri bawah layar viewport, mendukung pengetikan pesan
 * dengan tombol Enter, history scroll otomatis, dan filtering chat.
 */
export const ChatWindow: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)
  const chatMessages = useGameStore((state) => state.chatMessages)
  const setChatFocused = useGameStore((state) => state.setChatFocused)
  const isServerConnected = useGameStore((state) => state.isServerConnected)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Otomatis scroll ke pesan paling bawah saat ada pesan baru
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, isExpanded])

  // Global listener shortcut: Tekan 'Enter' di mana saja untuk fokus ke input chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (document.activeElement !== inputRef.current) {
          e.preventDefault()
          inputRef.current?.focus()
        }
      } else if (e.key === 'Escape') {
        if (document.activeElement === inputRef.current) {
          inputRef.current?.blur()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !isServerConnected) return

    networkService.sendChatMessage(inputText.trim())
    setInputText('')
  }

  return (
    <div
      className={`relative z-20 flex flex-col transition-all duration-200 pointer-events-auto font-mono ${
        isExpanded ? 'w-80 sm:w-96' : 'w-44'
      }`}
    >
      {/* Header Bar Chat */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-t-lg px-3 py-1.5 flex items-center justify-between text-xs backdrop-blur shadow-md">
        <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
          <span>💬</span>
          <span>Prontera Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">
            {isServerConnected ? '● Online' : '○ Offline'}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white px-1 text-xs cursor-pointer"
            title={isExpanded ? 'Kecilkan' : 'Perbesar'}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* Konten Log Pesan */}
      {isExpanded && (
        <div className="bg-slate-950/85 border-x border-slate-700/80 h-36 overflow-y-auto p-2.5 space-y-1.5 text-xs backdrop-blur scrollbar-thin scrollbar-thumb-slate-700">
          {chatMessages.map((msg) => (
            <div key={msg.id} className="leading-tight break-words">
              {msg.type === 'system' ? (
                <span className="text-amber-400 italic">
                  [Sistem]: {msg.text}
                </span>
              ) : (
                <>
                  <span className="text-sky-400 font-semibold hover:underline cursor-pointer">
                    [{msg.senderName}]:
                  </span>{' '}
                  <span className="text-slate-200">{msg.text}</span>
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Box */}
      {isExpanded && (
        <form
          onSubmit={handleSendMessage}
          className="bg-slate-900/95 border border-slate-700/80 rounded-b-lg p-1.5 flex items-center gap-1.5 backdrop-blur"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setChatFocused(true)}
            onBlur={() => setChatFocused(false)}
            placeholder={
              isServerConnected
                ? 'Tekan Enter untuk mengetik...'
                : 'Server offline...'
            }
            maxLength={100}
            disabled={!isServerConnected}
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/80"
          />
          <button
            type="submit"
            disabled={!isServerConnected || !inputText.trim()}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold px-3 py-1 rounded text-xs transition cursor-pointer"
          >
            Kirim
          </button>
        </form>
      )}
    </div>
  )
}

