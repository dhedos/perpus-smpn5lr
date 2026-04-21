
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## CARA KIRIM KE GITHUB (VIA TERMINAL)

Jika Anda melihat tombol di bawah ini, klik untuk mengirim kode secara otomatis:

```bash
npm run push
```

*Perintah di atas akan menjalankan `git add .`, `git commit`, dan `git push` ke GitHub Anda sekaligus.*

---

## JIKA GAGAL SAAT PUSH

Jika Terminal meminta akses ditolak, jalankan ini sekali untuk menyambungkan ulang repositori:

```bash
git remote set-url origin https://github.com/dhedos/perpus-smpn5lr.git
```

## Panduan Deployment ke Vercel
Setelah kode berhasil terkirim ke GitHub:
1. Masuk ke [Vercel](https://vercel.com).
2. Klik **Add New Project** lalu pilih repositori `perpus-smpn5lr`.
3. **PENTING**: Di bagian **Environment Variables**, tambahkan:
   - `GOOGLE_GENAI_API_KEY`: Masukkan API Key Gemini Anda.
4. Klik **Deploy**.

---
&copy; 2024 SMPN 5 LANGKE REMBONG.
