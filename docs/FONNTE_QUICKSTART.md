# Quick Start: Konfigurasi Fonnte Token

## Cara Tercepat - Test Koneksi di Settings Page

### 1. Tambahkan Token ke .env

Edit file `.env` di root project:

```bash
# Tambahkan baris ini
VITE_FONNTE_TOKEN=your_fonnte_token_here
```

### 2. Restart Development Server

```bash
# Stop server (Ctrl+C) lalu restart
npm run dev
```

### 3. Test Koneksi

1. Buka browser → **Settings Page**
2. Scroll ke bagian **Fonnte WhatsApp Gateway**
3. Masukkan nomor WhatsApp Anda (contoh: `08123456789`)
4. Klik tombol **Test Koneksi** (hijau)
5. Tunggu beberapa detik
6. Cek WhatsApp - harus ada pesan test ✅

## Setup untuk Production (Supabase)

### Opsi 1: Otomatis via Script

```bash
./scripts/setup-fonnte.sh
```

Script ini akan:
- ✅ Membaca `VITE_FONNTE_TOKEN` dari `.env`
- ✅ Login ke Supabase CLI (jika belum)
- ✅ Upload token ke Supabase Secrets sebagai `FONNTE_TOKEN`
- ✅ Deploy Edge Functions (opsional)

### Opsi 2: Manual via Dashboard

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. **Settings** → **Edge Functions** → **Secrets**
3. Klik **Add new secret**
4. Name: `FONNTE_TOKEN`
5. Value: Token dari `.env` Anda
6. **Save**
7. Deploy Edge Functions:
   ```bash
   npx supabase functions deploy
   ```

## Verifikasi

### Frontend (Development)

```bash
# Cek apakah token ada di .env
cat .env | grep VITE_FONNTE_TOKEN

# Harus muncul:
# VITE_FONNTE_TOKEN=your_token_here
```

### Backend (Production)

```bash
# Via CLI
npx supabase secrets list --project-ref YOUR_PROJECT_REF

# Via Dashboard
Settings → Edge Functions → Secrets
```

Anda harus melihat `FONNTE_TOKEN` dalam daftar secrets.

## Testing

### Test 1: Settings Page (Development)

1. **Buka Settings Page**
2. **Scroll ke Fonnte WhatsApp Gateway**
3. **Masukkan nomor HP** (08xxx atau 62xxx)
4. **Klik Test Koneksi**
5. **Cek WhatsApp** - harus ada pesan

✅ **Berhasil**: Alert "Test Berhasil! Pesan WhatsApp terkirim..."  
❌ **Gagal**: Alert "FONNTE_TOKEN tidak ditemukan..." → Cek `.env`

### Test 2: Transaksi (Production)

1. **Buat transaksi test** di aplikasi
2. **Gunakan nomor WhatsApp aktif** Anda
3. **Selesaikan pembayaran**
4. **Cek WhatsApp** - harus ada notifikasi pembayaran berhasil

### Test 3: Logs (Production)

1. Buka Supabase Dashboard
2. Edge Functions → Logs
3. Filter: `check-duitku-transaction`
4. Cari log: 📱 "Sending WhatsApp Notification..."
5. Cek response dari Fonnte

## Troubleshooting

### ❌ "FONNTE_TOKEN tidak ditemukan di environment variables"

**Penyebab**: Token belum ditambahkan ke `.env`

**Solusi**:
```bash
# Edit .env
echo "VITE_FONNTE_TOKEN=your_token_here" >> .env

# Restart server
npm run dev
```

### ❌ "Test Gagal: Invalid token"

**Penyebab**: Token salah atau expired

**Solusi**:
1. Login ke [fonnte.com](https://fonnte.com)
2. Generate token baru
3. Update `.env` dengan token baru
4. Restart server

### ❌ Pesan tidak masuk ke WhatsApp

**Penyebab**: Nomor tidak valid atau saldo habis

**Solusi**:
1. Cek format nomor (08xxx atau 62xxx)
2. Cek saldo Fonnte di dashboard
3. Pastikan nomor terdaftar di WhatsApp

## Environment Variables

### Development (.env)

```bash
# Fonnte (untuk test koneksi)
VITE_FONNTE_TOKEN=your_fonnte_token

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Production (Supabase Secrets)

```bash
# Set via Dashboard atau CLI
FONNTE_TOKEN=your_fonnte_token
DUITKU_MERCHANT_CODE=your_merchant_code
DUITKU_API_KEY=your_api_key
DUITKU_SANDBOX=true
```

## Dokumentasi Lengkap

Untuk informasi lebih detail:
- **Full Guide**: [FONNTE_CONFIGURATION.md](./FONNTE_CONFIGURATION.md)
- **Fonnte API Docs**: [fonnte.com/api](https://fonnte.com/api)

## Support

Jika masih ada masalah:
1. ✅ Cek `.env` - pastikan `VITE_FONNTE_TOKEN` ada
2. ✅ Restart server - `npm run dev`
3. ✅ Cek Supabase Secrets - pastikan `FONNTE_TOKEN` ada
4. ✅ Cek logs - Supabase Dashboard → Edge Functions → Logs
5. ✅ Cek saldo - Fonnte Dashboard

---

**Quick Checklist:**
- [ ] Token ditambahkan ke `.env`
- [ ] Server di-restart
- [ ] Test koneksi di Settings Page berhasil
- [ ] Token di-upload ke Supabase Secrets (untuk production)
- [ ] Edge Functions di-deploy
- [ ] Test transaksi berhasil menerima notifikasi WhatsApp
