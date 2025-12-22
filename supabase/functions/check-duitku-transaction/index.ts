import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'
import nodemailer from "npm:nodemailer@6.9.7";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// MD5 hash function for Duitku signature
async function md5(str: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(str)
    const hashBuffer = await crypto.subtle.digest('MD5', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function getEnv(key: string): string {
    return Deno.env.get(key) || Deno.env.get(`VITE_${key}`) || '';
}

async function sendEmail(to: string, subject: string, htmlBody: string) {
    const SMTP_HOST = getEnv('SMTP_HOST')
    const SMTP_PORT = parseInt(getEnv('SMTP_PORT') || '587')
    const SMTP_USER = getEnv('SMTP_USER')
    const SMTP_PASS = getEnv('SMTP_PASSWORD') || getEnv('SMTP_PASS')
    const SENDER_EMAIL = getEnv('SMTP_FROM') || getEnv('SENDER_EMAIL') || SMTP_USER || 'no-reply@app.com'

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.error('❌ SMTP credentials missing. details:', {
            hasHost: !!SMTP_HOST,
            hasUser: !!SMTP_USER,
            hasPass: !!SMTP_PASS
        });
        return
    }

    try {
        console.log(`📧 Connecting to SMTP ${SMTP_HOST}:${SMTP_PORT}...`)

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465, // true for 465, false for other ports
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: SENDER_EMAIL,
            to: to,
            subject: subject,
            html: htmlBody,
        });

        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
        console.error('❌ Failed to send email:', error);
    }
}

