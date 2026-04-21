# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud yang dioptimalkan untuk efisiensi kuota.

## Repositori GitHub
**URL**: [https://github.com/dhedos/perpus-smpn5lr.git](https://github.com/dhedos/perpus-smpn5lr.git)

## Cara Mengunggah ke GitHub (Langkah Manual)
Jalankan perintah berikut satu per satu di terminal komputer Anda (di dalam folder proyek ini):

1. `git init` (Inisialisasi git jika belum)
2. `git remote add origin https://github.com/dhedos/perpus-smpn5lr.git` (Hubungkan ke repo)
3. `git add .` (Menambahkan semua file)
4. `git commit -m "Siap untuk Deployment Vercel - Sistem Perpustakaan Modern"`
5. `git branch -M main` (Pastikan nama branch utama adalah main)
6. `git push -u origin main` (Kirim kode ke GitHub)

## Panduan Deployment ke Vercel
Setelah kode berhasil di-push ke GitHub:

1. Masuk ke [Vercel](https://vercel.com).
2. Klik **Add New Project** -> **Import from GitHub**.
3. Pilih repositori `perpus-smpn5lr`.
4. **PENTING: Pengaturan Variabel Lingkungan**:
   Di bagian **Environment Variables**, tambahkan:
   - `GOOGLE_GENAI_API_KEY`: Masukkan API Key Google AI (Gemini) Anda agar fitur AI Deskripsi berfungsi.
5. Klik **Deploy**.
6. Vercel akan memberikan link domain (contoh: `perpus-smpn5lr.vercel.app`).

---
&copy; 2024 SMPN 5 LANGKE REMBONG. Dirancang untuk efisiensi dan kemandirian data sekolah.
