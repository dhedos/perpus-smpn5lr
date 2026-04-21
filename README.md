
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## 🚀 CARA MENGATASI ERROR (TANDA X MERAH) DI GITHUB/VERCEL

Jika Anda melihat tanda **X merah** di GitHub atau pesan `DEPLOYMENT_NOT_FOUND` di Vercel, ikuti langkah ini:

1.  **Cek Log di Vercel**:
    - Buka [vercel.com](https://vercel.com) dan masuk ke dashboard proyek Anda.
    - Klik pada tab **Deployments**.
    - Klik pada deployment yang berstatus **Error** (merah).
    - Klik tombol **View Logs**. Di sana akan tertulis teks berwarna merah yang menjelaskan penyebab kegagalannya.

2.  **Masalah Umum (Missing Environment Variable)**:
    - AI tidak akan bekerja jika Anda belum memasukkan API Key.
    - Di Vercel, buka menu **Settings** -> **Environment Variables**.
    - Tambahkan:
        - **Key**: `GOOGLE_GENAI_API_KEY`
        - **Value**: (Masukkan API Key Gemini Anda)
    - Setelah simpan, lakukan **Redeploy**.

3.  **Ketik di Terminal Kembali**:
    Setelah Anda mengeklik **Apply** pada perubahan kode saya, jalankan kembali:
    ```bash
    npm run push
    ```

---
&copy; 2026 SMPN 5 LANGKE REMBONG.
