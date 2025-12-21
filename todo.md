# TODO - Donasiku Project

**Tanggal:** 18 Desember 2025  
**Status:** Development

---

## 🔴 PRIORITAS TINGGI

### 1. Integrasi Payment Gateway (Duitku)
**Status:** ✅ **95% COMPLETE - Ready for Testing**  
**Deskripsi:** Implementasi Duitku payment gateway sudah lengkap dengan UI intuitive.

**✅ Yang Sudah Selesai:**
- [x] Database schema `transactions` table
- [x] Edge Function `create-duitku-transaction` - Membuat transaksi baru
- [x] Edge Function `duitku-callback` - Handle callback dari Duitku
- [x] Edge Function `check-duitku-transaction` - Check status transaksi
- [x] Component `PaymentMethodSelector` - Dynamic payment method selection dengan UI cantik
- [x] Page `PaymentStatusPage` - Status pembayaran dengan real-time checking
- [x] Routing untuk `/payment/status`
- [x] MD5 signature validation
- [x] SHA256 signature untuk payment methods
- [x] RLS policies untuk transactions
- [x] WhatsApp notification integration (via Fonnte)
- [x] Campaign amount auto-update after payment
- [x] Donation record creation
- [x] Support semua payment methods (VA, QRIS, E-Wallet, Credit Card, etc.)
- [x] Comprehensive documentation & setup guide

**⬜ Yang Perlu Dilakukan:**
- [ ] Integration ke `DonationForm.tsx` (add payment method selection step)
- [ ] Deploy database migration ke Supabase
- [ ] Deploy Edge Functions ke Supabase
- [ ] Set environment variables (Duitku credentials)
- [ ] Configure callback URL di Duitku dashboard
- [ ] Test end-to-end di sandbox environment
- [ ] Production deployment & monitoring

**Dokumentasi:**
- `/docs/DUITKU_IMPLEMENTATION.md` - Technical specs & API details
- `/docs/DUITKU_IMPLEMENTATION_SUMMARY.md` - What's been implemented
- `/docs/DUITKU_SETUP_GUIDE.md` - Quick start setup guide

---

### 2. Cloudflare Turnstile Integration
**Status:** Disabled untuk Development  
**Deskripsi:** Turnstile sudah diimplementasi tapi di-disable untuk localhost development.

**Yang Perlu Dilakukan:**
- [ ] Verifikasi environment variable `VITE_TURNSTILE_DISABLED` sudah di set dengan benar
- [ ] Pastikan Turnstile widget muncul di production (bukan localhost)
- [ ] Test Turnstile di Login page
- [ ] Test Turnstile di Register page  
- [ ] Test Turnstile di Redeem Voucher modal (Billing page)
- [ ] Verifikasi Content Security Policy (CSP) untuk Turnstile domain

**File Terkait:**
- `/src/pages/LoginPage.tsx`
- `/src/pages/BillingPage.tsx`
- Environment: `VITE_TURNSTILE_SITE_KEY`, `VITE_TURNSTILE_DISABLED`

---

### 3. Storage Integration (S3/R2)
**Status:** Partial Implementation  
**Deskripsi:** Ada dokumentasi untuk R2 setup tetapi perlu verifikasi implementasi backend API.

**Yang Perlu Dilakukan:**
- [ ] **PILIH STORAGE OPTION:**
  - Option A: Tetap pakai Supabase Storage (simple, terintegrasi)
  - Option B: Migrasi ke Cloudflare R2 (cheaper, no egress fee)
  - Option C: AWS S3 compatible storage
- [ ] Jika pilih Supabase: Verifikasi RLS policy sudah benar
- [ ] Jika pilih R2/S3: Implement backend API endpoint `/api/upload-r2` atau `/api/upload-s3`
- [ ] Update `AddNewCampaignPage.tsx` dan `EditCampaignPage.tsx` untuk gunakan upload method yang dipilih
- [ ] Test upload gambar campaign
- [ ] Test upload logo di Settings
- [ ] Implement lazy loading / optimization untuk gambar

**File Terkait:**
- `/docs/R2_SETUP.md`
- `/docs/S3_SETUP.md`
- `/src/pages/AddNewCampaignPage.tsx`
- `/src/pages/EditCampaignPage.tsx`
- `/src/pages/SettingsPage.tsx`
- `/src/utils/s3Storage.ts`

---

### 4. Database Schema & RLS Policies
**Status:** Need Review & Fix  
**Deskripsi:** Ada multiple migration files, perlu verifikasi consistency dan RLS policies.

