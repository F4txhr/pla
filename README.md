# VPN Manager Dashboard

VPN Manager adalah dasbor web berkinerja tinggi yang dirancang untuk menyederhanakan pengelolaan dan pemantauan layanan proksi/VPN Anda. Aplikasi ini dibangun sepenuhnya di atas arsitektur serverless Cloudflare, memanfaatkannya untuk memberikan kecepatan, keamanan, dan skalabilitas.

Ini menyediakan antarmuka yang ramah pengguna untuk mengelola proksi, akun, dan konfigurasi langganan tanpa perlu berinteraksi dengan antarmuka baris perintah atau file konfigurasi yang rumit.

---

## ✨ Fitur Utama

- **Dasbor Terpusat**: Dapatkan gambaran umum waktu nyata tentang layanan Anda, termasuk jumlah total proksi, proksi yang sedang online, terowongan aktif, dan akun pengguna.
- **Manajemen Proksi**: Tambah, lihat, dan kelola daftar proksi Anda dengan mudah.
- **Manajemen Akun**: Kontrol siapa yang memiliki akses ke layanan Anda dengan mengelola akun pengguna.
- **Pembuatan Langganan**: Hasilkan file konfigurasi VPN untuk pengguna akhir dengan mudah.
- **Cepat dan Aman**: Dibangun di atas Cloudflare Workers dan KV untuk latensi rendah dan keamanan yang kuat.
- **Desain Responsif**: Antarmuka yang bersih dan modern yang berfungsi dengan baik di perangkat desktop dan seluler.

---

## 🚀 Arsitektur & Teknologi

Proyek ini menggunakan tumpukan teknologi modern yang sepenuhnya berbasis pada ekosistem Cloudflare:

- **Backend**: **Cloudflare Workers** menangani semua logika sisi server. Worker berfungsi sebagai router API dan penyaji aset statis, menghilangkan kebutuhan akan server tradisional.
- **Database**: **Cloudflare KV** digunakan sebagai penyimpanan data. Ini adalah penyimpanan nilai-kunci terdistribusi global yang sangat cepat, digunakan untuk menyimpan daftar proksi, data akun, dan konfigurasi aplikasi lainnya.
- **Frontend**:
  - **HTML, CSS, dan JavaScript**: Fondasi standar web.
  - **TailwindCSS**: Kerangka kerja CSS utilitas pertama untuk membangun desain kustom dengan cepat.
  - **Font Awesome**: Untuk ikon di seluruh aplikasi.

### Alur Kerja Aplikasi
1.  Pengguna mengakses URL aplikasi.
2.  Cloudflare Worker (`index.js`) menerima permintaan dan menyajikan aset frontend statis (HTML, CSS, JS).
3.  JavaScript frontend kemudian membuat panggilan API ke endpoint yang sama (misalnya, `/api/proxies`).
4.  Worker menangani panggilan API ini, mengambil atau menulis data ke Cloudflare KV yang sesuai.
5.  Data dikembalikan ke frontend sebagai JSON, yang kemudian memperbarui antarmuka pengguna secara dinamis.

---

## 🔧 Panduan Pengaturan Langkah-demi-Langkah

Untuk menerapkan dan menjalankan aplikasi ini, ikuti langkah-langkah berikut dengan cermat.

### Prasyarat
- Akun Cloudflare.
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) terinstal dan terotentikasi.

### Langkah 1: Kloning Repositori
Kloning repositori ini ke mesin lokal Anda.

### Langkah 2: Buat Namespace Cloudflare KV
Aplikasi ini **membutuhkan** tiga (3) Namespace KV yang berbeda untuk berfungsi.

1.  Buka Dasbor Cloudflare Anda.
2.  Navigasi ke **Workers & Pages** > **KV**.
3.  Buat tiga namespace berikut:
    - `PROXY_STATUS`
    - `ACCOUNTS_DATA`
    - `APP_DATA`
4.  Setelah setiap namespace dibuat, salin **ID Namespace**-nya. Anda akan membutuhkannya di langkah berikutnya.

### Langkah 3: Konfigurasikan `wrangler.toml`
File `wrangler.toml` adalah file konfigurasi utama untuk proyek Cloudflare Worker Anda.

1.  Buka file `wrangler.toml` di editor kode Anda.
2.  Ganti `account_id` dengan **ID Akun** Cloudflare Anda. Anda dapat menemukannya di dasbor Cloudflare Anda.
3.  Temukan bagian `kv_namespaces`.
4.  Tempelkan ID Namespace yang Anda salin dari Langkah 2 ke dalam bidang `id` yang sesuai. File Anda akan terlihat seperti ini:

    ```toml
    # ... (pengaturan lainnya) ...

    kv_namespaces = [
      { binding = "PROXY_STATUS", id = "ID_NAMESPACE_PROXY_STATUS_ANDA_DI_SINI" },
      { binding = "ACCOUNTS_DATA", id = "ID_NAMESPACE_ACCOUNTS_DATA_ANDA_DI_SINI" },
      { binding = "APP_DATA", id = "ID_NAMESPACE_APP_DATA_ANDA_DI_SINI" }
    ]

    [site]
    bucket = "./"
    ```

### Langkah 4: Terapkan Aplikasi
Setelah konfigurasi selesai, Anda dapat menerapkan aplikasi Anda.

Jalankan perintah berikut di terminal Anda:
```sh
wrangler deploy
```

Wrangler akan membangun dan menerapkan Worker Anda, mengikat Namespace KV, dan mengunggah aset statis Anda. Setelah selesai, ia akan memberi Anda URL tempat dasbor Anda aktif.