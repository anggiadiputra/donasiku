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
  if (!target) return;

  // Sanitize Phone Number
  // 1. Remove non-digits
  let formattedTarget = target.replace(/\D/g, '');
  // 2. Replace 08 -> 628
  if (formattedTarget.startsWith('08')) {
    formattedTarget = '62' + formattedTarget.substring(1);
  }
  // 3. If starts with 8, add 62
  if (formattedTarget.startsWith('8')) {
    formattedTarget = '62' + formattedTarget;
  }

  try {
    const form = new FormData();
    form.append('target', formattedTarget);
    form.append('message', message);

    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': FONNTE_TOKEN },
      body: form
    });
    console.log(`📱 WhatsApp sent to ${target}`);
  } catch (error) {
    console.error('❌ Failed to send WhatsApp:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const DUITKU_MERCHANT_CODE = Deno.env.get('DUITKU_MERCHANT_CODE') || ''
    const DUITKU_API_KEY = Deno.env.get('DUITKU_API_KEY') || ''
    const DUITKU_SANDBOX = Deno.env.get('DUITKU_SANDBOX') === 'true'
    const DUITKU_BASE_URL = DUITKU_SANDBOX
      ? 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'
      : 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const {
      campaignId,
      campaignSlug, // New parameter for lazy creation
      amount,
      paymentMethod,
      customerName,
      originalName, // New: Real name if anonymous
      isAnonymous,  // New: Flag
      customerEmail,
      customerPhone,
      customerMessage,
      returnUrl,
      productDetails,
    } = body

    console.log('📝 Creating Transaction:', {
      campaignId,
      campaignSlug,
      amount,
      customerName,
      isAnonymous
    });

    // Prepare Metadata
    const metadata: any = {};
    if (isAnonymous) {
      metadata.is_anonymous = true;
      metadata.real_name = originalName;
    }

    // Fetch or Create campaign
    let campaign = null

    // 1. Try by ID first
    if (campaignId) {
      const { data, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (!campaignError && data) {
        campaign = data
      }
    }
    // 2. Try by Slug (and create if missing)
    else if (campaignSlug) {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', campaignSlug)
        .maybeSingle()

      if (data) {
        campaign = data;
      } else {
        // Create System Campaign
        let title = 'Program Donasi';
        let category = 'Infaq';

        if (campaignSlug === 'infaq') { title = 'Bayar Infaq'; category = 'Infaq'; }
        if (campaignSlug === 'fidyah') { title = 'Bayar Fidyah'; category = 'Zakat'; }
        if (campaignSlug === 'zakat') { title = 'Bayar Zakat'; category = 'Zakat'; }
        if (campaignSlug === 'sedekah-subuh') { title = 'Sedekah Subuh'; category = 'Sedekah'; }
        if (campaignSlug === 'wakaf') { title = 'Bayar Wakaf'; category = 'Wakaf'; }

        // Get category ID
        const { data: catData } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', category.toLowerCase())
          .maybeSingle();

        const { data: newCampaign, error: createError } = await supabase
          .from('campaigns')
          .insert({
            title: title,
            slug: campaignSlug,
            description: `Fasilitas pembayaran ${title} rutin.`,
            category: category,
            category_id: catData?.id,
            target_amount: 0,
            current_amount: 0,
            status: 'published',
            user_id: null // System campaign
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Failed to create system campaign:', createError);
        } else {
          console.log('✅ Created system campaign:', title);
          campaign = newCampaign;
        }
      }
    }

    // Generate order ID and invoice
    const timestamp = Date.now()
    const merchantOrderId = `DNK-${timestamp}${Math.floor(Math.random() * 1000)}`
    const invoiceCode = `INV-${timestamp}${Math.floor(Math.random() * 1000)}`

    // Use custom productDetails if provided, otherwise use campaign title
    const finalProductDetails = productDetails || (campaign ? `Donasi untuk ${campaign.title}` : 'Donasi / Ziswaf')

    // Expiry time (24 hours)
    const expiryTime = new Date()
    expiryTime.setHours(expiryTime.getHours() + 24)

    // URLs
    let APP_URL = getEnv('APP_URL') || getEnv('VITE_APP_URL');

    if (!APP_URL) {
      console.error('⚠️ APP_URL or VITE_APP_URL is missing! Invoice links will be broken.');
      APP_URL = '';
    }

    // Remove trailing slash if present
    APP_URL = APP_URL.replace(/\/$/, '');

    // Construct Callback URL
    // If DUITKU_CALLBACK_URL is set, use it.
    // Otherwise, construct dynamic Supabase Function URL: https://[project-id].supabase.co/functions/v1/check-duitku-transaction
    let callbackUrl = getEnv('DUITKU_CALLBACK_URL');

    if (!callbackUrl) {
      const sbUrl = Deno.env.get('SUPABASE_URL');
      if (sbUrl && !sbUrl.includes('localhost') && !sbUrl.includes('127.0.0.1')) {
        callbackUrl = `${sbUrl}/functions/v1/check-duitku-transaction`;
      } else {
        // Fallback to known production URL (based on project ID)
        // This is a safety measure if SUPABASE_URL is missing or local
        console.log('⚠️ SUPABASE_URL missing or local. Using hardcoded production URL.');
        callbackUrl = 'https://lrycaoioytevqfvmrhij.supabase.co/functions/v1/check-duitku-transaction';
      }
      console.log('ℹ️ Using generated Callback URL:', callbackUrl);
    }

    // For return URL and Invoice link, use APP_URL
    const finalReturnUrl = returnUrl || `${APP_URL}/payment/success`

    // Signature: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
    const signatureRaw = `${DUITKU_MERCHANT_CODE}${merchantOrderId}${amount}${DUITKU_API_KEY}`
    const signature = await md5(signatureRaw)

    // Duitku payload
    const duitkuPayload = {
      merchantCode: DUITKU_MERCHANT_CODE,
      paymentAmount: amount,
      paymentMethod: paymentMethod,
      merchantOrderId: merchantOrderId,
      productDetails: finalProductDetails,
      email: customerEmail,
      phoneNumber: customerPhone || '08123456789',
      customerVaName: customerName,
      callbackUrl: callbackUrl,
      returnUrl: finalReturnUrl,
      signature: signature,
      expiryPeriod: 1440,
      itemDetails: [
        {
          name: finalProductDetails,
          price: amount,
          quantity: 1,
        },
      ],
    }

    console.log('🚀 Calling Duitku API...')

    // Call Duitku
    const duitkuResponse = await fetch(DUITKU_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duitkuPayload),
    })

    const duitkuData = await duitkuResponse.json()
    console.log('📥 Duitku response:', duitkuData)

    if (duitkuData.statusCode !== '00') {
      console.error('❌ Duitku error:', duitkuData)
      const errorMsg = duitkuData.statusMessage || 'Payment gateway error';
      throw new Error(`Duitku Error (${duitkuData.statusCode}): ${errorMsg}`);
    }

    // Save to database
    const { data: transaction, error: dbError } = await supabase
      .from('transactions')
      .insert({
        merchant_order_id: merchantOrderId,
        invoice_code: invoiceCode,
        amount: amount,
        payment_method: paymentMethod,
        duitku_reference: duitkuData.reference,
        va_number: duitkuData.vaNumber,
        payment_url: duitkuData.paymentUrl,
        qr_string: duitkuData.qrString,
        status: 'pending',
        result_code: duitkuData.statusCode,
        status_message: duitkuData.statusMessage,
        campaign_id: campaign ? campaign.id : null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_message: customerMessage || '',
        product_details: finalProductDetails,
        callback_url: callbackUrl,
        return_url: finalReturnUrl,
        expiry_time: expiryTime.toISOString(),
        item_details: duitkuPayload.itemDetails,
        metadata: metadata, // Save metadata
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      throw new Error('Failed to save transaction')
    }

    console.log('✅ Transaction created successfully', transaction.id)

    // ----------------------------------------------------
    // NOTIFICATIONS (Pending)
    // ----------------------------------------------------
    const invoiceLink = `${APP_URL}/invoice/${invoiceCode}`;
    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    // Custom Greeting & Details for Anonymous interactions via WhatsApp
    // User wants: "Halo Hamba Allah (Budi)" and "Keperluan: Infaq... (Budi)"
    const greetingName = (isAnonymous && originalName)
      ? `${customerName} (${originalName})`
      : (customerName || 'Orang Baik');

    const messageDetails = (isAnonymous && originalName)
      ? `${finalProductDetails} (${originalName})`
      : finalProductDetails;

    // 1. WhatsApp
    if (customerPhone) {
      const waMessage = `Halo ${greetingName},\n\nTerima kasih atas niat baik Anda untuk berdonasi.\n\nMohon selesaikan pembayaran sebesar *${formattedAmount}*.\n\nKeperluan: ${messageDetails}\n\nUntuk instruksi pembayaran, silakan klik link di bawah ini:\n${invoiceLink}\n\nTerima kasih.`;
      await sendWhatsApp(customerPhone, waMessage);
    }

    // 2. Email
    if (customerEmail) {
      const subject = `Menunggu Pembayaran: ${finalProductDetails}`;
      const html = `
            <h2>Menunggu Pembayaran</h2>
            <p>Halo <strong>${greetingName}</strong>,</p>
            <p>Terima kasih atas donasi Anda. Berikut adalah detail pembayaran yang harus diselesaikan:</p>
            <ul>
                <li><strong>Jumlah:</strong> ${formattedAmount}</li>
                <li><strong>Keperluan:</strong> ${messageDetails}</li>
                <li><strong>No. Invoice:</strong> ${invoiceCode}</li>
            </ul>
            <p>Silakan klik tombol di bawah ini untuk melihat instruksi pembayaran:</p>
            <a href="${invoiceLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Bayar Sekarang</a>
            <br/><br/>
            <p>Atau klik link ini: <a href="${invoiceLink}">${invoiceLink}</a></p>
            <p>Terima kasih,<br/>Tim Donasiku</p>
        `;
      await sendEmail(customerEmail, subject, html);
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          id: transaction.id,
          merchantOrderId: merchantOrderId,
          invoiceCode: invoiceCode,
          reference: duitkuData.reference,
          duitkuReference: duitkuData.reference,
          paymentUrl: duitkuData.paymentUrl,
          vaNumber: duitkuData.vaNumber,
          qrString: duitkuData.qrString,
          amount: amount,
          expiryTime: expiryTime.toISOString(),
          createdAt: new Date().toISOString(),
          paymentMethod: paymentMethod,
          productDetails: finalProductDetails,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('💥 Error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
