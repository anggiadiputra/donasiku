/**
 * S3 Compatible Storage Utility
 * 
 * Supports various S3-compatible storage providers:
 * - AWS S3
 * - Cloudflare R2
 * - DigitalOcean Spaces
 * - Backblaze B2
 * - MinIO
 * - Other S3-compatible services
 * 
 * Configuration via environment variables:
 * - VITE_S3_ENDPOINT: S3 endpoint URL (e.g., https://s3.amazonaws.com, https://xxx.r2.cloudflarestorage.com)
 * - VITE_S3_REGION: AWS region (e.g., us-east-1, auto)
 * - VITE_S3_BUCKET: Bucket name
 * - VITE_S3_ACCESS_KEY_ID: Access key ID
 * - VITE_S3_SECRET_ACCESS_KEY: Secret access key
 * - VITE_S3_PUBLIC_URL: Public URL base (e.g., https://cdn.example.com, https://bucket.s3.amazonaws.com)
 * - VITE_S3_API_ENDPOINT: Backend API endpoint for upload (recommended for production)
 */

interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}

/**
 * Get S3 configuration from environment variables
 */
const getS3Config = (): S3Config | null => {
  const endpoint = import.meta.env.VITE_S3_ENDPOINT;
  const region = import.meta.env.VITE_S3_REGION || 'auto';
  const bucket = import.meta.env.VITE_S3_BUCKET;
  const accessKeyId = import.meta.env.VITE_S3_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.VITE_S3_SECRET_ACCESS_KEY;
  const publicUrl = import.meta.env.VITE_S3_PUBLIC_URL;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    console.warn('S3 configuration is incomplete. Please check your environment variables.');
    return null;
  }

  return {
    endpoint: endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicUrl: publicUrl || `${endpoint}/${bucket}`,
  };
};

/**
 * Generate S3 signature for direct upload (client-side)
 * This is a simplified version - for production, use backend API
 */
const generateS3Signature = (
  method: string,
  path: string,
  contentType: string,
  date: string,
  config: S3Config
): string => {
  // This is a placeholder - actual S3 signature requires AWS Signature V4
  // For production, use backend API or AWS SDK
  return '';
};

/**
 * Upload file to S3-compatible storage via backend API
 * This is the recommended approach for production
 * 
 * @param file File to upload
 * @param folder Folder path in bucket (e.g., 'campaigns', 'images')
 * @param apiEndpoint Optional backend API endpoint (defaults to VITE_S3_API_ENDPOINT)
 * @returns Public URL of uploaded file or null if failed
 */
// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Upload file to S3-compatible storage via backend API
 * This is the recommended approach for production
 */
export const uploadToS3ViaAPI = async (
  file: File,
  folder: string = 'campaigns',
  apiEndpoint?: string
): Promise<string | null> => {
  try {
    const endpoint = apiEndpoint || import.meta.env.VITE_S3_API_ENDPOINT;

    if (!endpoint) {
      console.warn('S3 API endpoint not configured. Skipping S3 upload.');
      return null;
    }

    // Validate endpoint
    if (
      endpoint.includes('.s3.') ||
      endpoint.includes('s3.') ||
      endpoint.includes('r2.cloudflarestorage.com') ||
      endpoint.includes('cloudflarestorage.com') ||
      endpoint.includes('digitaloceanspaces.com') ||
      endpoint.includes('backblazeb2.com') ||
      endpoint.includes('nevaobjects.id')
    ) {
      console.error('❌ CONFIGURATION ERROR: Invalid VITE_S3_API_ENDPOINT.');
      throw new Error('Konfigurasi VITE_S3_API_ENDPOINT salah. Harusnya URL Edge Function, bukan URL S3 langsung.');
    }

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.error('Missing VITE_SUPABASE_ANON_KEY');
    }

    // Convert file to Base64
    const base64Content = await fileToBase64(file);

    // Generate filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        fileName: fileName,
        fileContent: base64Content,
        contentType: file.type
      }),
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
    console.error('Error uploading to S3 via API:', error);
    return null;
  }
};

