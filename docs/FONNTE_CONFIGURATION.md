# Konfigurasi Fonnte WhatsApp API

## Langkah-langkah Konfigurasi

### 1. Dapatkan Token Fonnte

1. Buka [Fonnte.com](https://fonnte.com)
2. Login atau daftar akun baru
3. Dapatkan token API dari dashboard Fonnte
4. Salin token tersebut

### 2. Konfigurasi Environment Variables

#### A. Frontend (.env untuk Development & Testing)

Tambahkan token ke file `.env` di root project:

```bash
# Fonnte WhatsApp API
VITE_FONNTE_TOKEN=your_fonnte_token_here
```

Token ini digunakan untuk:
- **Test koneksi** di Settings Page
- **Development testing** tanpa perlu deploy Edge Functions

**Cara menggunakan:**
1. Edit file `.env` di root project
2. Tambahkan `VITE_FONNTE_TOKEN=your_token`
3. Restart development server (`npm run dev`)
4. Buka Settings Page → Fonnte WhatsApp Gateway
5. Masukkan nomor telepon untuk test
6. Klik "Test Koneksi"

#### B. Backend (Supabase Edge Functions untuk Production)

Ada 2 cara untuk mengatur `FONNTE_TOKEN` di Supabase:

**Cara 1: Melalui Dashboard Supabase (Recommended)**

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Klik **Settings** di sidebar kiri
4. Klik **Edge Functions** 
5. Scroll ke bagian **Secrets**
6. Klik **Add new secret**
7. Masukkan:
   - **Name**: `FONNTE_TOKEN`
   - **Value**: Token Fonnte Anda
8. Klik **Save**

**Cara 2: Melalui CLI**

```bash
# Login ke Supabase CLI (jika belum)
npx supabase login

# Set secret
npx supabase secrets set FONNTE_TOKEN=your_fonnte_token_here --project-ref your-project-ref

# Verifikasi secret sudah tersimpan
npx supabase secrets list --project-ref your-project-ref
```

### 3. Deploy Edge Functions (Jika Belum)

Setelah mengatur secret, deploy ulang Edge Functions agar bisa menggunakan token:

```bash
# Deploy semua Edge Functions
npx supabase functions deploy

# Atau deploy satu per satu
npx supabase functions deploy check-duitku-transaction
npx supabase functions deploy duitku-callback
```

### 4. Verifikasi Konfigurasi

Setelah konfigurasi, Anda bisa memverifikasi dengan cara:

1. **Test di Settings Page (Development)**:
   - Buka Settings → Fonnte WhatsApp Gateway
   - Masukkan nomor WhatsApp Anda
   - Klik "Test Koneksi"
   - Cek apakah pesan WhatsApp masuk

2. **Cek di Dashboard Supabase (Production)**:
   - Buka Settings → Edge Functions → Secrets
   - Pastikan `FONNTE_TOKEN` muncul di daftar

3. **Test dengan Transaksi**:
   - Lakukan transaksi test
   - Cek logs di Supabase Dashboard → Edge Functions → Logs
   - Pastikan tidak ada error "FONNTE_TOKEN not configured"

## Edge Functions yang Menggunakan FONNTE_TOKEN

### 1. check-duitku-transaction

Function ini mengirim notifikasi WhatsApp setelah payment berhasil:

- **File**: `supabase/functions/check-duitku-transaction/index.ts`
- **Line**: 151-201
- **Fitur**:
  - Mengambil template pesan dari `app_settings.whatsapp_success_template`
  - Mengganti variabel `{name}`, `{amount}`, `{campaign}` dengan data transaksi
  - Mengirim pesan via Fonnte API

### 2. duitku-callback

Function ini mengirim notifikasi WhatsApp saat menerima callback dari Duitku:

- **File**: `supabase/functions/duitku-callback/index.ts`
- **Line**: 13-44, 186-206
- **Fitur**:
  - Format nomor telepon otomatis (0xxx → 62xxx)
  - Mengirim pesan konfirmasi pembayaran berhasil
  - Include detail invoice, jumlah, campaign, dan referensi

## Template Pesan WhatsApp

### Mengatur Template di Settings Page

1. Login sebagai admin
2. Buka halaman **Settings**
3. Scroll ke bagian **WhatsApp Notification Settings**
4. Edit template pesan di field **Success Message Template**
5. Gunakan variabel berikut:
   - `{name}` - Nama donatur
   - `{amount}` - Jumlah donasi (format Rupiah)
   - `{campaign}` - Nama campaign
6. Klik **Save Settings**

### Default Template

Jika tidak ada template di database, akan menggunakan template default:

```
Alhamdulillah, terima kasih Kak {name}. Donasi sebesar {amount} untuk {campaign} telah kami terima. Semoga berkah.
```

### Contoh Template Custom

```
*Terima kasih atas donasi Anda!* 🙏

✅ *Pembayaran Berhasil*

👤 Nama: {name}
💰 Jumlah: {amount}
📌 Campaign: {campaign}

Semoga berkah dan bermanfaat.
Jazakallah khairan katsiran! 💚
```

## Format Nomor Telepon

Fonnte API menerima nomor dengan format:

- **Format yang diterima**: `62xxx` (kode negara Indonesia)
- **Contoh**: `628123456789`

System akan otomatis mengkonversi:
- `08123456789` → `628123456789`
- `8123456789` → `628123456789`
- `+628123456789` → `628123456789`

## Troubleshooting

### Token tidak terdeteksi (Frontend)

**Gejala**: Alert "FONNTE_TOKEN tidak ditemukan di environment variables"

**Solusi**:
1. Pastikan `VITE_FONNTE_TOKEN` ada di file `.env`
2. Restart development server
3. Cek console untuk error

### Token tidak terdeteksi (Backend)

**Gejala**: Log menampilkan "FONNTE_TOKEN not configured, skipping WhatsApp notification"

**Solusi**:
1. Pastikan secret sudah di-set di Supabase Dashboard
2. Deploy ulang Edge Functions
3. Tunggu beberapa menit untuk propagasi

### Notifikasi tidak terkirim

**Gejala**: Tidak ada error, tapi pesan WhatsApp tidak masuk

**Solusi**:
1. Cek saldo Fonnte di dashboard
2. Pastikan nomor WhatsApp aktif dan terdaftar di WhatsApp
3. Cek format nomor telepon (harus 62xxx)
4. Cek logs Fonnte di dashboard Fonnte

### Error "Invalid token"

**Gejala**: Fonnte API return error "Invalid token"

**Solusi**:
1. Pastikan token yang di-copy benar dan lengkap
2. Tidak ada spasi di awal atau akhir token
3. Token masih aktif (tidak expired)
4. Generate token baru di dashboard Fonnte jika perlu

## Testing

### Test via Settings Page (Recommended)

1. Buka Settings → Fonnte WhatsApp Gateway
2. Masukkan nomor WhatsApp Anda di field "Nomor Telepon untuk Test Koneksi"
3. Klik tombol "Test Koneksi"
4. Tunggu beberapa detik
5. Cek WhatsApp Anda - harus ada pesan test

### Test via Transaksi

1. Buat transaksi test di aplikasi
2. Gunakan nomor WhatsApp yang aktif
3. Selesaikan pembayaran
4. Cek apakah notifikasi WhatsApp masuk

### Test via Logs

1. Buka Supabase Dashboard → Edge Functions → Logs
2. Filter by function: `check-duitku-transaction` atau `duitku-callback`
3. Cari log dengan emoji 📱 "Sending WhatsApp Notification..."
4. Cek response dari Fonnte API

## Environment Variables Summary

Berikut semua environment variables yang diperlukan untuk sistem payment:

### Frontend (.env)

```bash
# Fonnte Configuration (untuk test koneksi)
VITE_FONNTE_TOKEN=your_fonnte_token

# Duitku Configuration (untuk frontend)
VITE_DUITKU_MERCHANT_CODE=your_merchant_code
VITE_DUITKU_API_KEY=your_api_key
VITE_DUITKU_SANDBOX=true  # atau false untuk production

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Backend (Supabase Secrets)

```bash
# Duitku Configuration
DUITKU_MERCHANT_CODE=your_merchant_code
DUITKU_API_KEY=your_api_key
DUITKU_SANDBOX=true  # atau false untuk production

# Fonnte Configuration
FONNTE_TOKEN=your_fonnte_token

# Supabase (otomatis tersedia di Edge Functions)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Keamanan

⚠️ **PENTING**:

1. **Jangan commit** token ke Git
2. **Jangan share** token di public
3. **Gunakan** Supabase Secrets untuk production
4. **Gunakan** `.env` hanya untuk development
5. **Rotate** token secara berkala
6. **Monitor** usage di dashboard Fonnte

## Support

Jika ada masalah:

1. Cek dokumentasi Fonnte: [https://fonnte.com/api](https://fonnte.com/api)
2. Cek Supabase Edge Functions logs
3. Hubungi support Fonnte jika masalah di sisi API
