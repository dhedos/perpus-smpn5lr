
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## 🚀 SOLUSI ERROR BUILD DI VERCEL

Jika Anda melihat pesan **"Deployment Not Found"** atau **"No Output Directory named public"**, ikuti langkah-langkah ini:

### 1. Update Framework Preset
Vercel terkadang salah mendeteksi proyek. Anda harus mengaturnya secara manual:
1. Buka **[Vercel Dashboard](https://vercel.com)**.
2. Pilih proyek Anda.
3. Klik tab **Settings** (di bagian atas).
4. Pada menu **General**, cari bagian **Framework Preset**.
5. Pastikan terpilih **Next.js**. Jika tertulis "Other", silakan ganti ke **Next.js**.
6. Klik **Save**.

### 2. Jalankan Ulang Build (Redeploy)
Setelah mengubah settings, Anda harus memicu build ulang:
1. Klik tab **Deployments**.
2. Cari deployment yang gagal (paling atas).
3. Klik tombol tiga titik **(...)** di sebelah kanan.
4. Pilih **Redeploy**.
5. **PENTING:** Centang kotak **"Clear Build Cache"**.
6. Klik tombol **Redeploy**.

### 3. Masalah Firebase (no-options)
Error ini sudah diperbaiki di dalam kode (`src/firebase/index.ts`). Pastikan Anda mengeklik tombol **Apply** pada pesan asisten AI sebelum menjalankan `npm run push`.

---
&copy; 2026 SMPN 5 LANGKE REMBONG.
