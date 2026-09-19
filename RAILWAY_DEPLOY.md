# Deploy ke Railway

## 1. Push project ke GitHub

Pastikan `Dockerfile` dan `railway.toml` berada di root repository.

## 2. Buat project Railway

1. Pilih **Deploy from GitHub repo** dan hubungkan repository ini.
2. Tambahkan service **MySQL** pada project yang sama.
3. Pada service aplikasi, buka **Variables** dan tambahkan variabel dari `.env.railway.example`.
4. Untuk variabel database, gunakan **Add Reference** dan pilih nilai dari service MySQL. Nama service pada contoh adalah `MySQL`; sesuaikan jika namanya berbeda.

Database kosong akan dibuatkan tabel secara otomatis saat aplikasi pertama kali berjalan.

## 3. Simpan file upload secara permanen

1. Buka service aplikasi lalu tambahkan **Volume**. Ini wajib untuk fitur unduh surat/lampiran pengajuan.
2. Atur mount path volume menjadi `/data`.
3. Pastikan variable `STORAGE_PATH=/data` sudah tersedia.

Tanpa Volume, gambar berita, template surat layanan, dan dokumen pengajuan dapat hilang saat Railway melakukan redeploy. Template disimpan di `/data/private/templates` jika `STORAGE_PATH=/data`.

> Penting: berkas yang sudah terlanjur hilang sebelum Volume dipasang tidak bisa dipulihkan dari database karena database hanya menyimpan nama berkas, bukan isi DOCX. Pengajuan baru setelah Volume aktif akan aman.

## 4. Generate domain

Di **Settings > Networking**, pilih **Generate Domain**. Frontend dan API menggunakan domain yang sama sehingga `VITE_API_URL` tidak perlu diatur di Railway.

## 5. Variabel keamanan wajib

- `JWT_SECRET`: string acak minimal 32 karakter.
- `ADMIN_PASSWORD`: password admin yang kuat dan tidak sama dengan password development.
- `NODE_ENV=production`: mengaktifkan cookie login yang aman melalui HTTPS.

Setelah deploy selesai, buka `/api/health`. Respons sukses menandakan backend dan routing Railway telah aktif.
