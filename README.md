
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## CARA KIRIM KE GITHUB (VIA TERMINAL)

Jika Anda ingin menggunakan terminal seperti di gambar Anda, ketik perintah ini dan tekan Enter:

```bash
npm run push
```

*Perintah di atas akan otomatis menjalankan `git add .`, `git commit`, dan `git push` sekaligus.*

---

## CARA CEPAT (TANPA KETIK)

1. **Gunakan Ikon Git di Sidebar**:
   - Cari ikon **Source Control** (gambar cabang pohon) di sebelah kiri layar ini.
   - Klik ikon tersebut, lalu ketik pesan (misal: "update") di kotak pesan.
   - Klik tombol **Commit** (ikon centang).
   - Klik ikon tiga titik `...` lalu pilih **Push**.

## Panduan Deployment ke Vercel
Setelah kode ada di GitHub:
1. Masuk ke [Vercel](https://vercel.com).
2. Klik **Add New Project** lalu pilih repositori `perpus-smpn5lr`.
3. **PENTING**: Di bagian **Environment Variables**, tambahkan:
   - `GOOGLE_GENAI_API_KEY`: Masukkan API Key Gemini Anda.
4. Klik **Deploy**.

---
&copy; 2024 SMPN 5 LANGKE REMBONG. Dirancang untuk efisiensi dan kemandirian data sekolah.
