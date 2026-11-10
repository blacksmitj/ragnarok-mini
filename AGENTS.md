# AGENTS.md — Mini Ragnarok Project Guidelines

Selamat datang di proyek **Mini Ragnarok** (Browser-Based 2D Action RPG). Dokumen ini berfungsi sebagai panduan instruksi utama (*system rules & context*) untuk setiap AI Agent / Assistant yang bekerja pada repositori ini.

---

## 🎯 1. Filosofi & Tujuan Proyek

Proyek ini adalah **proyek pembelajaran interaktif (Pedagogical Project)** untuk membangun game RPG 2D bergaya klasik Ragnarok Online menggunakan web stack modern.
Tujuan utamanya bukan hanya menghasilkan game yang selesai, melainkan **memahami arsitektur game development secara mendalam langkah demi langkah**.

Setiap agen yang berinteraksi dalam proyek ini **wajib** mematuhi:
- **[PRD (Product Requirements Document)](./prd.md)**
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)**
- Eksekusi terarah per fase sesuai roadmap.

---

## 🛠️ 2. Tech Stack & Dependensi Resmi

| Komponen | Pilihan Teknologi | Catatan Penggunaan |
|---|---|---|
| **Language** | TypeScript (Strict Mode) | Hindari `any`, gunakan interface terstruktur |
| **Framework** | React 19 + Vite | Layout web, HUD RPG, Chat Window, dan lifecycle container |
| **Game Engine** | Phaser 3/4 (`phaser`) | 2D Canvas rendering, Client Interpolation, Animations |
| **Networking** | Socket.IO (`socket.io` & `socket.io-client`) | Protokol komunikasi real-time dua arah (WebSockets) |
| **Server Backend** | Node.js + Express + TypeScript (`server/`) | Authoritative game loop, combat logic, anti-cheat, monster AI |
| **Database Persisten** | PostgreSQL (VPS Docker) + Drizzle ORM | Storage karakter, inventori, transaksi ACID type-safe |
| **Cache & Pub/Sub** | Redis (VPS Docker) + ioredis | Socket.IO adapter, player state tick, anti-cheat cooldown, leaderboard |
| **State Bridge** | Zustand (`zustand`) | External store penghubung Phaser, WebSockets, dan React |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) | Utility classes untuk HUD, chat box, gauges, & UI retro |
| **Doc Lookup** | MCP Context7 | Selalu verifikasi API Phaser/Zustand/Socket.IO/Drizzle via Context7 jika ragu |

---

## 📐 3. Arsitektur & Boundary Rules (WAJIB DIPATUHI)

### A. Pemisahan Domain Game dan Domain UI
1. **Game Logic (`src/game/`)**:
   - Phaser Scene, Entities, Physics, Collision, dan Sprite Animations berada di folder ini.
   - Phaser **tidak boleh** mengimpor atau bergantung langsung pada React components/DOM lifecycle.
2. **UI Layer (`src/components/`)**:
   - Komponen React murni untuk HUD (HP bar, EXP bar, Level, Floating menu).
   - React **tidak boleh** memanipulasi Phaser game object secara langsung.
3. **Bridge Layer (`src/stores/useGameStore.ts`)**:
   - Phaser berinteraksi dengan Zustand melalui **`useGameStore.getState().action()`** di luar React lifecycle.
   - React mengonsumsi state secara reactive menggunakan hooks: **`const hp = useGameStore(s => s.hp)`**.

### B. Lifecycle & Memory Leak Prevention (Phaser in React)
- React 19 mengaktifkan StrictMode (mount -> unmount -> mount cepat pada mode dev).
- Instance Phaser **harus di-mount di dalam `useEffect`** atau ref guard, dan **wajib dibersihkan** pada cleanup function:
  ```typescript
  return () => {
    game.destroy(true); // destroy canvas and release references
  };
  ```
- Selalu pastikan `pixelArt: true` di konfigurasi Phaser agar grafis pixel art tetap tajam dan tidak blur.

