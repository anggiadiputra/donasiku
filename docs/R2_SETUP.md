# Cloudflare R2 Storage Setup

## Overview
Cloudflare R2 adalah object storage yang kompatibel dengan S3 API dan tidak ada biaya egress. Ini adalah alternatif yang baik untuk menyimpan gambar campaign.

## Setup Cloudflare R2

### 1. Buat R2 Bucket di Cloudflare
1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Pilih "R2" dari menu
3. Klik "Create bucket"
4. Beri nama bucket (contoh: `donasiku-campaigns`)
5. Pilih lokasi (opsional)

### 2. Buat API Token
1. Di halaman R2, klik "Manage R2 API Tokens"
2. Klik "Create API Token"
3. Pilih permissions: "Object Read & Write"
4. Simpan `Access Key ID` dan `Secret Access Key`

### 3. Setup Public Access (Optional)
Jika ingin akses public langsung:
1. Di bucket settings, enable "Public Access"
2. Atau setup custom domain untuk bucket

### 4. Setup Backend API (Recommended)

Untuk keamanan, sebaiknya upload dilakukan melalui backend API. Buat endpoint di backend Anda:

#### Contoh Backend API (Node.js/Express)

```javascript
// routes/upload.js
const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

router.post('/upload-r2', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const folder = req.body.folder || 'campaigns';
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await r2Client.send(command);

    // Construct public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    
    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

module.exports = router;
```

#### Install Dependencies
```bash
npm install @aws-sdk/client-s3 multer
```

### 5. Environment Variables

Tambahkan ke `.env`:

```env
# Cloudflare R2 Configuration
VITE_R2_ACCOUNT_ID=your_r2_account_id
VITE_R2_ACCESS_KEY_ID=your_r2_access_key_id
VITE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
VITE_R2_BUCKET_NAME=donasiku-campaigns
VITE_R2_PUBLIC_URL=https://your-r2-public-url.com
VITE_R2_API_ENDPOINT=/api/upload-r2
```

## Alternatif: Direct Upload (Not Recommended)

Jika tidak ada backend API, Anda bisa menggunakan direct upload, tapi ini **TIDAK DISARANKAN** karena:
- Credentials akan ter-expose di client
- Security risk tinggi

Jika tetap ingin menggunakan direct upload, install AWS SDK:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Keuntungan Cloudflare R2

1. **No Egress Fees** - Tidak ada biaya untuk bandwidth
2. **S3 Compatible** - Bisa menggunakan AWS SDK
3. **Global CDN** - Akses cepat dari mana saja
4. **Cost Effective** - Harga lebih murah dibanding beberapa provider

## Migration dari Supabase Storage

Jika sudah menggunakan Supabase Storage dan ingin migrasi ke R2:
1. Setup R2 bucket dan API
2. Update environment variables
3. Migrate existing images (optional)
4. Update upload function di `AddNewCampaignPage.tsx`

