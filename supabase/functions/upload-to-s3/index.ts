
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3';

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
        const payload = await req.json();
        const { fileName, fileContent, contentType, operation = 'upload' } = payload;

        // Get S3 config from environment variables
        const s3AccessKey = Deno.env.get('S3_ACCESS_KEY') || Deno.env.get('S3_ACCESS_KEY_ID');
        const s3SecretKey = Deno.env.get('S3_SECRET_KEY') || Deno.env.get('S3_SECRET_ACCESS_KEY');
        const s3Endpoint = Deno.env.get('S3_ENDPOINT');
        const s3Region = Deno.env.get('S3_REGION') || 'auto';
        const s3Bucket = Deno.env.get('S3_BUCKET');

        if (!s3AccessKey || !s3SecretKey || !s3Endpoint || !s3Bucket) {
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

        // Create S3 client
        const s3Client = new S3Client({
            credentials: {
                accessKeyId: s3AccessKey,
                secretAccessKey: s3SecretKey,
            },
            endpoint: s3Endpoint,
            region: s3Region,
            forcePathStyle: true,
        });

        if (operation === 'delete') {
            if (!fileName) {
                throw new Error('Missing fileName for delete operation');
            }

            console.log('[S3] Deleting file:', fileName);
            const deleteCommand = new DeleteObjectCommand({
                Bucket: s3Bucket,
                Key: fileName,
            });

            await s3Client.send(deleteCommand);

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'File deleted successfully from S3',
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            );
        }

        // Default: UPLOAD
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

        console.log('[S3] Uploading file:', fileName);

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
            ACL: 'public-read',
        });

        await s3Client.send(putCommand);

        // Construct public URL
        let publicUrl: string;
        const envPublicUrl = Deno.env.get('S3_PUBLIC_URL');

        if (envPublicUrl) {
            const cleanBase = envPublicUrl.replace(/\/$/, '');
            publicUrl = `${cleanBase}/${fileName}`;
        } else if (s3Endpoint.includes('amazonaws.com')) {
            publicUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${fileName}`;
        } else {
            const cleanEndpoint = s3Endpoint.replace(/\/$/, '');
            publicUrl = `${cleanEndpoint}/${s3Bucket}/${fileName}`;
        }

        console.log('[S3] ✅ File uploaded successfully:', publicUrl);

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
        console.error('[S3] Error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Operation failed',
                details: error.toString(),
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        );
    }
});
