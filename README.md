# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud yang dioptimalkan untuk efisiensi kuota.

## Repositori GitHub
**URL**: [https://github.com/dhedos/perpus-smpn5lr.git](https://github.com/dhedos/perpus-smpn5lr.git)

## Cara Mengunggah ke GitHub
Jika Anda belum mengunggah kode ini, jalankan perintah berikut di terminal:
1. `git init`
2. `git add .`
3. `git commit -m "Initial commit - Sistem Perpustakaan Modern"`
4. `git branch -M main`
5. `git remote add origin https://github.com/dhedos/perpus-smpn5lr.git`
6. `git push -u origin main`

## Fitur Unggulan
- **QR Code per Buku**: Cetak label QR otomatis untuk sirkulasi buku.
- **Smart Scan Mobile**: Pinjam dan kembali buku menggunakan kamera HP (Mendukung QR & Barcode EAN-13).
- **AI Deskripsi**: Ringkasan buku otomatis menggunakan Google Gemini AI.
- **Offline Persistence**: Data tetap bisa diakses meskipun internet sekolah mati (Caching).
- **Optimasi Kuota**: Dirancang untuk tetap GRATIS (Spark Plan) meskipun memiliki 1.000+ jenis buku.

## Portabilitas & Migrasi Data
Aplikasi ini dirancang dengan prinsip **Portabilitas**:
1. **Schema Definition**: Seluruh struktur database didefinisikan secara standar di file `docs/backend.json`.
2. **Export Snapshots**: Data dapat diekspor ke Excel kapan saja untuk backup di Google Sheets.
3. **Migration Ready**: Jika ingin pindah dari Firebase ke database lain (SQL/NoSQL), file `backend.json` berfungsi sebagai dokumentasi teknis utama untuk membangun ulang skema data di penyedia baru.

## Panduan Petugas
- **Login**: Gunakan email resmi yang didaftarkan Admin.
- **Lupa Password**: Gunakan fitur "Lupa Kata Sandi" di halaman login untuk menerima link pemulihan via email.
- **Sinkronisasi**: Pantau status data di menu "Sinkronisasi Data" pada Dashboard.

---
&copy; 2024 SMPN 5 LANGKE REMBONG. Dirancang untuk efisiensi dan kemandirian data sekolah.