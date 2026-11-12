/**
 * Karakter Spritesheet Validator Engine (Mendukung 4 Arah & 8 Arah Serong)
 * Mini Ragnarok 2D Action RPG
 *
 * Mengunci standar inputan spritesheet karakter,
 * memvalidasi kelipatan frame, 8 arah mata angin (rows = 8) atau 4 arah (rows = 4),
 * aspect ratio, dan mendeteksi transparansi pixel art.
 */

export const SPRITE_SPECS = {
  DEFAULT_FRAME_SIZE: 64,
  SUPPORTED_FRAME_SIZES: [64, 32] as const,
  SUPPORTED_ROWS: [8, 4] as const, // 8 baris (lengkap 8 arah) atau 4 baris (kardinal)
  MIN_COLS: 3, // Minimal 3 frame animasi per baris
  MAX_COLS: 8, // Maksimal 8 frame per baris
  MAX_FILE_SIZE_BYTES: 4 * 1024 * 1024, // 4 Megabytes
  ALLOWED_EXTENSIONS: ['png'],
  ALLOWED_MIME_TYPES: ['image/png'],
} as const

export interface SpriteValidationMetadata {
  fileName: string
  fileSizeBytes: number
  fileSizeFormatted: string
  width: number
  height: number
  frameWidth: number
  frameHeight: number
  cols: number
  rows: number
  directionMode: '8-dir' | '4-dir'
  aspectRatio: number
  hasAlphaChannel: boolean
  standardName: string
}

export interface SpriteValidationChecks {
  fileFormat: { valid: boolean; message: string }
  fileSize: { valid: boolean; message: string }
  frameDivisibility: { valid: boolean; message: string }
  rowsCount: { valid: boolean; message: string }
  columnsCount: { valid: boolean; message: string }
  aspectRatio: { valid: boolean; message: string }
  transparency: { valid: boolean; message: string }
}

export interface SpriteValidationResult {
  isValid: boolean
  error: string | null
  warnings: string[]
  metadata?: SpriteValidationMetadata
  checks: SpriteValidationChecks
}

/**
 * Format bytes menjadi teks yang mudah dibaca (e.g. "124 KB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Validasi otomatis seketika file dibaca (Mendukung 8 Arah & 4 Arah)
 */
