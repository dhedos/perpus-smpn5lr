
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## 🚀 SOLUSI ERROR 404 / DEPLOYMENT NOT FOUND

Jika Anda melihat pesan **"Deployment Not Found"** di Vercel, ikuti langkah-langkah ini secara berurutan:

### 1. Update Kode di Terminal
Pastikan Anda sudah mengeklik tombol **Apply** pada pesan terbaru saya, lalu jalankan:
```bash
npm run push
```

### 2. Paksa Vercel Buang Cache (PENTING)
Vercel sering menyimpan paket lama yang rusak. Untuk membersihkannya:
1.  Buka **[Vercel Dashboard](https://vercel.com)**.
2.  Pilih proyek Anda (**perpus-smpn5lr**).
3.  Klik tab **Deployments**.
4.  Cari baris deployment yang statusnya **"Failed"** (biasanya yang paling atas).
5.  Klik tombol tiga titik **(...)** di sebelah kanan baris tersebut.
6.  Pilih **Redeploy**.
7.  **CENTANG KOTAK** bertuliskan **"Clear Build Cache"**.
8.  Klik tombol **Redeploy**.

### 3. Cek Environment Variables
Pastikan Anda sudah mengisi API Key Gemini:
- Buka **Settings** > **Environment Variables** di Vercel.
- Pastikan ada `GOOGLE_GENAI_API_KEY` dengan nilai API Key dari Google AI Studio.

---
&copy; 2026 SMPN 5 LANGKE REMBONG.
