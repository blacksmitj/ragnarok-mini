# IMPLEMENTATION PLAN: Admin Panel & Game Content Management System

Mini Ragnarok 2D Action RPG — Arsitektur Admin Dashboard, Content Management System, Asset Storage (S3 / RustFS), Map Editor, dan Integrasi Game Client.

---

## 🏛️ 1. Arsitektur & Tech Stack Admin

| Komponen | Pilihan Teknologi | Detail / Deskripsi |
|---|---|---|
| **Routing** | TanStack Router (`@tanstack/react-router`) | File-based / Folder-based routing (`src/routes/`), code-splitting, fully type-safe |
| **Data Fetching** | TanStack Query (`@tanstack/react-query`) | Cache management, optimistic update, server sync untuk data game |
| **Table & Data Grid** | TanStack Table (`@tanstack/react-table`) | Sorting, pagination, global filter, facet filtering untuk list monster, equipment, asset |
| **UI Components** | shadcn/ui + Tailwind CSS v4 | Block Sidebar-07 (collapsible navigation, header breadcrumb, responsive layout), dialog, tabs, form, dropdown |
| **Storage Engine** | S3-Compatible RustFS (`@aws-sdk/client-s3`) | Storage bucket untuk spritesheet, layered equipment, audio, effect, dan map payload |
| **Database & ORM** | PostgreSQL / SQLite + Drizzle ORM | Tabel metadata character sprites, equipment layers, monsters, skills, dan maps |
| **2D Map Editor** | Phaser 3 / HTML5 Canvas Grid Engine | Visual tile/grid-based editor (Floor, Terrain, Bush, Tree, Monster Spawner) dengan state Draft & Publish |
| **Auth Guard** | Dummy Admin Auth Context | Bearer token / header admin dummy yang dapat diaktifkan/dinonaktifkan secara seamless |

---

## 📂 Struktur Direktori Admin & Client

```text
ragnarok/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── s3.ts                 # Koneksi S3 Client (RustFS / MinIO / AWS)
│   │   ├── scripts/
│   │   │   └── init-bucket.ts        # Script auto-create bucket RustFS & CORS
│   │   ├── db/
│   │   │   └── schema.ts             # Skema Drizzle: characters, items, monsters, maps
│   │   ├── routes/
│   │   │   ├── admin-characters.ts   # Upload sprite M/F & layer definitions
│   │   │   ├── admin-items.ts        # Upload weapon/armor/effect sprites & elements
│   │   │   ├── admin-monsters.ts     # CRUD monsters, stats, skills, boss config
│   │   │   └── admin-maps.ts         # Save draft & publish map JSON
│   │   └── services/
│   │       └── storage.service.ts    # Service upload & presigned URL RustFS
│   └── .env                          # S3 / RustFS credential, DB URL, PORT
├── src/
│   ├── routes/                       # TanStack Router File Routes
│   │   ├── __root.tsx                # Root layout (QueryClientProvider, Toaster)
│   │   ├── index.tsx                 # Route Game Client utama (Phaser)
│   │   ├── admin/
│   │   │   ├── route.tsx             # Admin Layout (shadcn Sidebar-07, Breadcrumb)
│   │   │   ├── index.tsx             # Admin Dashboard Overview / Analytics
│   │   │   ├── characters.tsx        # Fitur 1: Upload Sprite Default M/F & Layers
│   │   │   ├── items.tsx             # Fitur 2: Upload Armor, Weapon, Element, Effects
│   │   │   ├── maps/
│   │   │   │   ├── index.tsx         # List Maps (TanStack Table)
│   │   │   │   └── editor.tsx        # Fitur 3: Map Builder Canvas (Draft/Publish)
│   │   │   └── monsters.tsx          # Fitur 4: List Monsters, Stats, Skills, Elements, Boss
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (button, dialog, input, etc.)
│   │   ├── admin/
│   │   │   ├── app-sidebar.tsx       # shadcn Sidebar-07 Block
│   │   │   ├── data-table/           # TanStack Table reusable components
│   │   │   ├── sprite-uploader.tsx   # File drag & drop + preview spritesheet grid
│   │   │   └── map-builder/          # Canvas Grid, Layer Switcher, Tile Palette
│   └── lib/
│       ├── api.ts                    # Axios / Fetch client dengan TanStack Query hooks
│       └── utils.ts                  # cn helper shadcn
```

---

## 🚀 Rencana Fase Eksekusi (1 Sesi per Fase)

