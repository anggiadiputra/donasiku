# 🚀 Duitku Setup Guide - Quick Start

Panduan cepat untuk setup Duitku payment gateway di proyek Donasiku.

---

## 📦 Prerequisites

- ✅ Akun Duitku (sandbox atau production)
- ✅ Merchant Code & API Key dari Duitku
- ✅ Fonnte account untuk WhatsApp notifications (optional)
- ✅ Supabase CLI installed
- ✅ Project sudah linked ke Supabase

---

## ⚡ Quick Setup (5 Steps)

### Step 1: Set Environment Variables

**Tambahkan ke `.env` file:**
```env
# Duitku Configuration
VITE_DUITKU_MERCHANT_CODE=D7968
VITE_DUITKU_API_KEY=your_api_key_here
VITE_DUITKU_SANDBOX=true
```

**Set Supabase Secrets:**
```bash
supabase secrets set DUITKU_MERCHANT_CODE=D7968
supabase secrets set DUITKU_API_KEY=your_api_key_here
supabase secrets set DUITKU_SANDBOX=true
supabase secrets set FONNTE_TOKEN=your_fonnte_token  # Optional
```

---

### Step 2: Deploy Database Migration

```bash
# Pastikan Supabase CLI sudah login & linked
supabase db push

# Atau manually run migration
supabase db push --migration-file  supabase/migrations/20251218000001_create_transactions_table.sql
```

Ini akan create tabel `transactions` dengan semua indexes dan RLS policies.

---

### Step 3: Deploy Edge Functions

```bash
# Deploy all functions sekaligus
supabase functions deploy create-duitku-transaction
supabase functions deploy duitku-callback  
supabase functions deploy check-duitku-transaction
```

**Verify deployment:**
```bash
supabase functions list
```

---

### Step 4: Configure Duitku Dashboard

1. Login ke https://dashboard.duitku.com/(sandbox atau production)
2. Navigate ke **Project Settings → Callback URL**
3. Set callback URL:
   ```
   https://[your-project-ref].supabase.co/functions/v1/duitku-callback
   ```
   
   **Cara dapat Project Ref:**
   - Buka Supabase dashboard
   - Project Settings → General → Reference ID
   - Atau check di URL: `https://supabase.com/dashboard/project/[your-ref]`

4. Set return URL (optional):
   ```
   https://[your-domain].com/payment/status
   ```

---

### Step 5: Test Payment Flow

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Buka browser:** http://localhost:5173

3. **Test flow:**
   - Pilih campaign
   - Klik Donasi
   - Pilih payment method
   - Selesaikan pembayaran (sandbox)

4. **Verify:**
   - Check payment status page appeared
   - Check transaction di Supabase dashboard
   - Check WhatsApp notification (if configured)

---

## 🧪 Testing di Sandbox

### Duitku Sandbox Credentials:
- **Base URL:** https://sandbox.duitku.com
- **Merchant Code:** D7968 (example - use yours)
- **Test payment:** Use exact amount shown

### Test Payment Methods:

#### Virtual Account:
```
- Bayar dengan nominal EXACT
- Status akan otomatis success
- Test dengan BCA, Mandiri, BNI, dll
```

#### QRIS:
```  
- Scan QR code
- Bayar dengan nominal exact
- Auto-redirect ke return URL
```

#### E-Wallet:
```
- OVO, ShopeePay, DANA, LinkAja
- Follow Duitku sandbox instructions
```

---

## 🔍 Troubleshooting

### Issue: Payment method tidak muncul

**Solution:**
```bash
# Check environment variables
cat .env | grep DUITKU

# Verify API key benar
# Check browser console untuk error messages
```

---

### Issue: Callback tidak terima notification

**Solution:**
1. Check callback URL di Duitku dashboard benar
2. Verify Edge Function deployed:
   ```bash
   supabase functions list
   ```
3. Check Edge Function logs:
   ```bash
   supabase functions logs duitku-callback --tail
   ```
