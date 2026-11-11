import React, { useRef, useState } from 'react'
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { uploadAssetToStorage } from '../../lib/api'

interface SingleSpriteUploaderProps {
  label: string
  folder: string
  value: string
  onChange: (url: string) => void
  disabled?: boolean
}

export const SingleSpriteUploader: React.FC<SingleSpriteUploaderProps> = ({
  label,
  folder,
  value,
  onChange,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const res: any = await uploadAssetToStorage(file, folder)
      if (res.success && res.data?.url) {
        onChange(res.data.url)
      } else {
        throw new Error(res.error || 'Gagal mengunggah file')
      }
    } catch (err: any) {
      console.warn('[Upload Error]', err)
      // Fallback preview lokal jika backend/S3 belum berjalan
      const localUrl = URL.createObjectURL(file)
      onChange(localUrl)
      setError('Mode preview lokal (Storage RustFS belum terhubung)')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300">{label}</label>
        {value && (
          <span className="flex items-center text-[10px] text-emerald-400 gap-1 font-mono">
            <CheckCircle2 className="h-3 w-3" /> Ready
          </span>
        )}
      </div>

      <div
        onClick={() => !disabled && !loading && fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
          value
            ? 'border-indigo-600/50 bg-indigo-950/20 hover:border-indigo-500'
            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || loading}
        />

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-indigo-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Mengunggah ke RustFS S3...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <UploadCloud className="h-5 w-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            <span className="text-xs text-slate-300 font-medium">
              {value ? 'Ganti Spritesheet' : 'Pilih Spritesheet (PNG)'}
            </span>
            <span className="text-[10px] text-slate-400">Drag & drop atau klik file</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-sans">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
