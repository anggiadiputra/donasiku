import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

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
      amount,
      paymentMethod,
      customerName,
      customerEmail,
      customerPhone,
      customerMessage,
      returnUrl,
      productDetails, // Optional: custom product details for Fidyah
    } = body

    // Fetch campaign (optional for Fidyah)
    let campaign = null
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
    const callbackUrl = Deno.env.get('DUITKU_CALLBACK_URL') || 'https://donasiku.com/api/payment/callback'
    const finalReturnUrl = returnUrl || 'https://donasiku.com/payment/success'

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
      throw new Error(duitkuData.statusMessage || 'Payment gateway error')
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
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      throw new Error('Failed to save transaction')
    }

    console.log('✅ Transaction created successfully')

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
