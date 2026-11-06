# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# MINI RAGNAROK
### Browser-Based 2D RPG Learning Project

**Version:** 1.1  
**Status:** Initial Development  
**Project Type:** Educational Game Development  
**Platform:** Web Browser  
**Target Browser:** Google Chrome

---

## 1. Project Overview

Mini Ragnarok adalah proyek pembelajaran untuk membangun game 2D RPG berbasis browser yang terinspirasi dari Ragnarok Online klasik.

Game dimainkan langsung melalui browser tanpa instalasi game client.

Proyek memiliki dua tujuan utama:

1. Membuat game RPG sederhana yang dapat dimainkan.
2. Mempelajari proses pengembangan game dengan bantuan AI secara bertahap.

Pengembangan menggunakan pendekatan Learning by Building. AI membantu menulis kode, membuat aset, menjelaskan konsep, dan memperbaiki error. Pengguna tetap terlibat dalam proses pengujian, eksperimen, dan pemahaman kode.

## 2. Project Goals

Membangun game sederhana dengan karakteristik:

- Tampilan 2D pixel art.
- Nuansa RPG klasik seperti Ragnarok.
- Karakter dapat bergerak di dalam map.
- Memiliki monster yang bisa diserang.
- Memiliki sistem HP, damage, EXP, dan leveling.
- Dapat dimainkan melalui browser.
- Struktur kode mudah dipahami dan dikembangkan.

## 3. Technology Stack

### Frontend and Game Engine

| Teknologi | Fungsi |
|---|---|
| React | Membuat UI, menu, inventory, status karakter |
| TypeScript | Bahasa pemrograman utama |
| Phaser 3 | Game engine untuk dunia game 2D |
| Vite | Development server dan build aplikasi |
| CSS | Styling UI |

### Development Tools

| Teknologi | Fungsi |
|---|---|
| VS Code | Editor kode |
| Node.js | Runtime JavaScript dan tools development |
| npm | Mengelola dan menginstal dependencies |
| Google Chrome | Menjalankan dan menguji game |

### Additional Tools (Future)

| Teknologi | Fungsi |
|---|---|
| Tiled | Membuat map 2D |
| Colyseus | Multiplayer game server |
| Node.js Backend | Logika server dan game services |
| PostgreSQL | Penyimpanan data pemain |
| Redis | Cache dan data sementara |

Teknologi tambahan tidak digunakan pada fase awal. Penggunaannya baru dipertimbangkan ketika kebutuhan game sudah berkembang.

## 4. Technology Architecture

React dan Phaser memiliki tanggung jawab berbeda.

### React Responsibilities

React mengelola antarmuka aplikasi:

- Main menu.
- Character information.
- HP dan EXP display.
- Inventory.
- Equipment.
- Game settings.
- Dialog dan popup.

### Phaser Responsibilities

Phaser mengelola dunia permainan:

- Rendering map.
- Character sprite.
- Character movement.
- Monster sprite.
- Animation.
- Collision.
- Combat interaction.
- Game camera.
- Game physics.

### Integration

React dan Phaser berjalan dalam satu aplikasi browser.

React menjadi pengelola UI, sedangkan Phaser menjadi pengelola dunia game.

Komunikasi antara keduanya dilakukan melalui mekanisme event atau state bridge yang terstruktur.

React tidak boleh melakukan rendering atau pembaruan posisi karakter setiap frame. Proses tersebut menjadi tanggung jawab Phaser.

## 5. Game Concept

Game menggunakan konsep 2D RPG sederhana dengan nuansa Ragnarok Online klasik.

### Initial Game World

- Satu map kecil.
- Satu karakter pemain.
- Satu jenis monster: Poring.
- Area berjalan.
- Area pertarungan.

### Player Character

Karakter memiliki:

- Character name.
- Level.
- HP.
- EXP.
- Position X dan Y.
- Movement speed.
- Basic attack.
- Attack damage.

### Monster

Monster Poring memiliki:

- Name.
- HP.
- Position.
- Movement animation.
- Receive damage.
- Death animation.
- Respawn timer.
- EXP reward.

## 6. Functional Requirements

### FR-01: Game Initialization

- Game dapat dibuka melalui browser.
- Menampilkan halaman game.
- Phaser berhasil terintegrasi dengan React.
- Game dapat dimulai melalui tombol Play.

### FR-02: Character Display

- Menampilkan karakter pemain.
- Menggunakan sprite 2D.
- Memiliki animasi idle.
- Memiliki animasi berjalan.

### FR-03: Character Movement

- Karakter dapat bergerak menggunakan keyboard.
- Mendukung arah atas, bawah, kiri, dan kanan.
- Memiliki pengaturan kecepatan.
- Memiliki animasi berdasarkan arah gerakan.

### FR-04: Game Map