### 📌 FASE 1: Foundation & Setup Admin Infrastructure
- **Tujuan**: Memasang dependensi inti yang telah divalidasi via MCP Context7, inisialisasi shadcn/ui, setup TanStack Router & TanStack Query, serta implementasi blok layout **Sidebar-07**.
- **Backend & Storage**:
  - Konfigurasi environment `.env` untuk RustFS S3 (Endpoint, Access Key, Secret Key, Bucket Name).
  - Buat script `server/src/scripts/init-bucket.ts` untuk memeriksa dan membuat bucket secara otomatis jika belum ada.
  - Setup S3 Client helper di backend (`server/src/config/s3.ts`).
- **Frontend**:
  - Konfigurasi TanStack Router & file routing di `src/routes/`.
  - Pasang provider `QueryClientProvider` di root router.
  - Implementasikan layout admin dengan komponen **shadcn Sidebar-07** (collapsible nav, breadcrumbs, dummy admin user profile).
- **Keluaran**: Rute `/admin` dapat diakses dengan Sidebar-07 responsif, integrasi TanStack Router berjalan mulus, dan script inisialisasi bucket RustFS terverifikasi.

---

### 📌 FASE 2: Backend Storage & Drizzle Schema Content Management
- **Tujuan**: Menyiapkan skema basis data type-safe untuk seluruh entitas game serta API endpoint upload file ke RustFS.
- **Skema Drizzle ORM**:
  1. `character_sprites`: ID, gender ('M' | 'F'), sprite_type ('body' | 'head'), idle_sheet_url, walk_sheet_url, attack_sheet_url, frame_width, frame_height.
  2. `game_items`: ID, name, item_type ('weapon' | 'armor' | 'headgear'), element ('neutral' | 'fire' | 'water' | 'earth' | 'wind'), stats (JSON), sprite_layer_url, effect_url.
  3. `game_monsters`: ID, name, is_boss (boolean), stats (hp, atk, def, aspd, exp_reward), element, skill_ids (JSON), spritesheet_url.
  4. `game_maps`: ID, name, width, height, tile_size, status ('draft' | 'published'), layers_data (JSON: floor, terrain, bush, tree, spawners), thumbnail_url.
- **API Endpoints (Express)**:
  - `POST /api/admin/upload`: Upload file multipart ke RustFS S3 bucket.
  - CRUD REST API untuk karakter, item, monster, dan map.
- **Keluaran**: Seluruh tabel termigrasi, API upload S3 RustFS berfungsi, dan data dapat dibaca/tulis via API.

---

### 📌 FASE 3: Fitur 1 — Unggah Sprite Default Character Utama (M/F) & Layered Preview
- **Tujuan**: Menyediakan dashboard bagi admin untuk mengunggah dan mengonfigurasi spritesheet dasar karakter (Gender Male & Female) dengan sistem Paperdoll / Layered Sprite.
- **UI & Fitur**:
  - Form upload untuk Gender (Pria / Wanita) dengan tab navigasi shadcn.
  - Unggah spritesheet aksi: Idle, Walk, Attack, Die.
  - Form metadata animasi: Frame width, frame height, total frames, frame rate.
  - **Live Canvas Preview**: Menampilkan preview animasi karakter secara langsung di browser untuk memvalidasi pemotongan frame (spritesheet slicer preview).
  - Integrasi TanStack Query mutation untuk menyimpan URL file ke RustFS dan DB.
- **Keluaran**: Admin dapat mengunggah dan memverifikasi sprite karakter M/F dengan animasi yang tepat sebelum disimpan.

---

### 📌 FASE 4: Fitur 2 — Unggah Armor/Senjata, Element, & Effect Karakter
- **Tujuan**: Mengelola aset perlengkapan karakter yang mendukung layered composite (senjata & armor menimpa body sesuai frame).
- **UI & Fitur**:
  - Katalog Item & Equipment menggunakan **TanStack Table** (sorting berdasarkan tipe, element, stat).
  - Dialog / Sheet shadcn untuk upload item baru:
    - Nama, tipe (Weapon, Armor, Headgear, Accessory).
    - Status & stats (ATK, DEF, Slot, Requirement Level).
    - Elemen (Neutral, Water, Earth, Fire, Wind, Holy, Shadow).
    - Upload sprite overlay (weapon/armor layered spritesheet).
    - Upload visual effect (hit effect, aura effect spritesheet / particle JSON).
  - **Composite Paperdoll Inspector**: Preview interaktif menggabungkan Sprite Karakter (M/F) dari Fase 3 + Layer Armor + Layer Senjata yang baru diunggah.
