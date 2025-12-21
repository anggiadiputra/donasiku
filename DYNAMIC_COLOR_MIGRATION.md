# Panduan Implementasi Warna Dinamis

## Status Implementasi

Proyek ini sedang dalam proses migrasi dari hardcoded colors ke dynamic theming menggunakan `usePrimaryColor` hook.

## File yang Sudah Diupdate

### ✅ Partially Updated
1. **InfaqPage.tsx** - Header dan title sudah menggunakan primaryColor
2. **CampaignPage.tsx** - Sudah menggunakan usePrimaryColor

### ⏳ Perlu Diupdate

#### Priority 1 - User-Facing Pages
- [ ] **InfaqPage.tsx** - Masih ada warna hardcoded di:
  - Line 194: `focus:border-orange-500` → Perlu diganti dengan inline style
  - Line 204: `bg-orange-500` pada button preset → Perlu diganti
  - Line 237: `text-orange-500` pada link → Perlu diganti
  - Line 270: `text-orange-500` pada link → Perlu diganti
  - Line 282: `bg-orange-100`, `text-orange-600` pada avatar → Perlu diganti
  - Line 293: `text-orange-600` pada amount → Perlu diganti
  - Line 302: `text-orange-500` pada button → Perlu diganti
  - Line 360: `text-orange-500` pada button → Perlu diganti
  - Line 368: `bg-orange-500` pada bottom nav → Perlu diganti
  - Line 371, 375, 378: `hover:bg-orange-600` → Perlu diganti
  - Line 389: `text-orange-500`, `hover:bg-orange-50` → Perlu diganti

- [ ] **ZakatPage.tsx** - Semua `bg-orange-500`, `text-orange-*`, `hover:bg-orange-*`
- [ ] **DonationForm.tsx** - Semua `bg-blue-700`, `hover:bg-blue-800`
- [ ] **PaymentStatusPage.tsx** - Semua `bg-orange-500`, `bg-blue-600`

#### Priority 2 - Components
- [ ] **Header.tsx** - `bg-blue-700`
- [ ] **CategoryNav.tsx** - `bg-pink-500`
- [ ] **PaymentMethodModal.tsx** - `bg-blue-600`
- [ ] **CampaignDetail.tsx** - `bg-pink-600`, `bg-blue-700`
- [ ] **DonationStats.tsx** - `bg-blue-700`
- [ ] **CampaignList.tsx** - `bg-orange-500`

#### Priority 3 - Admin Pages
- [ ] **AddNewCampaignPage.tsx** - `bg-purple-600`, `bg-orange-500`
- [ ] **InfaqSettingsPage.tsx** - `bg-orange-500`
- [ ] **ZakatSettingsPage.tsx** - `bg-orange-500`
- [ ] **BillingPage.tsx** - `bg-orange-500`
- [ ] **FundraisingPage.tsx** - `bg-orange-500`
- [ ] **AnalyticsPage.tsx** - `bg-orange-500`
- [ ] **InvoicePage.tsx** - `bg-blue-700`
- [ ] **DonationDashboard.tsx** - `bg-blue-600`
- [ ] **DashboardLayout.tsx** - `bg-orange-500`

## Cara Implementasi

### 1. Import Hook dan Utilities
```typescript
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { getHoverColor, addAlpha } from '../utils/colorUtils';
```

### 2. Gunakan di Component
```typescript
export default function MyComponent() {
  const primaryColor = usePrimaryColor();
  const hoverColor = getHoverColor(primaryColor);
  
  // ...
}
```

### 3. Replace Hardcoded Colors

#### Untuk Background
```typescript
// BEFORE
<div className="bg-orange-500">

// AFTER
<div style={{ backgroundColor: primaryColor }}>
```

#### Untuk Text
```typescript
// BEFORE
<span className="text-orange-500">

// AFTER
<span style={{ color: primaryColor }}>
```

#### Untuk Hover States
```typescript
// BEFORE
<button className="bg-orange-500 hover:bg-orange-600">

// AFTER
<button 
  style={{ backgroundColor: primaryColor }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverColor}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = primaryColor}
>
```

#### Untuk Border
```typescript
// BEFORE
<input className="border-orange-500">

// AFTER
<input style={{ borderColor: primaryColor }}>
```

#### Untuk Focus States
```typescript
// BEFORE
<input className="focus:border-orange-500">

// AFTER
<input 
  style={{ borderColor: primaryColor }}
  onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
>
```

## Utilities Tersedia

