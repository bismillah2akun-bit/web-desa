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

### Dokumen peta desa

Halaman `/webgis` dan pratinjau pada `/kontak` menggunakan gambar `frontend/src/assets/map.jpeg` yang disediakan pengelola. Gambar peta jalan ditampilkan utuh dengan zoom, geser, reset tampilan, dan tautan gambar penuh. Aset ini ikut dibundel saat build, sehingga tidak bergantung pada server tile eksternal.

Viewer menggunakan koordinat gambar, bukan lintang/bujur. Jangan menggunakan tampilan ini untuk pengukuran atau navigasi. Data GeoJSON lama tetap disimpan di repository, tetapi tidak ditumpuk pada gambar, dan titik lokasi contoh tidak lagi ditampilkan. Jika mengganti gambar dengan dimensi berbeda, sesuaikan batas piksel pada `frontend/src/components/VillageMapDocument.jsx`.

### Template surat layanan

- Project menyertakan layanan permanen **Pembuatan Surat Keterangan** dengan lima pilihan: Surat Keterangan Usaha, Surat Keterangan Pindah, Surat Pengantar SKCK, Surat Kematian, dan Surat Keterangan Kelahiran. Warga dapat mencentang satu atau beberapa surat. Pada template bawaan, hanya kolom nama yang dapat diubah; bagian lain dikunci agar formatnya tetap sama.
- Lima DOCX bawaan disimpan di `backend/assets/letter-templates` dan didaftarkan saat layanan belum tersedia. Admin dapat mengedit layanan/template bawaan; perubahan tidak ditimpa saat restart. Penghapusan layanan bawaan tetap dibatasi.
- **Pilih surat dari assets** membuka katalog privat admin berisi SKCK, SKU, surat kelahiran, pindah, dan kematian. Sumber berasal dari berkas yang disiapkan di `frontend/src/assets/`, dengan salinan untuk backend di `backend/assets/service-letter-sources/` agar tersedia pada Docker/Railway tanpa memublikasikan dokumen mentah.
- Pilih surat → edit salinan → **Gunakan template ini** → **Simpan Layanan**. Tombol **Edit isi template** tersedia pada surat yang sudah dipilih/disimpan. Mengubah template pada satu layanan tidak mengubah berkas sumber maupun layanan lain.
- Kop pada lima surat yang disiapkan dikunci, termasuk logo dan paragraf pembuka. Server menolak perubahan teks kop, sedangkan posisi gambar, margin, dan struktur kop dalam DOCX tetap dipertahankan. Kertas editor memakai lebar tetap dan bisa digeser pada HP agar tata letak tidak berubah. Uji tanpa database: `node backend/scripts/check-letterhead-preservation.cjs`.
- Contoh surat masih memuat data pribadi. Admin wajib membersihkan seluruh data sebelum publikasi. Gunakan penanda seperti `[[Nama]]` atau `[[NIK]]` pada paragraf tersendiri untuk membuat kolom yang dapat diisi warga; bagian lain akan dikunci apabila ada penanda. Nomor surat serta pengesahan tidak diisi otomatis.
- Buka **Admin → Layanan desa → Tambah/Edit layanan → Tambah surat**. Isi nama surat, unggah template kosong **DOCX** (maksimal 10 MB), lalu simpan layanan. Gunakan satu surat per template; satu layanan dapat memiliki beberapa surat. Template DOC/PDF lama perlu diganti DOCX untuk editor web.
- Setiap surat otomatis memiliki tombol **Buka editor surat** pada formulir warga. Atur apakah surat wajib. **Tambah isian** tetap digunakan untuk data biasa atau upload KTP/KK tanpa template (batas ukuran 1–20 MB).
- Warga membuka halaman editor layar penuh, mengedit teks pada paragraf/tabel, memeriksa pratinjau, mencentang konfirmasi, lalu memilih **Gunakan surat ini**. Surat DOCX otomatis dibuat dan menjadi lampiran ketika warga menekan **Kirim Pengajuan**; tidak ada unduh/unggah ulang surat.
- Isian surat disimpan sementara di memori tab sampai pengajuan dikirim. Membuka/menutup editor tidak menghapus data pemohon atau file KTP/KK yang sudah dipilih. Memuat ulang atau menutup tab menghapus draf; draf belum dikirim ke server sebelum pengajuan diajukan.
- Editor menggunakan **DOCX Editor (EigenPal), `@docx-editor.dev/react/core` 2.17.0**, dengan pembacaan/penyimpanan DOCX, halaman, toolbar, undo/redo, dan zoom. Library dimuat hanya saat editor dibuka. Font pengganti berlisensi terbuka disajikan lokal melalui `@docx-editor.dev/fonts`; tidak mengirim surat ke SaaS atau mengambil font dari Google. Font yang tidak tersedia dan fitur Word kompleks masih dapat berbeda; periksa dokumen sebelum penerbitan. Tidak menggunakan modul Pro berbayar. Lisensi library/font ikut disertakan pada hasil build di `licenses/docx-editor/`.
- Kop dikunci memakai Word content controls dan diverifikasi ulang di server. Untuk template dengan penanda isian, hasil warga dibentuk dari arsip sumber agar bagian tetap tidak berubah. Template tanpa penanda dan edit admin menyimpan isi DOCX hasil editor, dengan kop dan ukuran halaman sumber dipertahankan. Macro, objek tertanam, gambar/template eksternal, berkas berpassword, dan dokumen lebih dari 1.000 paragraf tidak didukung. Maksimal DOCX editor 10 MB.
- Backend memverifikasi versi template dan ID paragraf sebelum membuat lampiran. Jika template berubah, warga harus membuka editor dan memeriksa ulang surat. Hasil buatan server dibatasi 20 MB, dengan maksimal 20 lampiran per pengajuan.
- Untuk template baru buatan admin, gunakan dokumen kosong tanpa data pribadi atau tanda tangan. Sebelum layanan bawaan dipublikasikan, petugas wajib memastikan seluruh isi tetap selain kolom nama memang merupakan isi baku yang diperbolehkan.
- Template hanya dapat diunduh publik jika layanannya aktif. Hasil isian warga tetap privat dan hanya dapat diunduh admin dari detail pengajuan.
- Template disimpan di `STORAGE_PATH/private/templates`; kolom database ditambahkan otomatis saat backend mulai. Di Railway, gunakan Volume dengan `STORAGE_PATH=/data` agar template dan dokumen warga tidak hilang saat redeploy.

