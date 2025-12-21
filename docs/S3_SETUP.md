# S3 Compatible Storage Setup

Dokumentasi ini menjelaskan cara mengkonfigurasi S3 compatible storage untuk upload gambar di aplikasi Donasiku.

## Provider yang Didukung

Utility ini mendukung berbagai provider S3-compatible:
- **AWS S3**
- **Cloudflare R2**
- **DigitalOcean Spaces**
- **Backblaze B2**
- **MinIO**
- **Provider S3-compatible lainnya**

## Konfigurasi Environment Variables

Tambahkan konfigurasi berikut ke file `.env`:

### Opsi 1: Via Backend API (Recommended untuk Production)

```env
# S3 Backend API Endpoint
# Backend API yang menangani upload ke S3
VITE_S3_API_ENDPOINT=https://your-api.com/api/upload-s3
```

**Keuntungan:**
- Credentials tidak ter-expose di client-side
- Lebih aman
- Bisa menambahkan validasi dan processing di backend

### Opsi 2: Direct Upload (Development Only)

```env
# S3 Configuration
VITE_S3_ENDPOINT=https://s3.amazonaws.com
# atau untuk Cloudflare R2:
# VITE_S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com

VITE_S3_REGION=us-east-1
# atau untuk Cloudflare R2:
# VITE_S3_REGION=auto

VITE_S3_BUCKET=your-bucket-name
VITE_S3_ACCESS_KEY_ID=your-access-key-id
VITE_S3_SECRET_ACCESS_KEY=your-secret-access-key

# Public URL untuk akses file yang di-upload
VITE_S3_PUBLIC_URL=https://cdn.example.com
# atau untuk AWS S3:
# VITE_S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
# atau untuk Cloudflare R2 dengan custom domain:
# VITE_S3_PUBLIC_URL=https://cdn.yourdomain.com
```

**Catatan:** Direct upload memerlukan credentials di client-side, yang tidak disarankan untuk production.

## Contoh Konfigurasi per Provider

### AWS S3

```env
VITE_S3_ENDPOINT=https://s3.amazonaws.com
VITE_S3_REGION=us-east-1
VITE_S3_BUCKET=donasiku-images
VITE_S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
VITE_S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
VITE_S3_PUBLIC_URL=https://donasiku-images.s3.amazonaws.com
```

### Cloudflare R2

```env
VITE_S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
VITE_S3_REGION=auto
VITE_S3_BUCKET=donasiku
VITE_S3_ACCESS_KEY_ID=your-r2-access-key
VITE_S3_SECRET_ACCESS_KEY=your-r2-secret-key
VITE_S3_PUBLIC_URL=https://cdn.yourdomain.com
# atau jika menggunakan R2 public URL:
# VITE_S3_PUBLIC_URL=https://pub-xxx.r2.dev
```

### DigitalOcean Spaces

```env
VITE_S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
VITE_S3_REGION=nyc3
VITE_S3_BUCKET=donasiku-images
VITE_S3_ACCESS_KEY_ID=your-spaces-key
VITE_S3_SECRET_ACCESS_KEY=your-spaces-secret
VITE_S3_PUBLIC_URL=https://donasiku-images.nyc3.digitaloceanspaces.com
```

## Setup Backend API (Recommended)

Untuk production, buat backend API endpoint yang menangani upload ke S3. Contoh menggunakan Node.js + Express:

```javascript
// server.js
const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const app = express();

const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload-s3', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const folder = req.body.folder || 'campaigns';
    
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // atau sesuai kebutuhan
    };

    const result = await s3.upload(params).promise();
    
    res.json({
      url: result.Location,
      publicUrl: process.env.S3_PUBLIC_URL 
        ? `${process.env.S3_PUBLIC_URL}/${fileName}`
        : result.Location,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## CORS Configuration

Jika menggunakan direct upload, pastikan bucket S3 dikonfigurasi dengan CORS yang benar:

### AWS S3 CORS Configuration

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:5174", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### Cloudflare R2 CORS Configuration

Di Cloudflare Dashboard, buka R2 bucket settings dan tambahkan CORS rules:

```
Allowed Origins: http://localhost:5174, https://yourdomain.com
Allowed Methods: GET, PUT, POST, DELETE, HEAD
Allowed Headers: *
Max Age: 3600
```

## Fallback ke Supabase Storage

Jika S3 tidak dikonfigurasi, aplikasi akan otomatis fallback ke Supabase Storage. Pastikan bucket `campaigns` sudah dibuat di Supabase Storage.

## Testing

1. Set environment variables di `.env`
2. Restart development server
3. Coba upload gambar di halaman "Add New Campaign"
4. Check console untuk melihat log upload
5. Verify gambar muncul dengan URL yang benar

## Troubleshooting

### Error: CORS policy blocked

**Solusi:** 
- Gunakan backend API endpoint (recommended)
- Atau konfigurasi CORS di bucket S3

### Error: Access Denied

**Solusi:**
- Pastikan credentials benar
- Pastikan bucket policy mengizinkan upload
- Untuk production, gunakan backend API

### Error: Invalid endpoint

**Solusi:**
- Pastikan endpoint URL benar (dengan https://)
- Pastikan tidak ada trailing slash di endpoint
- Untuk R2, gunakan format: `https://xxx.r2.cloudflarestorage.com`