**Yang Perlu Dilakukan:**
- [ ] Audit semua migration files untuk duplicate/conflict
- [ ] Verifikasi RLS policies untuk semua tables:
  - `campaigns` - Public read, auth insert/update
  - `categories` - Public read
  - `donations` - Public insert, restricted read
  - `testimonials` - Public read, auth insert
  - `app_settings` - Public read (selected fields), auth update
  - `layout_settings` - Public read, auth update
  - `zakat_settings` - Public read, auth update
  - `infaq_settings` - Public read, auth update
- [ ] Tambahkan missing tables untuk payment tracking:
  - `transactions` atau `payments` table
  - `payment_methods` table (untuk manage payment methods dengan sort_order)
- [ ] Tambahkan index untuk performance:
  - `campaigns(slug)` untuk fast lookup
  - `donations(campaign_id, status)` untuk aggregation
  - `transactions(invoice_code)` untuk invoice lookup
- [ ] Implement soft delete untuk campaigns (add `deleted_at` field)

**File Terkait:**
- `/supabase/migrations/*.sql` (semua 18 files)
- Perlu create: `/supabase/migrations/YYYYMMDD_create_transactions_table.sql`
- Perlu create: `/supabase/migrations/YYYYMMDD_create_payment_methods_table.sql`

---

## 🟡 PRIORITAS SEDANG

### 5. Admin Dashboard Features
**Status:** Partially Implemented  
**Deskripsi:** Dashboard sudah ada tapi masih mock data, perlu connect ke real data.

**Yang Perlu Dilakukan:**
- [ ] Connect `DashboardPage.tsx` ke real data dari Supabase
- [ ] Connect `DonasiDashboardPage.tsx` ke real campaign & donation data
- [ ] Implement Finance page dengan transaction history
- [ ] Implement "Kelola Pesanan" dengan filter service vs top-up
- [ ] Make order numbers clickable → open detail modal
- [ ] Add export functionality (Excel/PDF) untuk financial reports
- [ ] Real-time updates menggunakan Supabase realtime subscriptions

**File Terkait:**
- `/src/pages/DashboardPage.tsx`
- `/src/pages/DonasiDashboardPage.tsx`
- `/src/pages/BillingPage.tsx`
- Perlu create: `/src/pages/FinancePage.tsx`

---

### 6. Campaign Management
**Status:** Functional but Need Enhancement

**Yang Perlu Dilakukan:**
- [ ] Implement campaign draft/publish workflow
- [ ] Add campaign activation/deactivation
- [ ] Add campaign analytics (views, donations, conversion rate)
- [ ] Implement campaign categories management
- [ ] Add campaign search & advanced filtering
- [ ] Implement campaign duplication feature
- [ ] Add campaign end date automation (auto-close when reached)
- [ ] Add campaign progress notifications (50%, 75%, 100% of target)

**File Terkait:**
- `/src/pages/CampaignsPage.tsx`
- `/src/pages/AddNewCampaignPage.tsx`
- `/src/pages/EditCampaignPage.tsx`

---

### 7. User Authentication & Profile
**Status:** Basic OTP Login Only

**Yang Perlu Dilakukan:**
- [ ] Implement user profile page
- [ ] Add user profile picture upload
- [ ] Implement user donation history
- [ ] Add user settings/preferences
- [ ] Implement email preferences (notification settings)
- [ ] Add social login (Google, Facebook) sebagai alternatif OTP
- [ ] Implement forgot password / account recovery
- [ ] Add user roles & permissions (admin, user, moderator)

**File Terkait:**
- `/src/pages/LoginPage.tsx`
- `/src/pages/OTPVerificationPage.tsx`
- `/src/components/ProtectedRoute.tsx`
- Perlu create: `/src/pages/ProfilePage.tsx`
- Perlu create: `/src/pages/RegisterPage.tsx` (belum ada!)

---

### 8. Notification System
**Status:** ✅ WhatsApp Ready - Email Pending

**✅ Yang Sudah Selesai:**
- [x] Fonnte WhatsApp API integration
- [x] Environment variable configuration (`FONNTE_TOKEN`)
- [x] Automatic setup script (`scripts/setup-fonnte.sh`)
- [x] Comprehensive documentation (`docs/FONNTE_CONFIGURATION.md`, `docs/FONNTE_QUICKSTART.md`)
- [x] WhatsApp notification di `check-duitku-transaction` Edge Function
- [x] WhatsApp notification di `duitku-callback` Edge Function
- [x] Template customization di Settings page
- [x] Variable replacement: `{name}`, `{amount}`, `{campaign}`
- [x] Phone number auto-formatting (0xxx → 62xxx)