- Menampilkan map 2D.
- Memiliki background dan dekorasi.
- Memiliki area yang bisa dilalui.
- Memiliki collision pada objek penghalang.

### FR-05: Monster System

- Menampilkan monster Poring.
- Monster memiliki HP.
- Monster dapat menerima serangan.
- Monster mati ketika HP mencapai nol.
- Monster muncul kembali setelah waktu tertentu.

### FR-06: Combat System

- Pemain dapat menyerang monster.
- Serangan mengurangi HP monster.
- Damage ditampilkan di layar.
- Monster memiliki animasi terkena serangan.
- Monster tidak dapat diserang setelah mati.

### FR-07: EXP and Leveling

- Pemain memperoleh EXP ketika monster mati.
- EXP memiliki batas untuk naik level.
- Level bertambah ketika EXP mencukupi.
- HP pemain dapat diperbarui ketika naik level.

### FR-08: Game UI

React menampilkan:

- Character name.
- Level.
- HP bar.
- EXP bar.
- Monster information.
- Inventory panel sederhana.
- Game menu.

## 7. Development Roadmap

Pengembangan dibagi menjadi beberapa fase pembelajaran.

### Phase 1 — Environment Setup

Materi:
- Memahami Node.js.
- Memahami npm.
- Memahami Vite.
- Memahami React.
- Memahami struktur project.

Hasil:
- Project React berhasil dibuat.
- Aplikasi berhasil berjalan di browser.

### Phase 2 — Phaser Integration

Materi:
- Apa itu game engine.
- Cara kerja Phaser.
- Integrasi Phaser dengan React.
- Memahami Game Scene dan Game Loop.

Hasil:
- Phaser berhasil ditampilkan di halaman React.
- Background game muncul.

### Phase 3 — Character and Sprite

Materi:
- Apa itu sprite.
- Sprite sheet.
- Asset management.
- Animasi karakter.

Hasil:
- Karakter muncul di game.
- Karakter memiliki animasi idle.

### Phase 4 — Character Movement

Materi:
- Koordinat X dan Y.
- Keyboard input.
- Movement speed.
- Animation state.

Hasil:
- Karakter dapat berjalan ke empat arah.

### Phase 5 — Map and Collision

Materi:
- Tile-based map.
- Collision detection.
- Game camera.
- Map boundaries.

Hasil:
- Map sederhana dapat dijelajahi.
- Karakter tidak bisa menembus penghalang.

### Phase 6 — Monster System

Materi:
- Game entities.
- Object positioning.
- Monster HP.
- Respawn logic.

Hasil:
- Monster Poring muncul di map.
- Monster memiliki HP dan dapat respawn.

### Phase 7 — Combat System

Materi:
- Attack input.
- Damage calculation.
- Attack range.
- Monster death.

Hasil:
- Karakter dapat menyerang monster.
- Monster dapat mati.

### Phase 8 — EXP and Leveling

Materi:
- Game variables.
- EXP calculation.
- Level progression.
- Character statistics.

Hasil:
- Pemain mendapatkan EXP.
- Pemain dapat naik level.

### Phase 9 — React Game UI

Materi:
- React components.
- Props dan state.
- Event communication.
- Phaser and React integration.

Hasil:
- HP bar dan EXP bar.
- Character status.
- Inventory sederhana.
- Game menu.

### Phase 10 — Local Persistence

Materi:
- LocalStorage.
- JSON data.
- Save dan load game.

Hasil:
- Progress karakter dapat disimpan.
- Progress dapat dimuat kembali ketika game dibuka.

## 8. AI and Human Responsibilities

### AI Responsibilities

AI berperan sebagai coding assistant dan technical mentor.

AI dapat:
- Membuat struktur project.
- Menulis kode React dan Phaser.
- Membuat komponen UI.
- Membuat sistem game.
- Membantu membuat aset pixel art.
- Menjelaskan fungsi setiap kode.
- Menganalisis dan memperbaiki error.
- Melakukan code review.
- Memberikan rekomendasi arsitektur.

### Human Responsibilities

Pengguna berperan sebagai project owner dan learner.

Pengguna bertanggung jawab:
- Menjalankan project.
- Menguji setiap fitur.
- Memahami konsep yang dijelaskan AI.
- Mengubah konfigurasi sederhana.
- Memilih desain karakter dan map.
- Menentukan aturan permainan.
- Memeriksa hasil pekerjaan AI.
- Menyetujui penyelesaian setiap fase.

## 9. Learning Methodology

Setiap fase wajib mengikuti metode berikut:

**1. Explain**

AI menjelaskan konsep dengan bahasa awam sebelum implementasi.

**2. Build**

AI membuat kode yang dibutuhkan untuk menyelesaikan satu materi.

**3. Explain the Code**

AI menjelaskan fungsi setiap bagian kode penting.

**4. Run**

Pengguna menjalankan project di browser.

**5. Test**

Pengguna mencoba hasil implementasi.