/**
 * Upload file directly to S3-compatible storage
 * 
 * WARNING: This requires exposing credentials in client-side code.
 * Only use this for development or if you have a public bucket with limited permissions.
 * For production, use uploadToS3ViaAPI with a backend endpoint.
 * 
 * @param file File to upload
 * @param folder Folder path in bucket
 * @returns Public URL of uploaded file or null if failed
 */
export const uploadToS3Direct = async (
  file: File,
  folder: string = 'campaigns'
): Promise<string | null> => {
  const config = getS3Config();

  if (!config) {
    console.error('S3 configuration not found');
    return null;
  }

  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const objectKey = fileName;

    // Construct S3 URL
    const s3Url = `${config.endpoint}/${config.bucket}/${objectKey}`;

    // For direct upload, we need to use presigned URL or backend API
    // This is a placeholder - actual implementation requires AWS SDK or backend
    console.warn('Direct S3 upload requires AWS SDK or backend API. Use uploadToS3ViaAPI instead.');
    return null;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return null;
  }
};

/**
 * Main upload function - tries S3 API first, then falls back
 * 
 * @param file File to upload
 * @param folder Folder path in bucket
 * @param existingUrl The current URL (if any) to be replaced and deleted from S3
 * @returns Public URL of uploaded file or existingUrl if upload fails
 */
export const uploadToS3 = async (
  file: File,
  folder: string = 'campaigns',
  existingUrl?: string | null
): Promise<string | null> => {
  // Try S3 API endpoint first (recommended)
  const s3ApiEndpoint = import.meta.env.VITE_S3_API_ENDPOINT;

  if (s3ApiEndpoint && s3ApiEndpoint.trim() !== '') {
    const s3Url = await uploadToS3ViaAPI(file, folder);
    if (s3Url) {
      // SUCCESS! Now delete the old file if it exists and looks like an S3 URL
      if (existingUrl) {
        console.log('[S3] New upload successful, deleting old file:', existingUrl);
        await deleteFromS3(existingUrl);
      }
      return s3Url;
    }
  }

  // If no API endpoint, try direct upload (not recommended)
  const s3Config = getS3Config();
  if (s3Config) {
    const directUrl = await uploadToS3Direct(file, folder);
    if (directUrl) {
      // SUCCESS!
      if (existingUrl) {
        await deleteFromS3(existingUrl);
      }
      return directUrl;
    }
  }

  // Return existing URL as fallback if upload fails
  return existingUrl || null;
};


/**
 * Delete file from S3-compatible storage via backend API
 * 
 * @param fileUrl Full public URL of the file to delete
 * @returns boolean indicating success
 */
export const deleteFromS3 = async (fileUrl: string): Promise<boolean> => {
  if (!fileUrl || !fileUrl.startsWith('http')) return false;

  try {
    const endpoint = import.meta.env.VITE_S3_API_ENDPOINT;
    if (!endpoint) return false;

    const publicUrlBase = import.meta.env.VITE_S3_PUBLIC_URL;
    const s3Bucket = import.meta.env.VITE_S3_BUCKET;
    const s3Endpoint = import.meta.env.VITE_S3_ENDPOINT;

    let fileName = '';

    // Extract fileName (key) from URL
    if (publicUrlBase && fileUrl.startsWith(publicUrlBase)) {
      fileName = fileUrl.replace(publicUrlBase, '').replace(/^\//, '');
    } else if (fileUrl.includes(s3Bucket) && (fileUrl.includes('amazonaws.com') || fileUrl.includes(s3Endpoint))) {
      // Try to extract from common S3 URL patterns
      // Pattern: https://bucket.s3.region.amazonaws.com/key
      // Pattern: https://endpoint/bucket/key
      const parts = fileUrl.split(s3Bucket + '/');
      if (parts.length > 1) {
        fileName = parts[1];
      }
    }

    if (!fileName) {
      console.warn('Could not extract S3 key from URL:', fileUrl);
      return false;
    }

    console.log('[S3] Requesting deletion for key:', fileName);

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        fileName,
        operation: 'delete'
      }),
    });

    if (!response.ok) {
      console.error('Failed to delete from S3:', await response.text());
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Error in deleteFromS3:', error);
    return false;
  }
};
