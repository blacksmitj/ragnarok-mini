import type { TextSpriteMatrix } from '../types/sprite-ai';

/**
 * Menggambar satu frame tertentu dari TextSpriteMatrix ke elemen HTML5 Canvas.
 * Cocok untuk live animation preview di UI Admin.
 */
export function renderSingleFrameToCanvas(
  matrix: TextSpriteMatrix,
  frameIndex: number,
  scale: number = 1
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = matrix.frameWidth * scale;
  canvas.height = matrix.frameHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal mendapatkan 2D context dari canvas');
  }

  ctx.imageSmoothingEnabled = false;
  const frame = matrix.frames[frameIndex] ?? [];

  for (let y = 0; y < matrix.frameHeight; y++) {
    const row = frame[y] ?? '';
    for (let x = 0; x < matrix.frameWidth; x++) {
      const char = row[x] ?? '.';
      const color = matrix.palette[char];
      if (color && color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  return canvas;
}

/**
 * Merender seluruh frame pada TextSpriteMatrix secara horizontal menjadi satu
 * spritesheet PNG yang siap digunakan oleh Phaser 3 atau SpriteSlicerModal.
 */
export function renderMatrixToCanvas(
  matrix: TextSpriteMatrix,
  scale: number = 1
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const frameCount = Math.max(1, matrix.frames.length);
  canvas.width = matrix.frameWidth * frameCount * scale;
  canvas.height = matrix.frameHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal mendapatkan 2D context dari canvas');
  }

  ctx.imageSmoothingEnabled = false;

  matrix.frames.forEach((frame, frameIdx) => {
    const offsetX = frameIdx * matrix.frameWidth * scale;
    for (let y = 0; y < matrix.frameHeight; y++) {
      const row = frame[y] ?? '';
      for (let x = 0; x < matrix.frameWidth; x++) {
        const char = row[x] ?? '.';
        const color = matrix.palette[char];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(offsetX + x * scale, y * scale, scale, scale);
        }
      }
    }
  });

  return canvas;
}

/**
 * Mengonversi HTMLCanvasElement menjadi objek File PNG standar.
 */
export function canvasToPngFile(
  canvas: HTMLCanvasElement,
  fileName: string = 'ai-sprite.png'
): Promise<File> {
  const safeName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Gagal mengonversi canvas ke PNG Blob'));
        return;
      }
      resolve(new File([blob], safeName, { type: 'image/png' }));
    }, 'image/png');
  });
}

