
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { fileName, fileContent, contentType } = await req.json();

        // Validate required parameters
        if (!fileName || !fileContent) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Missing required parameters: fileName and fileContent',
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                }
            );
        }

        // Get S3 config from environment variables
        // Support both S3_ACCESS_KEY (User preferred) and S3_ACCESS_KEY_ID (Standard)
        const s3AccessKey = Deno.env.get('S3_ACCESS_KEY') || Deno.env.get('S3_ACCESS_KEY_ID');
        const s3SecretKey = Deno.env.get('S3_SECRET_KEY') || Deno.env.get('S3_SECRET_ACCESS_KEY');
        const s3Endpoint = Deno.env.get('S3_ENDPOINT');
        const s3Region = Deno.env.get('S3_REGION') || 'auto';
        const s3Bucket = Deno.env.get('S3_BUCKET');

        if (!s3AccessKey || !s3SecretKey || !s3Endpoint || !s3Bucket) {
            console.error("Missing S3 configuration");
            console.log(`Endpoint: ${s3Endpoint}, Bucket: ${s3Bucket}, Key present: ${!!s3AccessKey}`);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'S3 configuration incomplete in environment variables',
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500,
                }
            );
        }

        console.log('[S3 Upload] Uploading file:', fileName);

        // Create S3 client
        const s3Client = new S3Client({
            credentials: {
                accessKeyId: s3AccessKey,
                secretAccessKey: s3SecretKey,
            },
            endpoint: s3Endpoint,
            region: s3Region,
            forcePathStyle: true, // Needed for many S3 compatible providers
        });

        // Convert base64 to buffer
        const binaryString = atob(fileContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Upload to S3
        const putCommand = new PutObjectCommand({
            Bucket: s3Bucket,
            Key: fileName,
            Body: bytes,
            ContentType: contentType || 'application/octet-stream',
            ACL: 'public-read', // Make file publicly accessible
        });

        await s3Client.send(putCommand);

        // Construct public URL
        let publicUrl: string;

        // Check if explicit Public URL env default exists
        const envPublicUrl = Deno.env.get('S3_PUBLIC_URL');

        if (envPublicUrl) {
            // Handle trailing slash
            const cleanBase = envPublicUrl.replace(/\/$/, '');
            publicUrl = `${cleanBase}/${fileName}`;
        } else if (s3Endpoint.includes('amazonaws.com')) {
            // AWS S3 format
            publicUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${fileName}`;
        } else {
            // Generic S3 compatible (MinIO, Backblaze, etc)
            const cleanEndpoint = s3Endpoint.replace(/\/$/, ''); // Remove trailing slash
            publicUrl = `${cleanEndpoint}/${s3Bucket}/${fileName}`;
        }

        console.log('[S3 Upload] ✅ File uploaded successfully:', publicUrl);

        return new Response(
            JSON.stringify({
                success: true,
                url: publicUrl,
                message: 'File uploaded successfully to S3',
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error('[S3 Upload] Error:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Failed to upload file to S3',
                details: error.toString(),
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        );
    }
});