---

## 📚 4. Standar Eksekusi: Eksekusi Per Phase

Pengerjaan dilakukan secara bertahap **fase per fase** sesuai roadmap [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

> ⚠️ **Aturan Penting**: 
> - **Satu fase per sesi/prompt**. Jangan pernah menggabungkan atau melompati fase tanpa persetujuan eksplisit dari pengguna.
> - Fokus langsung ke implementasi teknis, verifikasi fungsional, dan pengujian.
> - Tunggu konfirmasi dari pengguna sebelum beranjak ke fase berikutnya.

---

## 📁 5. Standar Struktur Direktori

```text
ragnarok/
├── public/
│   └── assets/
│       ├── characters/     # Spritesheet karakter Novice
│       ├── monsters/       # Spritesheet Poring, dll.
│       ├── maps/           # Tileset & asset arena
│       └── sfx/            # Sound effects retro
├── src/
│   ├── components/         # Komponen React (HUD, GameCanvas, Modals)
│   │   └── hud/            # CharacterStatus, ExpBar, TargetInfo
│   ├── game/               # Domain Phaser Engine
│   │   ├── config/         # phaserConfig.ts
│   │   ├── entities/       # Player.ts, Monster.ts
│   │   ├── scenes/         # MainScene.ts, PreloadScene.ts
│   │   ├── systems/        # CombatSystem.ts, StatsSystem.ts
│   │   └── effects/        # DamageText.ts, LevelUpEffect.ts
│   ├── stores/             # Zustand State Stores (useGameStore.ts)
│   ├── services/           # LocalStorage & Audio persistence
│   ├── App.tsx             # Root Layout
│   ├── main.tsx            # Entry point React
│   └── index.css           # Tailwind v4 import (@import "tailwindcss";)
├── IMPLEMENTATION_PLAN.md  # Roadmap eksekusi 10 fase
├── prd.md                  # Requirement game lengkap
└── AGENTS.md               # Aturan kerja untuk AI Agent
```

---

## 🛡️ 6. Aturan Penulisan Kode (Code Style)

1. **TypeScript**: Gunakan type yang jelas dan semantik (misal `interface MonsterStats`, bukan tipe `any`).
2. **Komentar & Dokumentasi**: Sertakan komentar berbahasa Indonesia yang edukatif pada bagian logika game kompleks (kalkulasi damage, kurva EXP, pergerakan vektor).
3. **Error Handling**: Tangani kemungkinan asset 404 atau LocalStorage korup dengan graceful fallback.
4. **Tautan File**: Selalu gunakan link markdown `[filename](file:///path/to/file)` saat mereferensikan file kode agar mudah diakses.

---

## 🔍 7. Protokol Anti-Halusinasi (Wajib Gunakan Context7)

Untuk mencegah halusinasi kode, sintaks fiktif, atau penggunaan API yang sudah usang (*deprecated*):
1. **Verifikasi via Context7 Sebelum Menulis**:
   - Agen **dilarang menebak-nebak** method, signature fungsi, konfigurasi physics, atau lifecycle hooks.
   - Jika ragu terhadap API Phaser 3, Zustand, atau Tailwind CSS v4, agen **wajib memverifikasi via MCP Context7** (`resolve-library-id` dan `query-docs`).
2. **Referensi Library ID Resmi**:
   - **Phaser 3**: `/phaserjs/phaser` (konfigurasi canvas, Arcade physics, sprite animations, cleanup lifecycle).
   - **Zustand**: `/pmndrs/zustand` (eksternal store access, selectors, middleware persist).
   - **Tailwind CSS**: `/tailwindlabs/tailwindcss.com` (konfigurasi Tailwind v4 & Vite).
3. **Resolusi Masalah Berbasis Fakta**:
   - Jika terjadi bug atau perilaku aneh pada canvas/state, utamakan pencarian dokumentasi dan code snippet resmi melalui Context7 daripada membuat spekulasi atau workaround yang rapuh.


