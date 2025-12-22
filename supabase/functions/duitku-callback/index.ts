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
        console.error('❌ SMTP credentials missing')
        return
    }

    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        await transporter.sendMail({
            from: SENDER_EMAIL,
            to: to,
            subject: subject,
            html: htmlBody,
        });
        console.log(`📧 Email sent to ${to}`);
    } catch (error) {
        console.error('❌ Failed to send email:', error);
    }
}

async function sendWhatsApp(target: string, message: string) {
    const FONNTE_TOKEN = getEnv('FONNTE_TOKEN');
    if (!FONNTE_TOKEN || !target) return;

    try {
        const form = new FormData();
        form.append('target', target);
        form.append('message', message);

        const res = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: { 'Authorization': FONNTE_TOKEN },
            body: form
        });
        const result = await res.json();
        console.log(`📱 WhatsApp sent to ${target}:`, result);
    } catch (error) {
        console.error('❌ Failed to send WhatsApp:', error);
    }
}

serve(async (req) => {
    // Handle CORS (though callbacks are typically server-to-server)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('🔄 Duitku Callback Received')

        const DUITKU_MERCHANT_CODE = Deno.env.get('DUITKU_MERCHANT_CODE') || ''
        const DUITKU_API_KEY = Deno.env.get('DUITKU_API_KEY') || ''

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Robust Body Parsing (FormData vs JSON)
        let data: any = {};
        const contentType = req.headers.get('content-type') || '';

        try {
            if (contentType.includes('application/json')) {
                data = await req.json();
            } else {
                // Default to FormData for Duitku
                const formData = await req.formData();
                formData.forEach((value, key) => {
                    data[key] = value;
                });
            }
        } catch (e) {
            console.error('❌ Failed to parse body:', e);
            return new Response('Invalid Body Format', { status: 400 });
        }

        console.log('📥 Payload:', data);

        const {
            merchantCode,
            amount,
            merchantOrderId,
            signature,
            resultCode,
            reference,
            settlementDate
        } = data;

        if (!merchantOrderId) {
            return new Response('Missing merchantOrderId', { status: 400 });
        }

        // Validate Signature
        // MD5(merchantCode + amount + merchantOrderId + apiKey)
        const calcSignature = await md5(`${merchantCode}${amount}${merchantOrderId}${DUITKU_API_KEY}`);

        if (signature !== calcSignature) {
            console.error('❌ Invalid Signature', { received: signature, calculated: calcSignature });
            return new Response('Invalid Signature', { status: 400 });
        }

        // Determine Status
        let status = 'pending'
        if (resultCode === '00') status = 'success'
        else if (resultCode === '02') status = 'failed'
        else if (resultCode === '01') status = 'pending'

        console.log(`Checking Transaction: ${merchantOrderId} -> New Status: ${status}`);

        // Fetch Transaction First
        const { data: transaction, error: fetchError } = await supabase
            .from('transactions')
            .select('*, campaigns(*)')
            .eq('merchant_order_id', merchantOrderId)
            .single();

        if (fetchError || !transaction) {
            console.error('❌ Transaction not found:', merchantOrderId);
            return new Response('Transaction Not Found', { status: 404 });
        }

        // If already success, skip to avoid double counting
        if (transaction.status === 'success') {
            console.log('✅ Transaction already success. Skipping logic.');
            return new Response('OK', { status: 200 });
        }

        // Update Transaction
        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                status: status,
                result_code: resultCode,
                duitku_reference: reference ?? transaction.duitku_reference,
                settlement_date: settlementDate ?? null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.id);

        if (updateError) {
            console.error('❌ Database update error:', updateError);
            throw updateError;
        }

        // If Success, Process Logic
        if (status === 'success') {
            // 1. Update Campaign Amount
            if (transaction.campaigns) {
                await supabase
                    .from('campaigns')
                    .update({
                        current_amount: (transaction.campaigns.current_amount || 0) + transaction.amount,
                    })
                    .eq('id', transaction.campaign_id)
            }

            // 2. Notifications
            const formattedAmount = new Intl.NumberFormat('id-ID', {
                style: 'currency', currency: 'IDR', minimumFractionDigits: 0
            }).format(transaction.amount);

            const donorName = transaction.customer_name || 'Hamba Allah';
            const campaignTitle = transaction.campaigns?.title || 'Program Kebaikan';

            // URLs
            let APP_URL = getEnv('APP_URL') || getEnv('VITE_APP_URL');
            if (!APP_URL) {
                console.error('⚠️ APP_URL missing in callback.');
                APP_URL = '';
            }
            APP_URL = APP_URL.replace(/\/$/, '');
            const invoiceLink = `${APP_URL}/invoice/${transaction.invoice_code || transaction.merchant_order_id}`;

            // A. Donor Notification
            // WA
            if (transaction.customer_phone) {
                const { data: settings } = await supabase.from('app_settings').select('whatsapp_success_template').single();
                let msg = settings?.whatsapp_success_template || 'Alhamdulillah, terima kasih {name}. Donasi {amount} untuk {campaign} diterima.';
                msg = msg
                    .replace(/{name}/g, donorName)
                    .replace(/{amount}/g, formattedAmount)
                    .replace(/{campaign}/g, campaignTitle);

                msg += `\n\nLihat Invoice: ${invoiceLink}`;
                await sendWhatsApp(transaction.customer_phone, msg);
            }

            // Email
            if (transaction.customer_email) {
                const subject = `Terima Kasih atas Donasi Anda untuk ${campaignTitle}`;
                const html = `
                    <h2>Terima Kasih, ${donorName}!</h2>
                    <p>Alhamdulillah, donasi Anda sebesar <strong>${formattedAmount}</strong> untuk kampanye <strong>"${campaignTitle}"</strong> telah kami terima.</p>
                    <p>Semoga Allah membalas kebaikan Anda dengan pahala yang berlipat ganda.</p>
                    <br/>
                    <p>Lihat Invoice: <a href="${invoiceLink}">${invoiceLink}</a></p>
                    <br/>
                    <p>Salam hangat,<br/>Tim Donasiku</p>
                `;
                await sendEmail(transaction.customer_email, subject, html);
            }

            // B. Campaigner Notification
            if (transaction.campaigns?.user_id) {
                const { data: campaignerProfile } = await supabase
                    .from('profiles')
                    .select('phone, organization_name')
                    .eq('id', transaction.campaigns.user_id)
                    .single();

                const { data: { user: campaignerUser } } = await supabase.auth.admin.getUserById(transaction.campaigns.user_id);

                // WA
                if (campaignerProfile?.phone) {
                    const msg = `Halo ${campaignerProfile.organization_name || 'Campaigner'},\n\nAda donasi baru sebesar ${formattedAmount} dari ${donorName} untuk campaign "${campaignTitle}".\n\nSemangat menebar kebaikan!`;
                    await sendWhatsApp(campaignerProfile.phone, msg);
                }

                // Email
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

        return new Response('OK', { status: 200 });

    } catch (error: any) {
        console.error('💥 Callback Error:', error)
        return new Response(error.message, { status: 500 })
    }
})