### `colorUtils.ts`
- `darkenColor(color, percent)` - Gelap kan warna
- `lightenColor(color, percent)` - Terangkan warna
- `addAlpha(color, opacity)` - Tambah transparansi
- `getHoverColor(color)` - Dapatkan warna hover (15% lebih gelap)
- `getFocusRingColor(color)` - Dapatkan warna focus ring (30% opacity)

## Catatan Penting

1. **Jangan gunakan Tailwind color classes** untuk primary color
2. **Gunakan inline styles** untuk dynamic colors
3. **Gunakan onMouseEnter/onMouseLeave** untuk hover effects
4. **Test di Settings page** untuk memastikan warna berubah
5. **Status colors (red, green, yellow)** boleh tetap hardcoded karena semantic

## Testing

Setelah update, test dengan:
1. Buka Settings page
2. Ubah Primary Color
3. Navigate ke halaman yang diupdate
4. Pastikan semua warna berubah sesuai setting

## Progress Tracking

### ✅ Completed Files (100% migrated)
1. **InfaqPage.tsx** - All orange colors → primaryColor ✓
2. **CampaignPage.tsx** - Already using usePrimaryColor ✓

### 🔄 Partially Completed
1. **ZakatPage.tsx** - Imports added, needs UI updates

### ⏳ Pending Files (Priority Order)

#### High Priority - User Facing
- [ ] **ZakatPage.tsx** - ~15 instances (header, buttons, toggles, inputs)
- [ ] **DonationForm.tsx** - ~5 instances (bg-blue-700, hover states)
- [ ] **PaymentStatusPage.tsx** - ~6 instances (buttons, status indicators)
- [ ] **BillingPage.tsx** - ~3 instances
- [ ] **InvoicePage.tsx** - ~2 instances

#### Medium Priority - Components  
- [ ] **Header.tsx** - 1 instance (bg-blue-700)
- [ ] **CategoryNav.tsx** - 1 instance (bg-pink-500)
- [ ] **PaymentMethodModal.tsx** - 1 instance (bg-blue-600)
- [ ] **CampaignDetail.tsx** - ~5 instances
- [ ] **DonationStats.tsx** - 1 instance
- [ ] **CampaignList.tsx** - 1 instance
- [ ] **ImageUpload.tsx** - 1 instance (delete button - keep red)

#### Low Priority - Admin Pages
- [ ] **AddNewCampaignPage.tsx** - ~4 instances (bg-purple-600, bg-orange-500)
- [ ] **EditCampaignPage.tsx** - Similar to AddNew
- [ ] **InfaqSettingsPage.tsx** - ~2 instances
- [ ] **ZakatSettingsPage.tsx** - ~2 instances
- [ ] **FundraisingPage.tsx** - ~3 instances
- [ ] **AnalyticsPage.tsx** - ~3 instances
- [ ] **DonationDashboard.tsx** - ~3 instances
- [ ] **DonasiDashboardPage.tsx** - Already using skeleton, check for hardcoded colors
- [ ] **DashboardLayout.tsx** - ~1 instance

### 📊 Statistics
- **Total files to migrate:** ~30 files
- **Files completed:** 2 files (6.7%)
- **Files in progress:** 1 file (3.3%)
- **Remaining:** 27 files (90%)
- **Estimated total instances:** ~80-100 color references

### 🛠️ Tools Available
1. **migrate-colors.sh** - Bash script to analyze files
   ```bash
   ./migrate-colors.sh src/pages/ZakatPage.tsx
   ```

2. **colorUtils.ts** - Helper functions for color manipulation

3. **usePrimaryColor** - Hook to get current primary color from settings

## Quick Start Guide

### For Each File:

1. **Run analysis:**
   ```bash
   ./migrate-colors.sh src/pages/YourFile.tsx
   ```

2. **Add imports:**
   ```typescript
   import { usePrimaryColor } from '../hooks/usePrimaryColor';
   import { getHoverColor, addAlpha } from '../utils/colorUtils';
   ```

3. **Add hooks:**
   ```typescript
   const primaryColor = usePrimaryColor();
   const hoverColor = getHoverColor(primaryColor);
   ```

4. **Replace colors** using patterns in the main documentation

5. **Test** by changing color in Settings page

## Notes
- Status colors (green, red, yellow) should remain hardcoded (semantic meaning)
- Focus on user-facing pages first
- Test each file after migration
- Commit after each successful file migration

Total estimated time: 4-6 hours for complete migration
