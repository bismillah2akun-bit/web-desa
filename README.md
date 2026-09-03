# Website Profil Desa Tanjungjaya

Portal informasi full-stack untuk Desa Tanjungjaya, Kecamatan Cihampelas, Kabupaten Bandung Barat. Aplikasi memuat profil desa, pemerintahan, potensi, berita, kontak, dan WebGIS responsif.

> Data nama perangkat, statistik, berita, koordinat, serta batas wilayah di dalam project adalah contoh. Data WebGIS wajib diganti dengan data resmi Pemerintah Desa atau Badan Informasi Geospasial (BIG) sebelum dipublikasikan.

## Teknologi

- Frontend: React 19, Vite, JavaScript, Tailwind CSS v4, shadcn/ui, Aceternity Resizable Navbar, Lucide React
- Peta: Leaflet, React Leaflet, OpenStreetMap
- Backend: Express (CommonJS), CORS, dotenv, mysql2
- Database: MySQL 8.4 dengan tipe data spasial dan spatial index
- Infrastruktur: Docker dan Docker Compose

## Struktur

```text
profil-desa/
├── frontend/          # SPA React dan WebGIS
├── backend/
│   ├── src/           # config, controllers, routes, models, middleware
│   └── sql/init.sql   # skema MySQL spasial dan seed contoh
├── docker-compose.yml
└── README.md
```

## Menjalankan dengan Docker

Pastikan Docker aktif, lalu dari folder root:

```bash
docker compose up --build
```

URL layanan:

- Frontend: http://localhost:5173
- Backend/API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health
- Login admin: http://localhost:5173/admin/login
- MySQL: localhost:3306

Hentikan container dengan `Ctrl+C`, kemudian jalankan:

```bash
docker compose down
```

Gunakan `docker compose down -v` hanya bila memang ingin menghapus volume dan seluruh data database lokal.

## Menjalankan tanpa Docker

Siapkan MySQL 8 atau MariaDB yang kompatibel dan database `profil_desa`, lalu jalankan `backend/sql/init.sql`.

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend (terminal lain):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Variabel utama frontend adalah `VITE_API_URL=http://localhost:5000/api`. Konfigurasi database tersedia di `backend/.env.example`.

### Akun admin development

Docker Compose membuat akun development dari `ADMIN_USERNAME` dan `ADMIN_PASSWORD`. Nilai fallback lokal adalah `admin` dan `TanjungjayaAdmin123!`. Sebelum deployment, buat file `.env` pada root dan wajib ganti `JWT_SECRET` serta `ADMIN_PASSWORD` dengan nilai kuat. Password disimpan sebagai hash bcrypt dan sesi login menggunakan cookie `httpOnly`.

## Endpoint API

`GET /api/health`, `GET /api/profile`, `GET /api/demographics`, `GET /api/news`, `GET /api/news/:id`, `GET /api/facilities`, `GET /api/potentials`, `GET /api/map/geojson`, `POST /api/contact`, dan `POST /api/guestbook`.

Semua endpoint mengembalikan bentuk respons konsisten dengan properti `success`, `message`, dan `data`.