Pengujian lokal: `docker exec profil-desa-backend node scripts/check-letter-editor.cjs` untuk editor/generasi surat dan `docker exec profil-desa-backend node scripts/check-service-templates.cjs` untuk kompatibilitas template. Tes menggunakan data sintetis dan membersihkan kembali data serta file buatannya.

Uji editor native tanpa database: jalankan Vite, kemudian `PLAYWRIGHT_PATH=/lokasi/playwright VITE_TEST_URL=http://127.0.0.1:5189 node backend/scripts/check-native-letter-editor.cjs`. Uji membuka dan mengetik pada kelima surat, menolak edit kop, menyimpan DOCX, serta memeriksa versi kedaluwarsa. Berkas sementara dibersihkan; tangkapan layar disimpan di direktori temporer untuk pemeriksaan lokal.

Jika Docker menampilkan `Failed to resolve import @docx-editor.dev/react`, dependensi pada volume `node_modules` container belum diperbarui: jalankan `docker compose exec frontend npm ci`, lalu `docker compose restart frontend`. Muat ulang browser. Jangan menghapus volume database. Build Railway memasang dependensi melalui `npm ci` pada Dockerfile yang sudah ada; tidak membutuhkan Document Server tambahan.

### Endpoint umum

`GET /api/health`, `GET /api/profile`, `GET /api/demographics`, `GET /api/news`, `GET /api/news/:id`, `GET /api/facilities`, `GET /api/potentials`, `GET /api/map/geojson`, `POST /api/contact`, dan `POST /api/guestbook`.

Semua endpoint mengembalikan bentuk respons konsisten dengan properti `success`, `message`, dan `data`.
