
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## CARA KIRIM KE GITHUB (VIA TERMINAL)

Jika Anda melihat pesan "nothing to commit" atau ingin mengirim kode, ketik perintah ini dan tekan Enter:

```bash
npm run push
```

*Perintah di atas akan otomatis menjalankan `git add .`, mencoba `git commit`, dan langsung melakukan `git push` ke GitHub Anda.*

---

## JIKA GAGAL SAAT PUSH

Jika Terminal meminta password atau akses ditolak, jalankan ini sekali saja untuk menyambungkan ulang:

```bash
git remote set-url origin https://github.com/dhedos/perpus-smpn5lr.git
```

## Panduan Deployment ke Vercel
Setelah kode berhasil terkirim ke GitHub:
1. Masuk ke [Vercel](https://vercel.com).
2. Klik **Add New Project** lalu pilih repositori `perpus-smpn5lr`.
3. **PENTING**: Di bagian **Environment Variables**, tambahkan:
   - `GOOGLE_GENAI_API_KEY`: Masukkan API Key Gemini Anda agar fitur AI Deskripsi aktif.
4. Klik **Deploy**.

---
&copy; 2024 SMPN 5 LANGKE REMBONG. Dirancang untuk efisiensi dan kemandirian data sekolah.