**⬜ Yang Perlu Dilakukan:**
- [ ] Deploy Edge Functions dengan FONNTE_TOKEN secret
- [ ] Test notification templates untuk:
  - Donation success ✅ (sudah ada)
  - Top-up success (perlu tambah)
  - Campaign milestone reached (perlu tambah)
  - Campaign ending soon (perlu tambah)
- [ ] Implement email notifications:
  - Setup SMTP di Settings
  - Email templates
  - Email sending queue
- [ ] Implement in-app notifications
- [ ] Add notification preferences per user
- [ ] Implement notification history/log

**File Terkait:**
- `/src/pages/SettingsPage.tsx` (WhatsApp & Email settings)
- `/supabase/functions/check-duitku-transaction/index.ts` (WhatsApp integration)
- `/supabase/functions/duitku-callback/index.ts` (WhatsApp integration)
- `/scripts/setup-fonnte.sh` (Setup automation)
- `/docs/FONNTE_CONFIGURATION.md` (Full documentation)
- `/docs/FONNTE_QUICKSTART.md` (Quick start guide)
- Environment: `FONNTE_TOKEN`

---

### 9. Analytics & Reporting
**Status:** Page Exists but Incomplete

**Yang Perlu Dilakukan:**
- [ ] Implement real analytics dashboard di `AnalyticsPage.tsx`
- [ ] Add charts/graphs:
  - Donation trends (daily, weekly, monthly)
  - Top campaigns
  - Payment method distribution
  - Donation amount distribution
- [ ] Implement export reports
- [ ] Add date range filtering
- [ ] Add campaign performance metrics
- [ ] Implement donor demographics analytics

**File Terkait:**
- `/src/pages/AnalyticsPage.tsx`
- Consider: Install charting library (recharts, chart.js, atau visx)

---

## 🟢 PRIORITAS RENDAH (Enhancement)

### 10. UI/UX Improvements

**Yang Perlu Dilakukan:**
- [ ] Add loading states & skeleton screens
- [ ] Implement error boundaries
- [ ] Add empty states dengan ilustrasi
- [ ] Improve mobile responsiveness
- [ ] Add dark mode support (jika diinginkan)
- [ ] Implement infinite scroll untuk campaign list
- [ ] Add image lazy loading
- [ ] Improve accessibility (ARIA labels, keyboard navigation)
- [ ] Add animation & micro-interactions

---

### 11. SEO & Performance

**Yang Perlu Dilakukan:**
- [ ] Implement meta tags per page (title, description, OG tags)
- [ ] Add sitemap.xml generation
- [ ] Implement robots.txt
- [ ] Add structured data (JSON-LD) untuk campaigns
- [ ] Optimize images (WebP format, responsive images)
- [ ] Implement code splitting
- [ ] Add service worker untuk PWA
- [ ] Setup CDN untuk static assets
- [ ] Implement caching strategy

---

### 12. Testing

**Yang Perlu Dilakukan:**
- [ ] Setup unit testing framework (Vitest)
- [ ] Add unit tests untuk utils functions
- [ ] Add component tests (React Testing Library)
- [ ] Add E2E tests (Playwright atau Cypress)
- [ ] Test coverage untuk critical paths:
  - Authentication flow
  - Donation flow
  - Payment flow
  - Campaign CRUD
- [ ] Setup CI/CD dengan automated tests

---

### 13. Documentation

**Yang Perlu Dilakukan:**
- [ ] Create comprehensive README.md dengan:
  - Setup instructions
  - Environment variables documentation
  - Development workflow
  - Deployment guide
- [ ] Document API endpoints
- [ ] Document database schema
- [ ] Create user guide/manual
- [ ] Create admin guide
- [ ] Document payment integration flow
- [ ] Create troubleshooting guide

---

### 14. Security

**Yang Perlu Dilakukan:**
- [ ] Audit all API endpoints untuk authorization
- [ ] Implement rate limiting (especially untuk OTP)
- [ ] Add CSRF protection
- [ ] Implement input validation & sanitization
- [ ] Add SQL injection protection (verify Supabase RLS)
- [ ] Implement Content Security Policy (CSP)
- [ ] Add security headers
- [ ] Implement audit logging untuk sensitive actions
- [ ] Regular dependency updates & security patches
- [ ] Penetration testing

---

### 15. Fundraising Features

**Status:** Page Exists but Empty

**Yang Perlu Dilakukan:**
- [ ] Implement fundraising campaign creation
- [ ] Add peer-to-peer fundraising
- [ ] Implement fundraiser leaderboard
- [ ] Add social sharing untuk fundraising campaigns
- [ ] Implement fundraising templates
- [ ] Add fundraising progress tracking

**File Terkait:**
- `/src/pages/FundraisingPage.tsx`

---

