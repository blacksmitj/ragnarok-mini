/**
 * Tipe data untuk generator spritesheet berbasis teks (Pixel Matrix) via 9Router.
 * Setiap frame direpresentasikan sebagai array baris string karakter yang dipetakan
 * ke palet warna HEX atau 'transparent'.
 */

export type SupportedSpriteFrameSize = 16 | 24 | 32;

export interface TextSpriteMatrix {
  /** Nama singkat aset (contoh: "poring_blue") */
  name: string;
  /** Lebar satu frame dalam piksel */
  frameWidth: SupportedSpriteFrameSize;
  /** Tinggi satu frame dalam piksel */
  frameHeight: SupportedSpriteFrameSize;
  /** Peta karakter ke warna HEX (contoh: { ".": "transparent", "k": "#000000" }) */
  palette: Record<string, string>;
  /** Daftar frame animasi; tiap frame berisi array baris string sepanjang frameWidth */
  frames: string[][];
}

export interface SpriteAiGenerateRequest {
  /** Deskripsi visual monster, item, atau efek yang ingin dibuat */
  prompt: string;
  /** Ukuran frame persegi (default: 16) */
  frameSize?: SupportedSpriteFrameSize;
  /** Jumlah frame animasi yang dihasilkan (default: 4) */
  frameCount?: 3 | 4;
}

export interface SpriteAiGenerateResponse {
  success: boolean;
  data?: TextSpriteMatrix;
  error?: string;
}

