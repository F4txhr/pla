# VPN Manager Dashboard (Vercel & Supabase Edition)

VPN Manager adalah dasbor web berkinerja tinggi yang dirancang untuk menyederhanakan pengelolaan dan pemantauan layanan proksi/VPN Anda. Aplikasi ini dibangun di atas arsitektur serverless modern menggunakan **Vercel** untuk hosting dan **Supabase** untuk database PostgreSQL.

Ini menyediakan antarmuka yang ramah pengguna untuk mengelola proksi, akun, dan konfigurasi terowongan tanpa perlu berinteraksi dengan antarmuka baris perintah atau file konfigurasi yang rumit.

---

## ✨ Fitur Utama

- **Dasbor Terpusat**: Dapatkan gambaran umum waktu nyata tentang layanan Anda, termasuk jumlah total proksi, proksi yang sedang online, terowongan aktif, dan akun pengguna.
- **Manajemen Proksi**: Tambah, lihat, dan kelola daftar proksi Anda dengan mudah.
- **Manajemen Akun**: Kontrol siapa yang memiliki akses ke layanan Anda dengan mengelola akun pengguna.
- **Backend Bertenaga Supabase**: Menggunakan database PostgreSQL yang kuat untuk penyimpanan data yang andal dan dapat diskalakan.
- **Penerapan Mudah**: Dihosting di Vercel untuk penerapan berkelanjutan yang mulus dan kinerja global.
- **Desain Responsif**: Antarmuka yang bersih dan modern yang berfungsi dengan baik di perangkat desktop dan seluler.

---

## 🚀 Arsitektur & Teknologi

Proyek ini telah dimigrasikan ke tumpukan teknologi yang kuat dan dapat diskalakan:

- **Frontend**:
  - **HTML, CSS, dan JavaScript**: Fondasi standar web.
  - **TailwindCSS**: Kerangka kerja CSS utilitas pertama untuk membangun desain kustom dengan cepat.
- **Backend**: **Vercel Serverless Functions** menangani semua logika sisi server. Setiap file di direktori `api/` menjadi endpoint API tanpa server.
- **Database**: **Supabase** menyediakan backend PostgreSQL, memungkinkan kueri relasional yang kompleks dan skalabilitas yang lebih baik dibandingkan dengan penyimpanan nilai-kunci.

### Alur Kerja Aplikasi
1.  Pengguna mengakses URL aplikasi yang dihosting di Vercel.
2.  Vercel menyajikan aset frontend statis (HTML, CSS, JS).
3.  JavaScript frontend kemudian membuat panggilan API ke endpoint Vercel Function (misalnya, `/api/stats`).
4.  Fungsi serverless mengeksekusi, terhubung ke database Supabase menggunakan kredensial yang aman.
5.  Fungsi mengambil atau menulis data ke database PostgreSQL.
6.  Data dikembalikan ke frontend sebagai JSON, yang kemudian memperbarui antarmuka pengguna secara dinamis.

---

## 🔧 Panduan Penyiapan Pengembangan Lokal

Ikuti langkah-langkah ini untuk menjalankan salinan proyek di mesin lokal Anda (misalnya, untuk debugging di Termux).

### Prasyarat
- [Node.js](https://nodejs.org/) dan [npm](https://www.npmjs.com/) terinstal.
- Akun [Supabase](https://supabase.com/) dan proyek baru yang telah dibuat.
- [Vercel CLI](https://vercel.com/docs/cli) terinstal (`npm install -g vercel`).

### Langkah 1: Kloning Repositori
Kloning repositori ini ke mesin lokal Anda.

### Langkah 2: Instal Dependensi
Arahkan ke direktori proyek dan instal dependensi yang diperlukan.
```sh
npm install
```

### Langkah 3: Siapkan Database Supabase
Database Anda perlu disiapkan dengan tabel dan kebijakan keamanan yang benar.

1.  Buka proyek Anda di Dasbor Supabase.
2.  Navigasi ke **SQL Editor**.
3.  Buka file `setup.sql` di repositori ini, salin seluruh isinya.
4.  Tempelkan skrip SQL ke editor di Supabase dan klik **"RUN"**. Ini akan membuat tabel `proxies`, `accounts`, `tunnels`, dan `metadata`.

### Langkah 4: Konfigurasikan Variabel Lingkungan
Aplikasi perlu mengetahui cara terhubung ke database Supabase Anda.

1.  Buat file baru di direktori root proyek Anda bernama `.env.local`.
2.  Temukan kredensial API Anda di dasbor Supabase di bawah **Project Settings > API**.
3.  Tambahkan konten berikut ke file `.env.local` Anda, ganti dengan kunci Anda sendiri:

    ```
    # Kredensial Proyek Supabase
    SUPABASE_URL="URL_PROYEK_SUPABASE_ANDA"
    SUPABASE_ANON_KEY="KUNCI_ANON_PUBLIK_SUPABASE_ANDA"
    ```

### Langkah 5: Jalankan Server Pengembangan Lokal
Sekarang Anda dapat memulai server pengembangan lokal menggunakan Vercel CLI.

```sh
npm run dev
# Atau jalankan langsung:
# vercel dev
```
Vercel CLI akan memulai server di `localhost:3000`, menyajikan file frontend Anda dan menjalankan fungsi API Anda. Anda sekarang dapat membuka `http://localhost:3000` di browser Anda untuk melihat aplikasi berjalan.

---

## 📦 Penerapan ke Vercel

Untuk menerapkan proyek ini ke produksi:
1.  Dorong kode Anda ke repositori Git (GitHub, GitLab, dll.).
2.  Impor proyek Git Anda di dasbor Vercel.
3.  Konfigurasikan **Variabel Lingkungan** di pengaturan proyek Vercel Anda. Tambahkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dengan nilai yang sama seperti yang Anda gunakan di file `.env.local` Anda.
4.  Terapkan. Vercel akan secara otomatis membangun dan menerapkan proyek Anda.