export async function validateCharacterSprite(
  file: File,
  targetFrameSize: number = SPRITE_SPECS.DEFAULT_FRAME_SIZE
): Promise<SpriteValidationResult> {
  const warnings: string[] = []
  const fileName = file.name.toLowerCase()
  const isPng = fileName.endsWith('.png') && (file.type === 'image/png' || file.type === '')

  const checks: SpriteValidationChecks = {
    fileFormat: {
      valid: isPng,
      message: isPng ? 'Format PNG (32-bit RGBA) valid' : 'Format berkas wajib PNG untuk mendukung transparansi pixel art',
    },
    fileSize: {
      valid: file.size <= SPRITE_SPECS.MAX_FILE_SIZE_BYTES,
      message:
        file.size <= SPRITE_SPECS.MAX_FILE_SIZE_BYTES
          ? `Ukuran berkas aman (${formatBytes(file.size)})`
          : `Ukuran berkas (${formatBytes(file.size)}) melebihi batas maksimal 4 MB`,
    },
    frameDivisibility: { valid: false, message: 'Belum diperiksa' },
    rowsCount: { valid: false, message: 'Belum diperiksa' },
    columnsCount: { valid: false, message: 'Belum diperiksa' },
    aspectRatio: { valid: false, message: 'Belum diperiksa' },
    transparency: { valid: false, message: 'Belum diperiksa' },
  }

  // Jika format file atau ukuran dasar tidak valid, langsung tolak
  if (!checks.fileFormat.valid) {
    return {
      isValid: false,
      error: checks.fileFormat.message,
      warnings,
      checks,
    }
  }

  if (!checks.fileSize.valid) {
    return {
      isValid: false,
      error: checks.fileSize.message,
      warnings,
      checks,
    }
  }

  // Muat gambar in-memory menggunakan Image dan URL.createObjectURL
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Gagal memproses berkas gambar raster PNG'))
      image.src = objectUrl
    })

    const width = img.naturalWidth || img.width
    const height = img.naturalHeight || img.height

    // 1. Cek kelipatan dimensi terhadap frame size baku (misal 64px)
    const isWidthDivisible = width % targetFrameSize === 0
    const isHeightDivisible = height % targetFrameSize === 0
    const frameDivisible = isWidthDivisible && isHeightDivisible

    checks.frameDivisibility = {
      valid: frameDivisible,
      message: frameDivisible
        ? `Dimensi (${width}x${height}px) tepat merupakan kelipatan frame ${targetFrameSize}x${targetFrameSize}px`
        : `Dimensi (${width}x${height}px) bukan kelipatan ${targetFrameSize}px! Setiap frame harus berukuran tepat ${targetFrameSize}x${targetFrameSize}px`,
    }

    // 2. Cek baris (Mendukung 8 Baris Isometrik atau 4 Baris Kardinal)
    const rows = Math.round(height / targetFrameSize)
    const isExactRowStandard = (rows === 8 || rows === 4) && isHeightDivisible

    checks.rowsCount = {
      valid: isExactRowStandard,
      message: isExactRowStandard
        ? `Memiliki ${rows} baris arah (${rows === 8 ? '8 Arah Isometrik Lengkap (Bawah, Serong, Kiri, Kanan, Atas)' : '4 Arah Kardinal Retro'})`
        : `Tinggi gambar (${height}px) tidak sesuai! Wajib tepat ${targetFrameSize * 8}px (8 arah) atau ${targetFrameSize * 4}px (4 arah)`,
    }

    // 3. Cek kolom (Animasi per arah: min 3 cols, max 8 cols)
    const cols = Math.round(width / targetFrameSize)
    const isColsValid = isWidthDivisible && cols >= SPRITE_SPECS.MIN_COLS && cols <= SPRITE_SPECS.MAX_COLS

    checks.columnsCount = {
      valid: isColsValid,
      message: isColsValid
        ? `Memiliki ${cols} frame kolom per arah (${width}px = ${cols} frame × ${targetFrameSize}px)`
        : `Jumlah kolom frame (${cols}) tidak sesuai standar! Minimal ${SPRITE_SPECS.MIN_COLS} frame dan maksimal ${SPRITE_SPECS.MAX_COLS} frame per baris`,
    }

    // 4. Cek Aspect Ratio
    const aspectRatio = width / (height || 1)
    const expectedRatio = cols / rows
    const isRatioAccurate = Math.abs(aspectRatio - expectedRatio) < 0.02 && isColsValid && isExactRowStandard

    checks.aspectRatio = {
      valid: isRatioAccurate,
      message: isRatioAccurate
        ? `Rasio aspek (${aspectRatio.toFixed(2)} : 1) sesuai dengan grid ${cols}x${rows}`
        : `Rasio gambar (${aspectRatio.toFixed(2)}) tidak proporsional untuk standar grid ${rows} arah`,
    }

    // 5. Cek Transparansi Piksel dengan Offscreen Canvas
    let hasAlphaChannel = true
    try {
      const canvas = document.createElement('canvas')
      canvas.width = Math.min(width, 128)
      canvas.height = Math.min(height, 128)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        let transparentPixelCount = 0
        const totalSamplePixels = imgData.length / 4

        for (let i = 3; i < imgData.length; i += 4) {
          if (imgData[i] < 250) {
            transparentPixelCount++
          }
        }

        if (transparentPixelCount / totalSamplePixels < 0.02) {
          hasAlphaChannel = false
          warnings.push('Gambar tampaknya memiliki latar belakang solid (tidak transparan). Pastikan background sprite transparan (alpha = 0).')
        }
      }
    } catch {
      // Abaikan jika browser membatasi CORS canvas
    }

    checks.transparency = {
      valid: hasAlphaChannel,
      message: hasAlphaChannel
        ? 'Transparansi latar belakang terverifikasi'
        : 'Peringatan: Tidak ditemukan piksel transparan (kemungkinan latar belakang solid)',
    }

    // Evaluasi status validitas keseluruhan
    const isAllValid =
      checks.fileFormat.valid &&
      checks.fileSize.valid &&
      checks.frameDivisibility.valid &&
      checks.rowsCount.valid &&
      checks.columnsCount.valid &&
      checks.aspectRatio.valid

    const firstFailedCheck = Object.values(checks).find((c) => !c.valid)
    const errorMessage = isAllValid ? null : firstFailedCheck?.message || 'Validasi spritesheet gagal'

    const metadata: SpriteValidationMetadata = {
      fileName: file.name,
      fileSizeBytes: file.size,
      fileSizeFormatted: formatBytes(file.size),
      width,
      height,
      frameWidth: targetFrameSize,
      frameHeight: targetFrameSize,
      cols,
      rows,
      directionMode: rows === 8 ? '8-dir' : '4-dir',
      aspectRatio,
      hasAlphaChannel,
      standardName: `${targetFrameSize}x${targetFrameSize}px (${cols}x${rows} Frames - ${rows === 8 ? '8 Arah' : '4 Arah'})`,
    }

    return {
      isValid: isAllValid,
      error: errorMessage,
      warnings,
      metadata,
      checks,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * Menghasilkan copy-prompt standar industri untuk AI Generator (Midjourney, DALL-E, Stable Diffusion, Flux)
 * sesuai mode 8 Arah (isometrik) atau 4 Arah (kardinal).
 */
export function generateSpritePrompt(
  mode: 8 | 4,
  frameSize: number = 64,
  cols: number = 4,
  characterSubject: string = 'Novice adventurer character in Ragnarok Online style'
): string {
  const totalW = cols * frameSize
  const totalH = mode * frameSize

  if (mode === 8) {
    return `Pixel art 2D character spritesheet of ${characterSubject}, classic Ragnarok Online retro 16-bit RPG style.
Grid Specification: Exactly ${cols} columns by 8 rows on a clean uniform grid, total image size ${totalW}x${totalH} pixels.
Each sprite frame must be strictly ${frameSize}x${frameSize} pixels, perfectly centered, seamless looping walk cycle.
Row order from top to bottom (8 isometric directions clockwise):
Row 0: Facing South / Down (walking)
Row 1: Facing South-West / Down-Left (walking)
Row 2: Facing West / Left (walking)
Row 3: Facing North-West / Up-Left (walking)
Row 4: Facing North / Up (walking)
Row 5: Facing North-East / Up-Right (walking)
Row 6: Facing East / Right (walking)
Row 7: Facing South-East / Down-Right (walking)
Details: Crisp pixel art, sharp contours, no blur, no anti-aliasing artifacts, transparent background PNG, no shadows, game-ready spritesheet.`
  }

  return `Pixel art 2D character spritesheet of ${characterSubject}, classic Ragnarok Online retro 16-bit RPG style.
Grid Specification: Exactly ${cols} columns by 4 rows on a clean uniform grid, total image size ${totalW}x${totalH} pixels.
Each sprite frame must be strictly ${frameSize}x${frameSize} pixels, perfectly centered, seamless looping walk cycle.
Row order from top to bottom (4 cardinal directions):
Row 0: Facing South / Down (walking)
Row 1: Facing West / Left (walking)
Row 2: Facing East / Right (walking)
Row 3: Facing North / Up (walking)
Details: Crisp pixel art, sharp contours, no blur, no anti-aliasing artifacts, transparent background PNG, no shadows, game-ready spritesheet.`
}
