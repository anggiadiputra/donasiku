import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// MD5 hash function for signature validation
async function md5(str: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(str)
    const hashBuffer = await crypto.subtle.digest('MD5', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Send WhatsApp notification via Fonnte
async function sendWhatsAppNotification(phone: string, message: string) {
    const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN')

    if (!FONNTE_TOKEN) {
        console.warn('FONNTE_TOKEN not configured, skipping WhatsApp notification')
        return
    }

    try {
        // Format phone number (remove leading 0, add 62)
        let formattedPhone = phone.replace(/^0/, '62')

        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                Authorization: FONNTE_TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                target: formattedPhone,
                message: message,
                countryCode: '62',
            }),
        })

        const result = await response.json()
        console.log('WhatsApp notification sent:', result)
        return result
    } catch (error) {
        console.error('Failed to send WhatsApp notification:', error)
    }
}

serve(async (req) => {
    try {
        const DUITKU_MERCHANT_CODE = Deno.env.get('DUITKU_MERCHANT_CODE') || ''
        const DUITKU_API_KEY = Deno.env.get('DUITKU_API_KEY') || ''

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Parse form data from Duitku callback
        const formData = await req.formData()
        const data: any = {}
        for (const [key, value] of formData.entries()) {
            data[key] = value
        }

        const {
            merchantCode,
            amount,
            merchantOrderId,
            signature,
            resultCode,
            reference,
            paymentCode,
            settlementDate,
            productDetail,
            additionalParam,
        } = data

        console.log('Duitku callback received:', {
            merchantOrderId,
            amount,
            resultCode,
            reference,
        })

        // Validate required fields
        if (!merchantCode || !amount || !merchantOrderId || !signature) {
            console.error('Missing required callback parameters')
            return new Response('Bad Parameter', { status: 400 })
        }

        // Validate signature
        const calculatedSignature = await md5(
            `${merchantCode}${amount}${merchantOrderId}${DUITKU_API_KEY}`
        )

        if (signature !== calculatedSignature) {
            console.error('Invalid signature!', {
                received: signature,
                calculated: calculatedSignature,
            })
            return new Response('Invalid Signature', { status: 400 })
        }

        console.log('Signature validated successfully')

        // Get transaction from database
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .select('*, campaigns(*)')
            .eq('merchant_order_id', merchantOrderId)
            .single()

        if (txError || !transaction) {
            console.error('Transaction not found:', merchantOrderId, txError)
            return new Response('Transaction Not Found', { status: 404 })
        }

        // Check if already processed
        if (transaction.status === 'success') {
            console.log('Transaction already processed, skipping')
            return new Response('OK - Already Processed', { status: 200 })
        }

        // Determine status based on result code
        let status = 'pending'
        if (resultCode === '00') {
            status = 'success'
        } else if (resultCode === '02') {
            status = 'failed'
        }

        console.log('Updating transaction status to:', status)

        // Update transaction status
        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                status: status,
                result_code: resultCode,
                settlement_date: settlementDate || null,
                updated_at: new Date().toISOString(),
            })
            .eq('merchant_order_id', merchantOrderId)

        if (updateError) {
            console.error('Failed to update transaction:', updateError)
            return new Response('Failed to Update Transaction', { status: 500 })
        }

        // If payment successful, update campaign and create donation
        if (status === 'success' && transaction.campaign_id) {
            console.log('Payment successful, updating campaign and creating donation')

            // Update campaign current_amount
            const newCurrentAmount = parseFloat(transaction.campaigns?.current_amount || '0') + parseFloat(amount)

            const { error: campaignError } = await supabase
                .from('campaigns')
                .update({
                    current_amount: newCurrentAmount,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', transaction.campaign_id)

            if (campaignError) {
                console.error('Failed to update campaign:', campaignError)
            } else {
                console.log('Campaign updated, new amount:', newCurrentAmount)
            }

            // Create donation record
            const { error: donationError } = await supabase.from('donations').insert({
                campaign_id: transaction.campaign_id,
                donor_name: transaction.customer_name,
                amount: parseFloat(amount),
                payment_method: paymentCode || transaction.payment_method,
                status: 'completed',
                is_anonymous: false,
            })

            if (donationError) {
                console.error('Failed to create donation record:', donationError)
            } else {
                console.log('Donation record created')
            }

            // Send WhatsApp notification
            if (transaction.customer_phone) {
                const formattedAmount = new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                }).format(parseFloat(amount))

                const message = `*Terima kasih atas donasi Anda!* 🙏

✅ *Pembayaran Berhasil*

📋 Invoice: ${transaction.invoice_code}
💰 Jumlah: ${formattedAmount}
📌 Campaign: ${transaction.campaigns?.title || 'N/A'}
🔖 Referensi: ${reference}

Semoga berkah dan bermanfaat.
Jazakallah khairan katsiran! 💚`

                await sendWhatsAppNotification(transaction.customer_phone, message)
            }
        }

        console.log('Callback processed successfully')
        return new Response('OK', { status: 200 })
    } catch (error) {
        console.error('Callback error:', error)
        return new Response(error.message, { status: 500 })
    }
})