async function sendWhatsApp(target: string, message: string) {
    const FONNTE_TOKEN = getEnv('FONNTE_TOKEN');

    if (!FONNTE_TOKEN) {
        console.error('❌ FONNTE_TOKEN is missing. Checked FONNTE_TOKEN and VITE_FONNTE_TOKEN.');
        // Debug: Print available keys (sanitized) to help user debug
        const keys = Object.keys(Deno.env.toObject());
        console.log('ℹ️ Available Env Keys:', keys.filter(k => !k.includes('KEY') && !k.includes('SECRET') && !k.includes('TOKEN')));
        return;
    }
    if (!target) {
        console.warn('⚠️ No target phone number for WhatsApp');
        return;
    }

    try {
        const form = new FormData();
        form.append('target', target);
        form.append('message', message);

        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                'Authorization': FONNTE_TOKEN
            },
            body: form
        });
        const result = await response.json();
        console.log(`📱 WhatsApp sent to ${target}:`, result);

        if (!result.status) {
            console.error('❌ Fonnte Error Result:', result);
        }
    } catch (error) {
        console.error('❌ Failed to send WhatsApp:', error);
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('🔍 Check Duitku Transaction - Starting...')

        const DUITKU_MERCHANT_CODE = Deno.env.get('DUITKU_MERCHANT_CODE') || ''
        const DUITKU_API_KEY = Deno.env.get('DUITKU_API_KEY') || ''
        const DUITKU_SANDBOX = Deno.env.get('DUITKU_SANDBOX') === 'true'
        const DUITKU_BASE_URL = DUITKU_SANDBOX
            ? 'https://sandbox.duitku.com/webapi/api/merchant'
            : 'https://passport.duitku.com/webapi/api/merchant'

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { merchantOrderId } = await req.json()

        if (!merchantOrderId) {
            return new Response(
                JSON.stringify({ error: 'merchantOrderId is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Calculate signature
        const signatureString = `${DUITKU_MERCHANT_CODE}${merchantOrderId}${DUITKU_API_KEY}`
        const signature = await md5(signatureString)

        // Call Duitku Check Transaction API
        const response = await fetch(`${DUITKU_BASE_URL}/transactionStatus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                merchantCode: DUITKU_MERCHANT_CODE,
                merchantOrderId: merchantOrderId,
                signature: signature,
            }),
        })

        const duitkuData = await response.json()

        console.log('📥 Duitku response:', duitkuData)

        let status = 'pending'
        if (duitkuData.statusCode === '00') status = 'success'
        else if (duitkuData.statusCode === '02') status = 'failed'
        else if (duitkuData.statusCode === '01') status = 'pending'

        // Update transaction
        const { error: updateError, data: updatedData } = await supabase
            .from('transactions')
            .update({
                status: status,
                result_code: duitkuData.statusCode,
                status_message: duitkuData.statusMessage,
                updated_at: new Date().toISOString(),
            })
            .eq('merchant_order_id', merchantOrderId)
            .select('*, campaigns(*)')

        if (updateError) {
            console.error('❌ Database update error:', updateError);
            throw updateError;
        }

        const transaction = updatedData && updatedData.length > 0 ? updatedData[0] : null;

        if (!transaction) {
            console.error(`❌ Transaction not found for Order ID: ${merchantOrderId}`);
            return new Response(JSON.stringify({ error: 'Transaction not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Process Success
        if (status === 'success' && transaction) {
            // 1. Update Campaign Amount
            if (transaction.campaigns) {
                await supabase
                    .from('campaigns')
                    .update({
                        current_amount: (transaction.campaigns.current_amount || 0) + transaction.amount,
                    })
                    .eq('id', transaction.campaign_id)
            }

            const formattedAmount = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
            }).format(transaction.amount);

            const donorName = transaction.customer_name || 'Hamba Allah';
            const campaignTitle = transaction.campaigns?.title || 'Program Kebaikan';


            // URLs
            let APP_URL = getEnv('APP_URL') || getEnv('VITE_APP_URL');
            if (!APP_URL) {
                console.error('⚠️ APP_URL is missing in check-transaction. Invoice link will be incomplete.');
                APP_URL = '';
            }
            APP_URL = APP_URL.replace(/\/$/, '');

            const invoiceCode = transaction.invoice_code || transaction.merchant_order_id; // Fallback
            const invoiceLink = `${APP_URL}/invoice/${invoiceCode}`;

            // ---------------------------------------------------------
            // 2. DONOR NOTIFICATION
            // ---------------------------------------------------------

            // A. WhatsApp to Donor
            if (transaction.customer_phone) {
                const { data: settings } = await supabase.from('app_settings').select('whatsapp_success_template').single();
                let message = settings?.whatsapp_success_template ||
                    'Alhamdulillah, terima kasih Kak {name}. Donasi sebesar {amount} untuk {campaign} telah kami terima. Semoga berkah.';

                message = message
                    .replace(/{name}/g, donorName)
                    .replace(/{amount}/g, formattedAmount)
                    .replace(/{campaign}/g, campaignTitle);

                // Append Invoice Link
                message += `\n\nLihat Invoice: ${invoiceLink}`;

                await sendWhatsApp(transaction.customer_phone, message);
            }

            // B. Email to Donor
            if (transaction.customer_email) {
                const subject = `Terima Kasih atas Donasi Anda untuk ${campaignTitle}`;
                const html = `
                    <h2>Terima Kasih, ${donorName}!</h2>
                    <p>Alhamdulillah, donasi Anda sebesar <strong>${formattedAmount}</strong> untuk kampanye <strong>"${campaignTitle}"</strong> telah kami terima.</p>
                    <p>Semoga Allah membalas kebaikan Anda dengan pahala yang berlipat ganda.</p>
                    <br/>
                    <p>Salam hangat,<br/>Tim Donasiku</p>
                `;
                await sendEmail(transaction.customer_email, subject, html);
            }

            // ---------------------------------------------------------
            // 3. CAMPAIGNER NOTIFICATION
            // ---------------------------------------------------------
            if (transaction.campaigns?.user_id) {
                // Fetch Campaigner Profile & Email
                const { data: campaignerProfile } = await supabase
                    .from('profiles')
                    .select('phone, organization_name')
                    .eq('id', transaction.campaigns.user_id)
                    .single();

                // Fetch Campaigner Email from Auth (Admin)
                const { data: { user: campaignerUser }, error: userError } = await supabase.auth.admin.getUserById(transaction.campaigns.user_id);

                // A. WhatsApp to Campaigner
                if (campaignerProfile?.phone) {
                    const message = `Halo ${campaignerProfile.organization_name || 'Campaigner'},\n\nAda donasi baru sebesar ${formattedAmount} dari ${donorName} untuk campaign "${campaignTitle}".\n\nSemangat menebar kebaikan!`;
                    await sendWhatsApp(campaignerProfile.phone, message);
                }

                // B. Email to Campaigner
                if (campaignerUser?.email) {
                    const subject = `Donasi Baru: ${formattedAmount} untuk ${campaignTitle}`;
                    const html = `
                        <h2>Donasi Baru Diterima!</h2>
                        <p>Halo Penggalang Dana,</p>
                        <p>Kabar gembira! Ada donasi baru yang masuk untuk kampanye Anda.</p>
                        <ul>
                            <li><strong>Donatur:</strong> ${donorName}</li>
                            <li><strong>Jumlah:</strong> ${formattedAmount}</li>
                            <li><strong>Kampanye:</strong> ${campaignTitle}</li>
                        </ul>
                        <p>Terus semangat menyebarkan kebaikan!</p>
                        <br/>
                        <p>Salam,<br/>Tim Donasiku</p>
                    `;
                    await sendEmail(campaignerUser.email, subject, html);
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            status: status,
            merchantOrderId: merchantOrderId
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('💥 Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
