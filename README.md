
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## 🚀 SOLUSI ERROR 404 / DEPLOYMENT NOT FOUND / BUILD ERROR

Jika Anda melihat pesan **"Deployment Not Found"**, error build, atau **"Module not found"** di Vercel, ikuti langkah-langkah ini secara berurutan:

### 1. Update Kode di Terminal
Klik tombol **Apply** pada pesan terbaru, lalu jalankan perintah ini di terminal:
```bash
npm run push
```

### 2. Paksa Vercel Buang Cache (SOLUSI UTAMA MODUL HILANG)
Vercel sering menyimpan paket lama yang menyebabkan error build. Untuk membersihkannya:
1. Buka **[Vercel Dashboard](https://vercel.com)**.
2. Pilih proyek Anda.
3. Klik tab **Deployments**.
4. Cari deployment yang statusnya **"Failed"** (biasanya yang paling atas).
5. Klik tombol tiga titik **(...)** di sebelah kanan baris tersebut.
6. Pilih **Redeploy**.
7. **WAJIB CENTANG KOTAK** bertuliskan **"Clear Build Cache"**.
8. Klik tombol **Redeploy**.

### 3. Cek Framework Preset
Jika Anda melihat error **"No Output Directory named public found"**:
1. Buka **Project Settings** di Vercel.
2. Pastikan **Framework Preset** diatur ke **Next.js** (bukan "Other").

---
&copy; 2026 SMPN 5 LANGKE REMBONG.
