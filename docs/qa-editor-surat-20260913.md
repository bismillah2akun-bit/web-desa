# Hasil pengujian editor surat — 13 September 2026

## Ringkasan

**20/20 skenario integrasi alur lulus.** Kelima surat asli juga lulus pengujian browser buka–edit–simpan DOCX dan pemeriksaan penguncian/preservasi kop. Tidak ada perubahan kode aplikasi pada sesi QA ini; penambahan hanya skrip pengujian dan laporan.

## Lingkungan dan isolasi

- Browser: Chromium headless, desktop 1366/1440 px dan ponsel 390 px.
- Frontend: React/Vite lokal dengan editor native, toolbar dan penggaris disembunyikan.
- Backend: Express dan MySQL 8.4 di container QA terpisah, database `desa_catalog_test`, penyimpanan sementara di `/tmp/desa-letter-qa.*`.
- Uji alur penuh menggunakan formulir aplikasi sebenarnya. Semua permintaan API dari browser uji tersebut diarahkan ke backend QA sebelum halaman dibuka, bukan backend/database desa.
- Pemohon, KTP, dan surat pengajuan sintetis; tidak mengirim WhatsApp atau mengubah data warga. Template sumber tidak ditimpa. Container/database dan berkas dokumen uji dibersihkan setelah selesai.

## Skenario integrasi: 20 lulus

1. Admin mengunggah template, membuat layanan, membuka DOCX native; berkas sumber tetap sama.
2. Isian wajib surat kosong ditolak; berkas sementara dibersihkan.
3. Draf belum dikonfirmasi ditolak.
4. Versi template kedaluwarsa ditolak (409).
5. Berkas DOCX hasil edit yang tidak disertakan ditolak.
6. KTP wajib yang belum disertakan ditolak; surat yang sempat dibuat ikut dibersihkan.
7. Lampiran duplikat ditolak.
8. DOCX rusak ditolak.
9. Perubahan kop ditolak server.
10. Perubahan isi tetap pada template berpenanda ditolak.
11. Isian berpenanda lebih dari 180 karakter ditolak.
12. Dokumen bermacro ditolak.
13. Dua surat dan satu KTP berhasil tersimpan di MySQL; admin dapat mengunduh ketiganya, akses tanpa login ditolak (401), dan isi dokumen diperiksa kembali.
14. Pelacakan berhasil dengan kode dan nomor WhatsApp yang cocok; nomor berbeda ditolak.
15. Admin mengedit/render DOCX dan memperbarui layanan yang sudah memiliki pengajuan; lampiran historis tetap tersedia dan draf lama ditolak.
16. Endpoint editor admin memerlukan autentikasi.
17. Browser: mengedit kolom, mode pratinjau tidak menerima ketikan, menyimpan dan membuka kembali draf; toolbar/penggaris tidak muncul, tanpa page error.
18. Ponsel: dokumen dapat digulir/dibuka dan tombol kembali berfungsi.
19. Koneksi gagal menampilkan tombol coba lagi; dokumen dapat dibuka setelah koneksi pulih.
20. Formulir warga sebenarnya: isi surat melalui editor, isi data pemohon, unggah KTP, klik Kirim Pengajuan, lihat pesan sukses, lalu periksa dua lampiran di database/dashboard API admin.

## Pemeriksaan tambahan

- SKCK, SKU, surat kelahiran, pindah, dan kematian: ketikan pada kop dikunci, isi dapat diedit, hasil disimpan sebagai DOCX, versi lama ditolak.
- Tes preservasi kop kelima surat: posisi/gambar, XML kop, serta margin sumber dipertahankan saat isi diubah.
- Regresi katalog: lima sumber privat, kontrol akses, edit/upload/simpan template, pembersihan sementara, pembatasan penanda, dan perubahan layanan bawaan tidak tertimpa saat inisialisasi ulang — lulus.
- Build produksi frontend — lulus. Paket editor masih memicu warning ukuran chunk; dimuat terpisah saat editor dibuka.
- Lint — selesai tanpa error, dengan lima warning yang sudah ada pada `AdminApplications.jsx`, `AdminWorkspace.jsx`, dan `App.jsx`.
- Pemeriksaan sintaks skrip dan `git diff --check` — lulus.

## Batas hasil

Pengujian ini tidak membuktikan bebas error untuk semua dokumen Word, browser, atau kondisi. Safari/Firefox, beban pengguna bersamaan, penerbitan/cetak Word, instalasi database dari nol, dan deployment Railway tidak diuji pada sesi ini. Draf tetap berada di memori tab; pemuatan ulang tab memang dapat menghapus draf sesuai petunjuk aplikasi.

## Skrip

- `backend/scripts/check-native-letter-workflow.cjs`: 20 skenario di atas. Wajib database `desa_catalog_test` yang skemanya sudah disiapkan, `STORAGE_PATH` di `/tmp/desa-letter-qa.*`, serta instalasi Playwright lewat `PLAYWRIGHT_PATH`. `VITE_TEST_URL` default `http://localhost:5173`.
- `backend/scripts/check-native-letter-editor.cjs`: browser/round-trip lima surat; tidak membutuhkan database.
- `backend/scripts/check-letterhead-preservation.cjs`: preservasi kop lima surat; tidak membutuhkan database.
- `backend/scripts/check-service-letter-catalog.cjs`: regresi katalog/template pada database dan penyimpanan uji terpisah.

Satu kegagalan awal disebabkan data estimasi `null` yang dikirim keliru oleh skrip tes, bukan formulir aplikasi. Skrip diperbaiki agar mengirim string kosong seperti aplikasi. Pengujian ponsel juga disesuaikan untuk menunggu pengaturan ulang halaman saat font dimuat. Pengujian final menghasilkan **20/20 lulus**, tanpa mengubah implementasi aplikasi.