**6. Experiment**

AI memberikan latihan kecil agar pengguna mencoba mengubah kode sendiri.

**7. Review**

AI membantu mengevaluasi hasil dan memperbaiki masalah.

**8. Checkpoint**

Fase dinyatakan selesai setelah fitur berhasil diuji dan pengguna memahami konsep dasarnya.

AI tidak boleh melanjutkan ke fase berikutnya tanpa persetujuan pengguna.

## 10. Initial Project Structure

Struktur awal yang direncanakan:

```text
mini-ragnarok/
├── public/
│   └── assets/
│       ├── characters/
│       ├── monsters/
│       ├── maps/
│       └── effects/
│
├── src/
│   ├── components/
│   │   ├── GameLayout.tsx
│   │   ├── CharacterStatus.tsx
│   │   └── GameMenu.tsx
│   │
│   ├── game/
│   │   ├── config/
│   │   ├── scenes/
│   │   ├── entities/
│   │   └── systems/
│   │
│   ├── hooks/
│   ├── services/
│   ├── types/
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── index.html
├── package.json
└── vite.config.ts
```

Struktur dapat disesuaikan seiring perkembangan proyek. Jangan membuat seluruh folder dan sistem sebelum dibutuhkan.

## 11. Non-Functional Requirements

- Dapat dimainkan melalui Google Chrome desktop.
- Tidak membutuhkan instalasi game client.
- Dapat berjalan secara lokal.
- Menggunakan TypeScript.
- Kode modular dan mudah dipahami.
- React dan Phaser memiliki tanggung jawab terpisah.
- Menghindari kompleksitas yang belum diperlukan.
- Menggunakan aset original atau aset dengan lisensi yang sesuai.
- Tidak menggunakan aset proprietary Ragnarok Online tanpa izin.

## 12. Out of Scope

Tidak termasuk dalam versi pembelajaran pertama:

- Multiplayer.
- Login dan registrasi.
- Backend server.
- Database server.
- Guild.
- Party.
- Trading.
- PvP.
- Job advancement.
- Quest kompleks.
- Payment system.
- Marketplace.

Fitur tersebut menjadi potensi pengembangan lanjutan.

## 13. Definition of Done

Versi pertama dianggap berhasil apabila:

1. Project React dan Phaser berjalan.
2. Game dapat dibuka melalui Chrome.
3. Karakter muncul di map.
4. Karakter dapat berjalan.
5. Map memiliki collision.
6. Monster Poring dapat muncul.
7. Karakter dapat menyerang monster.
8. Monster dapat mati dan respawn.
9. Pemain mendapatkan EXP.
10. Pemain dapat naik level.
11. UI dapat menampilkan informasi karakter.
12. Progress dapat disimpan secara lokal.
13. Pengguna memahami konsep utama yang digunakan.

## 14. AI Development Rules

Aturan wajib untuk AI coding assistant:

1. Selalu membaca PRD sebelum melakukan perubahan besar.
2. Mengembangkan satu fase dalam satu waktu.
3. Tidak mengimplementasikan fitur di luar fase aktif tanpa persetujuan.
4. Tidak membuat kode yang terlalu kompleks untuk kebutuhan saat ini.
5. Menjelaskan kode dengan bahasa sederhana.
6. Mengutamakan solusi yang mudah dipelajari dan dipelihara.
7. Tidak menghapus atau mengubah fitur yang sudah selesai tanpa alasan dan persetujuan.
8. Menjalankan pemeriksaan dan pengujian setelah perubahan.
9. Memberikan ringkasan file yang dibuat atau diubah.
10. Menyediakan latihan kecil untuk pengguna pada setiap fase.

## 15. Future Development Direction

Setelah versi single-player selesai, proyek dapat dikembangkan menjadi browser-based MMORPG.

Potensi pengembangan:

- Multiplayer menggunakan Colyseus.
- Game server menggunakan Node.js.
- Penyimpanan akun dan karakter menggunakan PostgreSQL.
- Redis untuk kebutuhan cache dan komunikasi.
- Inventory dan equipment yang lebih lengkap.
- NPC dan quest.
- Multiple maps.
- Job dan skill system.
- Party dan guild.

Pengembangan lanjutan harus mempertimbangkan kebutuhan arsitektur dan tidak wajib diimplementasikan sekaligus.

---

## 16. Core Development Principle

**Build small. Understand deeply. Improve gradually.**

Tujuan utama bukan menghasilkan game secepat mungkin, tetapi memahami bagaimana game dibuat.

AI adalah alat bantu untuk mempercepat pekerjaan dan menjelaskan konsep. Pengguna tetap menjadi pengambil keputusan dan harus memahami sistem yang dibangun.

Setiap fase harus menghasilkan fitur yang bisa dijalankan, diuji, dan dipelajari sebelum melanjutkan ke fase berikutnya.