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

        console.log('📋 Config:', {
            merchantCode: DUITKU_MERCHANT_CODE,
            sandbox: DUITKU_SANDBOX,
            baseUrl: DUITKU_BASE_URL,
        })

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { merchantOrderId } = await req.json()

        console.log('📦 Request data:', { merchantOrderId })

        if (!merchantOrderId) {
            console.error('❌ merchantOrderId is required')
            return new Response(
                JSON.stringify({ error: 'merchantOrderId is required' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        // Calculate signature: MD5(merchantCode + merchantOrderId + apiKey)
        const signatureString = `${DUITKU_MERCHANT_CODE}${merchantOrderId}${DUITKU_API_KEY}`
        const signature = await md5(signatureString)

        console.log('🔐 Signature calculated for:', merchantOrderId)

        // Call Duitku Check Transaction API
        console.log('🌐 Calling Duitku API...')
        const duitkuPayload = {
            merchantCode: DUITKU_MERCHANT_CODE,
            merchantOrderId: merchantOrderId,
            signature: signature,
        }

        console.log('📤 Duitku payload:', duitkuPayload)

        const response = await fetch(`${DUITKU_BASE_URL}/transactionStatus`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(duitkuPayload),
        })

        const duitkuData = await response.json()

        console.log('📥 Duitku response:', {
            status: response.status,
            data: duitkuData,
        })

        // Map Duitku status codes to our status
        let status = 'pending'
        if (duitkuData.statusCode === '00') {
            status = 'success'
        } else if (duitkuData.statusCode === '02') {
            status = 'failed'
        } else if (duitkuData.statusCode === '01') {
            status = 'pending'
        }

        console.log('🎯 Mapped status:', status)

        // Update transaction in database
        console.log('💾 Updating transaction in database...')
        const { error: updateError, data: updatedData } = await supabase
            .from('transactions')
            .update({
                status: status,
                result_code: duitkuData.statusCode,
                status_message: duitkuData.statusMessage,
                updated_at: new Date().toISOString(),
            })
            .eq('merchant_order_id', merchantOrderId)
            .select()
            .single()

        if (updateError) {
            console.error('❌ Failed to update transaction:', updateError)
        } else {
            console.log('✅ Transaction updated:', updatedData)
        }

        // If payment is successful, update campaign amount
        if (status === 'success') {
            console.log('💰 Payment successful, updating campaign...')

            const { data: transaction } = await supabase
                .from('transactions')
                .select('*, campaigns(*)')
                .eq('merchant_order_id', merchantOrderId)
                .single()

            if (transaction && transaction.campaigns) {
                // Update campaign current_amount
                const { error: campaignError } = await supabase
                    .from('campaigns')
                    .update({
                        current_amount: (transaction.campaigns.current_amount || 0) + transaction.amount,
                    })
                    .eq('id', transaction.campaign_id)

                if (campaignError) {
                    console.error('❌ Failed to update campaign:', campaignError)
                } else {
                    console.log('✅ Campaign updated successfully')
                }

                // ---------------------------------------------------------
                // SEND WHATSAPP NOTIFICATION VIA FONNTE
                // ---------------------------------------------------------
                const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN');

                if (FONNTE_TOKEN && transaction.customer_phone) {
                    console.log('📱 Sending WhatsApp Notification...');

                    try {
                        // Get Success Template from Settings
                        const { data: settings } = await supabase
                            .from('app_settings')
                            .select('whatsapp_success_template')
                            .limit(1)
                            .single();

                        let message = settings?.whatsapp_success_template ||
                            'Alhamdulillah, terima kasih Kak {name}. Donasi sebesar {amount} untuk {campaign} telah kami terima. Semoga berkah.';

                        // Format Currency
                        const formattedAmount = new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0
                        }).format(transaction.amount);

                        // Replace Variables
                        message = message
                            .replace(/{name}/g, transaction.customer_name || 'Hamba Allah')
                            .replace(/{amount}/g, formattedAmount)
                            .replace(/{campaign}/g, transaction.campaigns?.title || 'Program Kebaikan');

                        const form = new FormData();
                        form.append('target', transaction.customer_phone);
                        form.append('message', message);

                        const fonnteRes = await fetch('https://api.fonnte.com/send', {
                            method: 'POST',
                            headers: {
                                'Authorization': FONNTE_TOKEN
                            },
                            body: form
                        });

                        const fonnteResult = await fonnteRes.json();
                        console.log('✅ Fonnte Response:', fonnteResult);

                    } catch (waError) {
                        console.error('❌ Failed to send WhatsApp notification:', waError);
                        // Don't throw error to allow response to return success to client
                    }
                } else {
                    console.log('ℹ️ Skipping WhatsApp: No Token or Phone Number');
                }
            }
        }

        // Return response with status field
        const responseData = {
            success: response.ok,
            status: status, // Add status field for frontend
            statusCode: duitkuData.statusCode,
            statusMessage: duitkuData.statusMessage,
            merchantOrderId: merchantOrderId,
            duitkuResponse: duitkuData,
        }

        console.log('✅ Sending response:', responseData)

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('💥 Error in check-duitku-transaction:', error)
        return new Response(
            JSON.stringify({
                error: error.message || 'Internal server error',
                details: error.toString(),
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
})
