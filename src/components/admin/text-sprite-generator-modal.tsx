import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Play, Pause, Download, Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import type {
  SupportedSpriteFrameSize,
  TextSpriteMatrix,
  SpriteAiGenerateResponse,
} from '../../types/sprite-ai';
import {
  renderSingleFrameToCanvas,
  renderMatrixToCanvas,
  canvasToPngFile,
} from '../../lib/text-sprite-renderer';

interface TextSpriteGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Dipanggil saat user memilih menggunakan file PNG hasil generate */
  onUseSprite?: (file: File) => void;
}

export const TextSpriteGeneratorModal: React.FC<TextSpriteGeneratorModalProps> = ({
  isOpen,
  onClose,
  onUseSprite,
}) => {
  const [prompt, setPrompt] = useState('Poring slime lucu berwarna biru laut dengan mata hitam');
  const [frameSize, setFrameSize] = useState<SupportedSpriteFrameSize>(16);
  const [frameCount, setFrameCount] = useState<3 | 4>(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<TextSpriteMatrix | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Loop animasi preview frame-by-frame
  useEffect(() => {
    if (!matrix || !isPlaying || matrix.frames.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % matrix.frames.length);
    }, 220);
    return () => clearInterval(timer);
  }, [matrix, isPlaying]);

  // Render frame aktif ke canvas preview (zoom 6x)
  useEffect(() => {
    if (!matrix || !previewCanvasRef.current) return;
    const scale = 6;
    const rendered = renderSingleFrameToCanvas(matrix, currentFrame, scale);
    const target = previewCanvasRef.current;
    target.width = rendered.width;
    target.height = rendered.height;
    const ctx = target.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, target.width, target.height);
      ctx.drawImage(rendered, 0, 0);
    }
  }, [matrix, currentFrame]);

  // Render full spritesheet strip (zoom 3x)
  useEffect(() => {
    if (!matrix || !sheetCanvasRef.current) return;
    const scale = 3;
    const rendered = renderMatrixToCanvas(matrix, scale);
    const target = sheetCanvasRef.current;
    target.width = rendered.width;
    target.height = rendered.height;
    const ctx = target.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, target.width, target.height);
      ctx.drawImage(rendered, 0, 0);
    }
  }, [matrix]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setCurrentFrame(0);

    try {
      const res = await fetch('/api/admin/generate-sprite-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), frameSize, frameCount }),
      });

      const json = (await res.json()) as SpriteAiGenerateResponse;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Gagal menghasilkan sprite');
      }

      setMatrix(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!matrix) return;
    const rawCanvas = renderMatrixToCanvas(matrix, 1);
    const file = await canvasToPngFile(rawCanvas, `${matrix.name}.png`);
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUseSprite = async () => {
    if (!matrix || !onUseSprite) return;
    const rawCanvas = renderMatrixToCanvas(matrix, 1);
    const file = await canvasToPngFile(rawCanvas, `${matrix.name}.png`);
    onUseSprite(file);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-100">
        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="h-5 w-5 text-amber-400" />
          AI Text-to-Sprite Generator (9Router)
        </DialogTitle>
        <DialogDescription className="text-slate-400 text-xs">
          Menghasilkan spritesheet pixel-art transparan 100% dari teks JSON Matrix tanpa Image AI.
        </DialogDescription>

        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Deskripsi Monster / Item
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              placeholder="Contoh: Monster slime api kecil warna oranye..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Ukuran Frame</label>
              <select
                value={frameSize}
                onChange={(e) => setFrameSize(Number(e.target.value) as SupportedSpriteFrameSize)}
                className="rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-sm"
              >
                <option value={16}>16 x 16 px</option>
                <option value={24}>24 x 24 px</option>
                <option value={32}>32 x 32 px</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Jumlah Frame</label>
              <select
                value={frameCount}
                onChange={(e) => setFrameCount(Number(e.target.value) as 3 | 4)}
                className="rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-sm"
              >
                <option value={3}>3 Frames</option>
                <option value={4}>4 Frames</option>
              </select>
            </div>

            <div className="ml-auto self-end">
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : matrix ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Sprite
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-950/60 border border-red-700/60 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          {matrix && (
            <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Nama: <span className="text-slate-200 font-mono">{matrix.name}</span> •{' '}
                  {matrix.frameWidth}x{matrix.frameHeight}px ({matrix.frames.length} frames)
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="h-7 text-xs border-slate-700"
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="p-3 rounded bg-slate-800/80 border border-slate-700 flex items-center justify-center min-w-[110px] min-h-[110px]">
                    <canvas ref={previewCanvasRef} className="pixelated" />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Frame {currentFrame + 1}/{matrix.frames.length}
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-1 overflow-x-auto">
                  <span className="text-[11px] text-slate-400">Spritesheet Strip:</span>
                  <div className="p-3 rounded bg-slate-800/80 border border-slate-700 inline-block">
                    <canvas ref={sheetCanvasRef} className="pixelated" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={handleDownloadPng} className="border-slate-700">
                  <Download className="h-4 w-4 mr-1.5" />
                  Download PNG
                </Button>
                {onUseSprite && (
                  <Button size="sm" onClick={handleUseSprite} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Check className="h-4 w-4 mr-1.5" />
                    Gunakan Sprite Ini
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

