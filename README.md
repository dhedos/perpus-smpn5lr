
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## Cara Mengirim Kode ke GitHub (Sekali Klik)

Jika Anda tidak ingin mengetik di terminal, Anda bisa menggunakan fitur di editor ini:

1. **Gunakan Ikon Git di Sidebar**:
   - Cari ikon **Source Control** (gambar cabang pohon) di sebelah kiri editor ini.
   - Klik ikon tersebut, lalu tekan tombol **"Commit"** atau ikon centang.
   - Setelah itu, klik ikon tiga titik `...` lalu pilih **"Push"**.

2. **Gunakan Skrip Otomatis**:
   - Buka berkas `package.json`.
   - Cari baris `"git-push-cepat"`.
   - Jika ada tombol **"Run"** atau ikon **segitiga (play)** di sebelahnya, silakan **KLIK** tombol tersebut. Ini akan menjalankan proses `add`, `commit`, dan `push` secara otomatis.

3. **Cara Manual via Browser (Jika poin 1 & 2 tidak ada)**:
   - Unduh semua berkas di proyek ini.
   - Buka repositori Anda: [https://github.com/dhedos/perpus-smpn5lr](https://github.com/dhedos/perpus-smpn5lr).
   - Klik tombol **Add file** -> **Upload files**.
   - Seret semua isi folder ini ke sana dan klik **Commit changes**.

## Panduan Deployment ke Vercel
Setelah kode ada di GitHub:
1. Masuk ke [Vercel](https://vercel.com).
2. Klik **Add New Project** lalu pilih repositori `perpus-smpn5lr`.
3. **PENTING**: Di bagian **Environment Variables**, tambahkan:
   - `GOOGLE_GENAI_API_KEY`: Masukkan API Key Gemini Anda.
4. Klik **Deploy**.

---
&copy; 2024 SMPN 5 LANGKE REMBONG. Dirancang untuk efisiensi dan kemandirian data sekolah.
