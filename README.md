
# Pustaka Nusantara - SMPN 5 LANGKE REMBONG

Sistem Informasi Perpustakaan Modern dengan integrasi AI, Scan QR, dan Sinkronisasi Cloud.

## CARA CEPAT KIRIM KE GITHUB (TINGGAL KLIK)

Jika Anda tidak ingin mengetik di terminal, silakan gunakan fitur editor ini:

1. **Gunakan Ikon Git di Sidebar**:
   - Cari ikon **Source Control** (gambar cabang pohon) di sebelah kiri layar ini.
   - Klik ikon tersebut, lalu ketik pesan (misal: "update") di kotak pesan.
   - Klik tombol **Commit** (biasanya ikon centang).
   - Klik ikon tiga titik `...` lalu pilih **Push**.

2. **Gunakan Skrip Otomatis (Jika ada tombol Run)**:
   - Buka berkas `package.json`.
   - Cari baris `"git-push-cepat"`.
   - Klik tombol **"Run"** atau ikon **Segitiga (Play)** yang muncul di sebelah kiri baris tersebut. Sistem akan melakukan `add`, `commit`, dan `push` secara otomatis.

3. **Cara Manual via Browser (Jika poin 1 & 2 tidak ada)**:
   - Unduh semua berkas di proyek ini.
   - Buka repositori Anda: [https://github.com/dhedos/perpus-smpn5lr](https://github.com/dhedos/perpus-smpn5lr).
   - Klik tombol **Add file** -> **Upload files**.
   - Tarik semua isi folder proyek Anda ke sana dan klik **Commit changes**.

## Panduan Deployment ke Vercel
Setelah kode ada di GitHub:
1. Masuk ke [Vercel](https://vercel.com).
2. Klik **Add New Project** lalu pilih repositori `perpus-smpn5lr`.
3. **PENTING**: Di bagian **Environment Variables**, tambahkan:
   - `GOOGLE_GENAI_API_KEY`: Masukkan API Key Gemini Anda.
4. Klik **Deploy**.

---
&copy; 2024 SMPN 5 LANGKE REMBONG. Dirancang untuk efisiensi dan kemandirian data sekolah.