## 📝 BUGS & ISSUES (Dari Conversation History)

### Known Issues:
1. ✅ **FIXED:** Turnstile verification blocking localhost development
   - Status: Fixed by adding `VITE_TURNSTILE_DISABLED` env var
   
2. ✅ **FIXED:** Payment methods not showing in Top Up Balance modal
   - Status: Need verification
   
3. ✅ **FIXED:** Spacing issues di Login/Register forms
   - Status: Need verification

4. **OPEN:** Content Security Policy warnings untuk Turnstile
   - Need to add proper CSP headers

5. **OPEN:** Duitku callback handling & polling mechanism
   - Need end-to-end testing

6. **OPEN:** WhatsApp notification reliability
   - Need production testing

---

## 🚀 DEPLOYMENT CHECKLIST

**Pre-Deployment:**
- [ ] All environment variables documented dan di-set
- [ ] Database migrations executed
- [ ] RLS policies tested
- [ ] Payment gateway tested di sandbox
- [ ] Email/WhatsApp notifications tested
- [ ] Storage (S3/R2) configured properly
- [ ] Domain & SSL configured
- [ ] Analytics setup (Google Analytics, etc)

**Deployment:**
- [ ] Build production bundle (`npm run build`)
- [ ] Deploy frontend (Vercel/Netlify/Cloudflare Pages)
- [ ] Deploy Supabase Edge Functions
- [ ] Setup Supabase production project
- [ ] Run database migrations
- [ ] Verify all integrations working
- [ ] Setup monitoring & error tracking (Sentry)
- [ ] Setup uptime monitoring

**Post-Deployment:**
- [ ] Test all critical flows in production
- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Setup backup & disaster recovery
- [ ] Create rollback plan

---

## 📋 TECHNICAL DEBT

1. **BillingPage.tsx menggunakan mock data** - needs real Supabase integration
2. **DashboardPage.tsx menggunakan mock data** - needs real analytics
3. **No proper error handling** di banyak komponen
4. **No loading states** untuk async operations
5. **No TypeScript strict mode** - consider enable strict mode
6. **Mixed naming conventions** (Indonesia & English) - perlu standardisasi
7. **No comprehensive logging** - add proper logging system
8. **No API response caching** - consider implementing React Query
9. **Duplicate migration concerns** - need migration cleanup
10. **No form validation library** - consider react-hook-form + zod

---

## 🎯 ROADMAP

### Phase 1 (Q1 2025) - MVP
- ✅ Basic campaign management
- ✅ Basic donation form
- ✅ Zakat & Infaq pages
- 🟡 Payment integration (In Progress)
- 🟡 Admin dashboard (In Progress)
- ⬜ WhatsApp notifications
- ⬜ Production deployment

### Phase 2 (Q2 2025) - Enhancement
- ⬜ Email notifications
- ⬜ Advanced analytics
- ⬜ Fundraising features
- ⬜ Social login
- ⬜ Mobile app (React Native)

### Phase 3 (Q3-Q4 2025) - Scale
- ⬜ Multi-language support
- ⬜ Advanced reporting
- ⬜ API for third-party integrations
- ⬜ White-label solution
- ⬜ Enterprise features

---

## 📞 SUPPORT & RESOURCES

**Environment Variables yang Dibutuhkan:**
```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Cloudflare Turnstile
VITE_TURNSTILE_SITE_KEY=
VITE_TURNSTILE_DISABLED=true  # Set false di production

# Storage (pilih salah satu)
# Option 1: Cloudflare R2
VITE_R2_ACCOUNT_ID=
VITE_R2_ACCESS_KEY_ID=
VITE_R2_SECRET_ACCESS_KEY=
VITE_R2_BUCKET_NAME=
VITE_R2_PUBLIC_URL=
VITE_R2_API_ENDPOINT=

# Option 2: AWS S3
VITE_S3_ENDPOINT=
VITE_S3_REGION=
VITE_S3_BUCKET=
VITE_S3_ACCESS_KEY_ID=
VITE_S3_SECRET_ACCESS_KEY=
VITE_S3_PUBLIC_URL=
VITE_S3_API_ENDPOINT=

# Payment Gateway (Duitku)
DUITKU_API_KEY=
DUITKU_MERCHANT_CODE=

# WhatsApp (Fonnte)
FONNTE_TOKEN=
```

**Useful Documentation:**
- Supabase Docs: https://supabase.com/docs
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Duitku API: https://docs.duitku.com/
- Cloudflare Turnstile: https://developers.cloudflare.com/turnstile/

---

**Last Updated:** 18 Desember 2025  
**Maintainer:** [Your Name]  
**Project Status:** 🟡 Active Development
