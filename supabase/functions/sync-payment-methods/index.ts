import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

/**
 * Generate SHA256 signature for Duitku
 */
async function generateSignature(merchantCode: string, amount: number, datetime: string, apiKey: string): Promise<string> {
    const message = `${merchantCode}${amount}${datetime}${apiKey}`
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Format datetime for Duitku (yyyy-MM-dd HH:mm:ss)
 */
function formatDateTime(date = new Date()): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Categorize payment method based on code
 */
function categorizePaymentMethod(code: string): string {
    if (['BC', 'M2', 'VA', 'I1', 'BT', 'B1', 'A1', 'AG', 'NC', 'BR', 'S1', 'FT', 'DN', 'IR'].includes(code)) {
        return 'virtual_account'
    }
    if (['OV', 'SA', 'LF', 'DA', 'SP', 'SL', 'OL'].includes(code)) {
        return 'e_wallet'
    }
    if (['NQ', 'SQ', 'BDG', 'BNP'].includes(code)) {
        return 'qris'
    }
    if (code === 'VC') {
        return 'credit_card'
    }
    if (['A2', 'IA'].includes(code)) {
        return 'retail'
    }
    if (['AT', 'KR', 'ID'].includes(code)) {
        return 'paylater'
    }
    if (code === 'JP') {
        return 'e_banking'
    }
    return 'other'
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        })
    }

    try {
        // Validate authorization
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error('[Sync] Missing authorization header')
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401
            })
        }

        // Create Supabase client with service role for database operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Validate user authentication
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader }
                }
            }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            console.error('[Sync] Invalid or expired token:', userError)
            return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401
            })
        }

        console.log('[Sync] Authenticated user:', user.email)

        // Get Duitku configuration
        const merchantCode = Deno.env.get('DUITKU_MERCHANT_CODE') || ''
        const apiKey = Deno.env.get('DUITKU_API_KEY') || ''
        const isProduction = Deno.env.get('DUITKU_IS_PRODUCTION') === 'true'

        console.log('[Sync] Configuration:', {
            hasMerchantCode: !!merchantCode,
            hasApiKey: !!apiKey,
            isProduction,
            merchantCodeLength: merchantCode.length,
            apiKeyLength: apiKey.length
        })

        if (!merchantCode || !apiKey) {
            console.error('[Sync] Duitku not configured')
            return new Response(JSON.stringify({
                error: 'Duitku not configured',
                details: !merchantCode ? 'DUITKU_MERCHANT_CODE is missing' : 'DUITKU_API_KEY is missing'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            })
        }

        // Prepare Duitku API request
        const baseUrl = isProduction
            ? 'https://passport.duitku.com/webapi/api/merchant'
            : 'https://sandbox.duitku.com/webapi/api/merchant'

        const amount = 10000 // Minimum amount for testing
        const datetime = formatDateTime()
        const signature = await generateSignature(merchantCode, amount, datetime, apiKey)

        const requestPayload = {
            merchantcode: merchantCode,
            amount: amount.toString(),
            datetime: datetime,
            signature: signature
        }

        console.log('[Sync] Requesting payment methods:', {
            url: `${baseUrl}/paymentmethod/getpaymentmethod`,
            isProduction,
            amount,
            datetime,
            merchantCode: merchantCode.substring(0, 4) + '***'
        })

        // Call Duitku API
        const response = await fetch(`${baseUrl}/paymentmethod/getpaymentmethod`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        })

        const responseText = await response.text()
        console.log('[Sync] Response status:', response.status)
        console.log('[Sync] Response preview:', responseText.substring(0, 500))

        if (!response.ok) {
            let errorDetails
            try {
                errorDetails = JSON.parse(responseText)
            } catch {
                errorDetails = { message: responseText }
            }
            console.error(`[Sync] Duitku API error: ${response.status}`, errorDetails)
            return new Response(JSON.stringify({
                error: `Duitku API error: ${response.status}`,
                details: errorDetails,
                responseText: responseText.substring(0, 500)
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 502
            })
        }

        // Parse response
        let data: any
        try {
            data = JSON.parse(responseText)
        } catch (parseError) {
            console.error('[Sync] Error parsing response:', parseError)
            return new Response(JSON.stringify({
                error: 'Invalid response from Duitku API',
                details: parseError?.message
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 502
            })
        }

        const paymentMethods = data.paymentFee || []
        console.log('[Sync] Fetched payment methods:', {
            methodCount: paymentMethods.length,
            responseCode: data.responseCode
        })

        // Sync payment methods to database
        const syncedMethods = []
        const errors = []

        for (const method of paymentMethods) {
            try {
                const category = categorizePaymentMethod(method.paymentMethod)

                // Check if payment method already exists
                const { data: existing } = await supabaseAdmin
                    .from('payment_methods')
                    .select('*')
                    .eq('payment_method_code', method.paymentMethod)
                    .maybeSingle()

                if (existing) {
                    // Update existing
                    const { error: updateError } = await supabaseAdmin
                        .from('payment_methods')
                        .update({
                            payment_method_name: method.paymentName,
                            payment_image: method.paymentImage,
                            total_fee: method.totalFee,
                            category: category,
                            last_synced_at: new Date().toISOString(),
                            metadata: { raw_data: method }
                        })
                        .eq('payment_method_code', method.paymentMethod)

                    if (updateError) {
                        errors.push({ method: method.paymentMethod, error: updateError.message })
                    } else {
                        syncedMethods.push({ code: method.paymentMethod, action: 'updated' })
                    }
                } else {
                    // Insert new
                    const { error: insertError } = await supabaseAdmin
                        .from('payment_methods')
                        .insert({
                            payment_method_code: method.paymentMethod,
                            payment_method_name: method.paymentName,
                            payment_image: method.paymentImage,
                            total_fee: method.totalFee,
                            category: category,
                            is_active: true,
                            sort_order: 0,
                            last_synced_at: new Date().toISOString(),
                            metadata: { raw_data: method }
                        })

                    if (insertError) {
                        errors.push({ method: method.paymentMethod, error: insertError.message })
                    } else {
                        syncedMethods.push({ code: method.paymentMethod, action: 'created' })
                    }
                }
            } catch (error: any) {
                errors.push({ method: method.paymentMethod, error: error.message })
            }
        }

        // Get final count
        const { count } = await supabaseAdmin
            .from('payment_methods')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)

        console.log('[Sync] Sync completed:', {
            synced: syncedMethods.length,
            errors: errors.length,
            totalActive: count
        })

        return new Response(JSON.stringify({
            success: true,
            message: `Synchronized ${syncedMethods.length} payment methods`,
            synced: syncedMethods,
            errors: errors,
            totalActive: count || 0,
            timestamp: new Date().toISOString()
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error: any) {
        console.error('[Sync] Unexpected error:', error)
        console.error('[Sync] Error stack:', error?.stack)
        return new Response(JSON.stringify({
            error: error?.message || 'Internal server error',
            details: error?.stack || 'Unknown error'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
