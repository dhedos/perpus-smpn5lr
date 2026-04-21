# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud yang dioptimalkan untuk efisiensi kuota.

## Repositori GitHub
**URL**: [https://github.com/dhedos/perpus-smpn5lr.git](https://github.com/dhedos/perpus-smpn5lr.git)

## Cara Mengunggah ke GitHub
Jika Anda belum mengunggah kode ini, jalankan perintah berikut di terminal (pastikan Git sudah terinstall):

1. `git init`
2. `git add .`
3. `git commit -m "Initial commit - Sistem Perpustakaan Modern v1.0"`
4. `git branch -M main`
5. `git remote add origin https://github.com/dhedos/perpus-smpn5lr.git`
6. `git push -u origin main`

## Panduan Deployment ke Vercel
Untuk menjalankan aplikasi ini secara online secara GRATIS:

1. Masuk ke [Vercel](https://vercel.com).
2. Klik **Add New Project** -> **Import from GitHub**.
3. Pilih repositori `perpus-smpn5lr`.
4. **PENTING**: Di bagian **Environment Variables**, tambahkan:
   - `GOOGLE_GENAI_API_KEY`: Masukkan API Key Google AI (Gemini) Anda.
5. Klik **Deploy**.
6. Vercel akan memberikan link domain (contoh: `perpus-smpn5lr.vercel.app`).

## Fitur Unggulan
- **Localhost Queue**: Input buku tetap aman di memori komputer meskipun internet mati, baru dikirim saat online.
- **QR Code per Buku**: Cetak label QR otomatis untuk sirkulasi buku.
- **Smart Scan Mobile**: Pinjam dan kembali buku menggunakan kamera HP (Mendukung QR & Barcode EAN-13).
- **AI Deskripsi**: Ringkasan buku otomatis menggunakan Google Gemini AI.
- **Offline Caching**: Data tetap bisa diakses meskipun internet sekolah mati (Gratis Reads).

## Portabilitas & Migrasi Data
Aplikasi ini dirancang dengan prinsip **Portabilitas**:
1. **Schema Definition**: Seluruh struktur database didefinisikan secara standar di file `docs/backend.json`.
2. **Export Snapshots**: Data dapat diekspor ke Excel kapan saja untuk backup di Google Sheets.

---
&copy; 2024 SMPN 5 LANGKE REMBONG. Dirancang untuk efisiensi dan kemandirian data sekolah.