- **Keluaran**: Seluruh equipment dan efek visual tersimpan di S3 RustFS dan dapat diuji visual layer-nya di admin.

---

### 📌 FASE 5: Fitur 4 — Manajemen Monster, Stats, Skills, Elements, & Boss
- **Tujuan**: CRUD lengkap untuk data monster dan boss dengan tabel canggih, form validasi, dan preview skill/effect.
- **UI & Fitur**:
  - Halaman data grid monster menggunakan **TanStack Table** dengan fitur:
    - Search nama monster, filter tipe (Normal / Mini-Boss / MVP Boss), badge element.
    - Pagination, column visibility toggle, bulk actions.
  - Modal Form pembuatan / edit monster (shadcn Form + Zod):
    - Upload spritesheet monster (Walk, Attack, Hurt, Die) ke RustFS.
    - Pengaturan stats: Base Level, Max HP, ATK Min-Max, DEF, Attack Range, ASPD, Movement Speed, EXP Yield, Drop Table.
    - Penentuan Element & Ukuran (Small, Medium, Large).
    - Konfigurasi Skills & Skill Effects (misal Fireball, Sonic Blow, Heal).
    - Checkbox Flag `is_boss` (akan menampilkan indikator MVP dan scaling aura).
- **Keluaran**: Data monster dan boss terstruktur rapi di database, asset tersimpan di S3 RustFS, siap dikonsumsi game server.

---

### 📌 FASE 6: Fitur 3 — 2D Map Builder Canvas (Floor, Terrain, Bush, Tree, Monster Spawner)
- **Tujuan**: Interactive in-browser Map Builder untuk merancang map game secara visual dengan fungsionalitas Draft & Publish.
- **Komponen Map Builder**:
  1. **Canvas Viewport**: Grid 2D (ukuran dinamis misal 50x50 tile, tile size 32px) dengan zoom & pan controls.
  2. **Layer System**:
     - *Layer 1 (Floor)*: Ground texture, grass, stone path.
     - *Layer 2 (Terrain & Collision)*: Dinding, tebing, air (impassable tiles).
     - *Layer 3 (Objects/Doodads)*: Pohon (Tree), semak (Bush), dekorasi.
     - *Layer 4 (Entities)*: Player spawn point, Monster spawn zones (pilih dari list monster Fase 5).
  3. **Tile & Entity Palette**: Memilih tile dari asset tileset atau memilih monster spawner untuk di-paint/ditempatkan ke kanvas.
  4. **Draft & Publish Actions**:
     - **Save Draft**: Menyimpan struktur map JSON ke database dengan status `draft` tanpa memengaruhi game runtime.
     - **Publish**: Mengompilasi map ke payload final, menyimpan thumbnail otomatis ke S3 RustFS, dan mengaktifkan status `published` untuk dimuat oleh Phaser Game Client.
- **Keluaran**: Admin dapat menggambar map, menaruh pohon/semak/monster, menyimpan draft, dan mem-publish map siap main.

---

### 📌 FASE 7: Game Client Sync & End-to-End Verification
- **Tujuan**: Menghubungkan Game Client Phaser 3 dengan asset dan map yang telah dipublikasikan melalui Admin Panel.
- **Implementasi**:
  - Dynamic Asset Loader: Phaser membaca metadata karakter, armor, dan monster dari API server.
  - Composite Sprite Renderer: Karakter player di-render dengan layer body + equipment sesuai data admin.
  - Dynamic Map Loader: Phaser merender map yang berstatus `published` dari database/S3.
  - Uji alur lengkap (E2E): Upload Sprite M/F -> Upload Weapon/Armor -> Buat Monster -> Desain Map -> Publish -> Mainkan di Game Client.
- **Keluaran**: Sistem Admin terintegrasi penuh dengan game runtime Mini Ragnarok.

---

## 🔒 Konfigurasi Environment S3 RustFS (.env)

```env
# S3 / RustFS Storage Configuration
S3_ENDPOINT=http://127.0.0.1:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=admin
S3_SECRET_KEY=password123
S3_BUCKET_NAME=ragnarok-assets
S3_PUBLIC_URL=http://127.0.0.1:9000/ragnarok-assets
S3_FORCE_PATH_STYLE=true

# Admin Auth Dummy
ADMIN_DUMMY_TOKEN=admin-secret-dev-token
```
