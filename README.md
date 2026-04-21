
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## Cara Mengunggah ke GitHub (Tanpa Terminal)
Jika Anda tidak memiliki akses ke terminal, ikuti langkah ini:

1. **Download Kode**: Unduh seluruh folder proyek ini ke komputer Anda.
2. **Buka GitHub**: Masuk ke repositori [https://github.com/dhedos/perpus-smpn5lr](https://github.com/dhedos/perpus-smpn5lr).
3. **Upload Manual**:
   - Klik tombol **Add file** lalu pilih **Upload files**.
   - Seret (drag & drop) semua isi folder proyek ini ke halaman GitHub tersebut (kecuali folder `node_modules` jika ada).
   - Klik **Commit changes**.

## Panduan Deployment ke Vercel
Setelah kode ada di GitHub:

1. Masuk ke [Vercel](https://vercel.com).
2. Klik **Add New Project** lalu pilih repositori `perpus-smpn5lr`.
3. **PENTING: Variabel Lingkungan**:
   Di bagian **Environment Variables**, tambahkan:
   - `GOOGLE_GENAI_API_KEY`: Masukkan API Key Gemini Anda agar fitur AI Deskripsi berfungsi.
4. Klik **Deploy**.

---
&copy; 2024 SMPN 5 LANGKE REMBONG. Dirancang untuk efisiensi dan kemandirian data sekolah.
