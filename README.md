# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud yang dioptimalkan untuk efisiensi kuota.

## Repositori GitHub
**URL**: [https://github.com/dhedos/perpus-smpn5lr.git](https://github.com/dhedos/perpus-smpn5lr.git)

## Cara Mengunggah ke GitHub (Langkah Manual)
Jika Anda belum mengunggah kode ini, jalankan perintah berikut di terminal komputer Anda:

1. `git init` (Inisialisasi git)
2. `git remote add origin https://github.com/dhedos/perpus-smpn5lr.git` (Hubungkan ke repo Anda)
3. `git add .` (Menambahkan semua file)
4. `git commit -m "Siap untuk Deployment Vercel - Sistem Perpustakaan Modern"`
5. `git branch -M main` (Pastikan nama branch utama adalah main)
6. `git push -u origin main` (Kirim kode ke GitHub)

## Panduan Deployment ke Vercel
Setelah kode ada di GitHub:

1. Masuk ke [Vercel](https://vercel.com).
2. Klik **Add New Project** -> **Import from GitHub**.
3. Pilih repositori `perpus-smpn5lr`.
4. **PENTING**: Di bagian **Environment Variables**, tambahkan:
   - `GOOGLE_GENAI_API_KEY`: Masukkan API Key Google AI (Gemini) Anda.
5. Klik **Deploy**.
6. Vercel akan memberikan link domain (contoh: `perpus-smpn5lr.vercel.app`).

## Fitur Utama & Efisiensi
- **Offline Persistence**: Aplikasi menggunakan memori lokal peramban (Caching). Reload halaman dihitung **0 Read (Gratis)**.
- **Antrean Lokal**: Input buku tetap aman di memori komputer meskipun internet mati, baru dikirim saat online.
- **QR Code per Buku**: Cetak label QR otomatis dengan informasi Kode Buku dan Lokasi Rak.
- **Stock Opname**: Fitur audit fisik dengan fitur "Lengkapi" jika buku yang hilang telah ditemukan.

---
&copy; 2024 SMPN 5 LANGKE REMBONG. Dirancang untuk efisiensi dan kemandirian data sekolah.