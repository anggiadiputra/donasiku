/**
 * Cloudflare R2 Storage Utility
 * 
 * R2 is S3-compatible, so we can use AWS SDK or direct fetch API
 * For simplicity, we'll use fetch API with presigned URLs or direct upload
 */

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string; // Your R2 public URL or custom domain
}

// Get R2 config from environment variables
const getR2Config = (): R2Config | null => {
  const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
  const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
  const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
  const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    console.warn('R2 configuration is incomplete. Please check your environment variables.');
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  };
};

/**
 * Upload file to Cloudflare R2 using S3-compatible API
 * 
 * Note: For production, you should upload via a backend API endpoint
 * to keep your credentials secure. This is a client-side implementation
 * that requires exposing credentials (not recommended for production).
 */
export const uploadToR2 = async (file: File, folder: string = 'campaigns'): Promise<string | null> => {
  const config = getR2Config();
  
  if (!config) {
    console.error('R2 configuration not found');
    return null;
  }

  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // For client-side upload, we need to use presigned URL from backend
    // OR use a backend API endpoint to handle the upload
    // This is a simplified version - in production, use backend API
    
    // Option 1: Use backend API endpoint (recommended)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch('/api/upload-r2', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload to R2');
    }

    const data = await response.json();
    return data.url;

    // Option 2: Direct upload using S3 API (requires exposing credentials - NOT RECOMMENDED)
    // This would require AWS SDK or manual S3 API calls
    // Better to use backend API for security

  } catch (error) {
    console.error('Error uploading to R2:', error);
    return null;
  }
};

/**
 * Alternative: Upload via backend API endpoint
 * This is the recommended approach for production
 * 
 * Note: This requires a backend API endpoint to handle the upload
 * to avoid CORS issues and keep credentials secure
 */
/**
 * Upload via backend API endpoint
 * This is the recommended approach for production
 * 
 * IMPORTANT: The API endpoint must be a backend server endpoint, NOT a direct R2 URL
 * Direct R2 URLs will cause CORS errors. You need to create a backend API that:
 * 1. Receives the file upload
 * 2. Uploads to R2 using server-side credentials
 * 3. Returns the public URL
 * 
 * Example backend endpoint: https://your-api.com/api/upload-r2
 * NOT: https://xxx.r2.cloudflarestorage.com/...
 */
export const uploadToR2ViaAPI = async (
  file: File, 
  folder: string = 'campaigns',
  apiEndpoint?: string
): Promise<string | null> => {
  try {
    // Get API endpoint from env or parameter
    const endpoint = apiEndpoint || import.meta.env.VITE_R2_API_ENDPOINT;
    
    if (!endpoint) {
      console.warn('R2 API endpoint not configured. Skipping R2 upload.');
      return null;
    }

    // Validate that endpoint is not a direct R2 URL (will cause CORS)
    if (endpoint.includes('r2.cloudflarestorage.com') || endpoint.includes('cloudflarestorage.com')) {
      console.error('Invalid R2 API endpoint. Must be a backend API, not direct R2 URL.');
      console.error('Please set VITE_R2_API_ENDPOINT to your backend API endpoint (e.g., /api/upload-r2)');
      console.error('Direct R2 URLs cause CORS errors. Use Supabase Storage or create a backend API.');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || 'Upload failed' };
      }
      throw new Error(errorData.message || `Failed to upload: ${response.status}`);
    }

    const data = await response.json();
    return data.url || data.publicUrl || data.public_url;
  } catch (error) {
    console.error('Error uploading to R2 via API:', error);
    // Return null to allow fallback to Supabase Storage
    return null;
  }
};

