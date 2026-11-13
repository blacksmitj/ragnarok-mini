import React, { useRef, useState } from 'react'
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, ShieldCheck, XCircle, Sparkles } from 'lucide-react'
import { uploadAssetToStorage } from '../../lib/api'
import { validateCharacterSprite, type SpriteValidationResult } from '../../lib/character-sprite-validator'
import { SpriteSlicerModal } from './sprite-slicer-modal'
import { TextSpriteGeneratorModal } from './text-sprite-generator-modal'

interface SingleSpriteUploaderProps {
  label: string
  folder: string
  value: string
  onChange: (url: string) => void
  disabled?: boolean
  validateProfile?: 'character' | 'none'
  targetFrameSize?: number
  onValidated?: (result: SpriteValidationResult) => void
}

export const SingleSpriteUploader: React.FC<SingleSpriteUploaderProps> = ({
  label,
  folder,
  value,
  onChange,
  disabled = false,
  validateProfile = 'none',
  targetFrameSize = 64,
  onValidated,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [validationStatus, setValidationStatus] = useState<SpriteValidationResult | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isSlicerOpen, setIsSlicerOpen] = useState<boolean>(false)
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Memproses berkas akhir (setelah dipotong bersih)
  const processFinalFile = async (file: File) => {
    setError(null)

    // 1. Validasi otomatis jika profil karakter aktif
    if (validateProfile === 'character') {
      try {
        const result = await validateCharacterSprite(file, targetFrameSize)
        setValidationStatus(result)
        if (onValidated) onValidated(result)

        if (!result.isValid) {
          setError(result.error || 'Berkas tidak sesuai standar spesifikasi karakter!')
          if (fileInputRef.current) fileInputRef.current.value = ''
          return
        }
      } catch (err: any) {
        setError(`Gagal memvalidasi berkas: ${err.message}`)
        return
      }
    }

    // 2. Berkas Lolos Validasi -> Mulai Upload ke RustFS S3 / Backend
    setLoading(true)

    try {
      const res: any = await uploadAssetToStorage(file, folder)
      if (res.success && res.data?.url) {
        onChange(res.data.url)
      } else {
        throw new Error(res.error || 'Gagal mengunggah file ke backend')
      }
    } catch (err: any) {
      console.warn('[Upload Error]', err)
      // Fallback preview lokal jika backend/S3 RustFS belum online
      const localUrl = URL.createObjectURL(file)
      onChange(localUrl)
      setError('Mode preview lokal aktif (Storage S3 RustFS belum terhubung)')
    } finally {
      setLoading(false)
    }
  }

  // Saat file dipilih dari input atau drag & drop
  const handleInitialFile = (file: File) => {
    setError(null)
    if (validateProfile === 'character') {
      // Buka Interactive Sprite Slicer Modal terlebih dahulu
      setPendingFile(file)
      setIsSlicerOpen(true)
    } else {
      processFinalFile(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleInitialFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled || loading) return

    const file = e.dataTransfer.files?.[0]
    if (!file) return
    handleInitialFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled && !loading) setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleSlicerConfirm = async (croppedFile: File) => {
    setIsSlicerOpen(false)
    setPendingFile(null)
    await processFinalFile(croppedFile)
  }

  const handleSlicerCancel = () => {
    setIsSlicerOpen(false)
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
          {label}
          {validateProfile === 'character' && (
            <span className="text-[10px] text-sky-400 bg-sky-950/60 border border-sky-800 px-1.5 py-0.2 rounded font-mono">
              Auto-Slicer ({targetFrameSize}px)
            </span>
          )}
        </label>
        {value && !error && (
          <span className="flex items-center text-[10px] text-emerald-400 gap-1 font-mono">
            <CheckCircle2 className="h-3 w-3" /> Ready
          </span>
        )}
      </div>

      <div
        onClick={() => !disabled && !loading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-sky-500 bg-sky-950/30'
            : value && !error
              ? 'border-indigo-600/50 bg-indigo-950/20 hover:border-indigo-500'
              : error
                ? 'border-rose-600/60 bg-rose-950/20 hover:border-rose-500'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={validateProfile === 'character' ? 'image/png' : 'image/png, image/jpeg, image/webp'}
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
            {validationStatus?.isValid && value && !error ? (
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            ) : error ? (
              <XCircle className="h-6 w-6 text-rose-400 animate-pulse" />
            ) : (
              <UploadCloud className="h-6 w-6 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            )}

            <span className="text-xs text-slate-300 font-medium">
              {value && !error ? 'Ganti Spritesheet' : 'Pilih Spritesheet (PNG)'}
            </span>
            <span className="text-[10px] text-slate-400">
              {validateProfile === 'character'
                ? `Auto-Slicer & Crop Studio Aktif (Tinggi ${targetFrameSize * 4}px)`
                : 'Drag & drop atau klik file'}
            </span>
          </div>
        )}
      </div>

      {/* Tombol Generate AI (9Router) */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => setIsAiGeneratorOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate via AI (9Router)
        </button>
      </div>

      {/* Pesan Kesalahan / Validasi */}
      {error && (
        <div className="flex items-start gap-1.5 text-[11px] text-rose-300 bg-rose-950/40 border border-rose-900/60 p-2 rounded">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Ditolak Standar Input:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Interactive Modal Dialog Slicer */}
      {isSlicerOpen && pendingFile && (
        <SpriteSlicerModal
          isOpen={isSlicerOpen}
          file={pendingFile}
          frameWidth={targetFrameSize}
          frameHeight={targetFrameSize}
          onConfirm={handleSlicerConfirm}
          onCancel={handleSlicerCancel}
        />
      )}

      {/* AI Text-to-Sprite Generator Modal */}
      <TextSpriteGeneratorModal
        isOpen={isAiGeneratorOpen}
        onClose={() => setIsAiGeneratorOpen(false)}
        onUseSprite={(file) => {
          void processFinalFile(file)
        }}
      />
    </div>
  )
}
