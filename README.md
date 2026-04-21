
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## ⚠️ JIKA GAGAL SAAT PUSH (ERROR: 'origin' not found)
Jika Anda melihat pesan error seperti di gambar Anda, jalankan perintah ini **SATU KALI SAJA** di Terminal untuk menyambungkan ke GitHub:

```bash
git remote add origin https://github.com/dhedos/perpus-smpn5lr.git
```
*Jika perintah di atas error karena sudah ada, gunakan ini:*
```bash
git remote set-url origin https://github.com/dhedos/perpus-smpn5lr.git
```

---

## CARA KIRIM KE GITHUB (SETELAH DISAMBUNGKAN)
Cukup ketik ini di Terminal:

```bash
npm run push
```

*Perintah di atas akan menjalankan `git add .`, `git commit`, dan `git push` secara otomatis.*

---

## Panduan Deployment ke Vercel
Setelah kode berhasil terkirim ke GitHub:
1. Masuk ke [Vercel](https://vercel.com).
2. Klik **Add New Project** lalu pilih repositori `perpus-smpn5lr`.
3. **PENTING**: Di bagian **Environment Variables**, tambahkan:
   - `GOOGLE_GENAI_API_KEY`: Masukkan API Key Gemini Anda.
4. Klik **Deploy**.

---
&copy; 2024 SMPN 5 LANGKE REMBONG.