4. Pastikan callback URL publicly accessible (bukan localhost)

---

### Issue: Transaction tidak update setelah payment

**Solution:**
1. Manually check transaction status:
   ```bash
   # Query transaction table
   # Check status field
   ```
2. Call check-duitku-transaction Edge Function manually
3. Check Duitku dashboard untuk transaction status

---

### Issue: WhatsApp notification tidak terkirim

**Solution:**
```bash
# Check FONNTE_TOKEN ada di Supabase secrets
supabase secrets list

# Set jika belum:
supabase secrets set FONNTE_TOKEN=your_token

# Check Edge Function logs
supabase functions logs duitku-callback | grep -i "whatsapp"
```

---

## 📊 Monitoring

### Check Edge Function Logs:
```bash
# Real-time logs
supabase functions logs create-duitku-transaction --tail
supabase functions logs duitku-callback --tail  
supabase functions logs check-duitku-transaction --tail

# Last 100 lines
supabase functions logs duitku-callback --limit 100
```

### Check Transactions in Database:
```sql
-- Via Supabase SQL Editor
SELECT * FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Check pending transactions
SELECT * FROM transactions 
WHERE status = 'pending'
AND created_at > now() - interval '24 hours';
```

---

## 🌐 Production Deployment

### Before Going Live:

1. **Get Production Credentials from Duitku**
   - Login ke production dashboard
   - Get merchant code & API key

2. **Update Environment Variables:**
   ```bash
   # Update Supabase secrets
   supabase secrets set DUITKU_MERCHANT_CODE=prod_merchant_code
   supabase secrets set DUITKU_API_KEY=prod_api_key
   supabase secrets set DUITKU_SANDBOX=false
   ```

3. **Update Frontend .env:**
   ```env
   VITE_DUITKU_SANDBOX=false
   ```

4. **Rebuild Frontend:**
   ```bash
   npm run build
   ```

5. **Update Callback URL** di Duitku production dashboard

6. **Test dengan Real Payment** (small amount)

---

## 📝 Environment Variables Reference

### Frontend (`.env`):
```env
# Duitku
VITE_DUITKU_MERCHANT_CODE=your_merchant_code
VITE_DUITKU_API_KEY=your_api_key
VITE_DUITKU_SANDBOX=true  # false for production
```

### Supabase Secrets:
```
DUITKU_MERCHANT_CODE     # Merchant code from Duitku
DUITKU_API_KEY          # API key from Duitku  
DUITKU_SANDBOX          # true/false
FONNTE_TOKEN            # WhatsApp API token (optional)
```

---

## ✅ Verification Checklist

Setelah setup, verify:

- [ ] Edge Functions deployed successfully
- [ ] Database migration applied
- [ ] Environment variables set correctly  
- [ ] Callback URL configured di Duitku
- [ ] Payment methods showing di UI
- [ ] Transaction creation works
- [ ] Payment status page loads
- [ ] Callback receiving notifications
- [ ] Campaign amount updates after payment
- [ ] Donation records created
- [ ] WhatsApp notifications sent (if configured)

---

## 🆘 Get Help

**Check Documentation:**
- `/docs/DUITKU_IMPLEMENTATION.md` - Full implementation details
- `/docs/DUITKU_IMPLEMENTATION_SUMMARY.md` - What's been implemented

**Check Logs:**
```bash
# Edge Functions
supabase functions logs [function-name]

# Database
# Via Supabase Dashboard → Database → Logs
```

** Duitku Support:**
- Email: support@duitku.com
- Docs: https://docs.duitku.com/

---

## 🎉 Success!

Jika semua checklist ✅, payment gateway sudah ready!

**Next Steps:**
1. Integrate payment flow ke DonationForm
2. Test thoroughly di sandbox
3. Monitor first transactions
4. Switch to production when ready

---

**Setup Time:** ~15 minutes  
**Difficulty:** ⭐⭐⭐ (Medium)  
**Last Updated:** 18 Desember 2025
