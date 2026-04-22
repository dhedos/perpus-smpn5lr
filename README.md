
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## 🚀 SOLUSI ERROR DEPLOYMENT DI VERCEL

Jika Anda melihat pesan **"Deployment Not Found"** atau error **"No Output Directory"**, ikuti langkah-langkah ini:

### 1. Atur Framework Preset (PENTING)
Vercel terkadang salah mendeteksi proyek ini sebagai "Other".
1. Buka **Vercel Dashboard**.
2. Masuk ke **Settings** proyek Anda.
3. Pada bagian **Framework Preset**, pastikan terpilih **Next.js**.
4. Klik **Save**.

### 2. Redeploy dengan Hapus Cache
1. Masuk ke tab **Deployments** di Vercel.
2. Cari deployment yang gagal (paling atas).
3. Klik tombol tiga titik **(...)** -> Pilih **Redeploy**.
4. **Centang kotak** "Clear Build Cache".
5. Klik **Redeploy**.

### 3. Tambahkan Environment Variable
Pastikan Anda sudah menambahkan API Key Gemini untuk fitur AI Deskripsi Buku:
- Nama: `GOOGLE_GENAI_API_KEY`
- Nilai: (Dapatkan dari Google AI Studio)

---
&copy; 2026 SMPN 5 LANGKE REMBONG.
