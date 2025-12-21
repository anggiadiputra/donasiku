# Duitku Payment Gateway - Implementation Guide

**Project:** Donasiku  
**Date:** 18 Desember 2025  
**Documentation:** https://docs.duitku.com/

---

## 📋 Overview

Duitku adalah payment gateway Indonesia yang mendukung berbagai metode pembayaran:
- Virtual Account (BCA, BNI, Mandiri, Permata, BRI, etc.)
- QRIS
- E-Wallet (OVO, ShopeePay, LinkAja, DANA, GoPay)
- Credit Card
- Retail Outlets (Alfamart, Indomaret)
- E-Banking
- Paylater (Kredivo, Atome, Indodana)

---

## 🔑 API Endpoints

### Sandbox (Development)
- Payment Methods: `https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod`
- Request Transaction: `https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry`
- Check Transaction: `https://sandbox.duitku.com/webapi/api/merchant/transactionStatus`

### Production
- Payment Methods: `https://passport.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod`
- Request Transaction: `https://passport.duitku.com/webapi/api/merchant/v2/inquiry`
- Check Transaction: `https://passport.duitku.com/webapi/api/merchant/transactionStatus`

---

## 🔐 Authentication & Signature

Duitku menggunakan **MD5 signature** untuk keamanan:

### Get Payment Method Signature
```javascript
signature = SHA256(merchantCode + amount + datetime + apiKey)
```

### Request Transaction Signature
```javascript
signature = MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
```

### Check Transaction Signature
```javascript
signature = MD5(merchantCode + merchantOrderId + apiKey)
```

### Callback Signature Validation
```javascript
signature = MD5(merchantCode + amount + merchantOrderId + apiKey)
```

---

## 🚀 Implementation Flow

### 1. Get Payment Methods (Optional)
Mendapatkan daftar metode pembayaran yang aktif untuk merchant.

**Request:**
```typescript
POST https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod
Content-Type: application/json

{
  "merchantcode": "DXXXX",
  "amount": "10000",
  "datetime": "2025-12-18 10:00:00", // format: YYYY-MM-DD HH:mm:ss
  "signature": "sha256_hash_here"
}
```

**Response:**
```json
{
  "paymentFee": [
    {
      "paymentMethod": "VC",
      "paymentName": "Credit Card",
      "paymentImage": "https://...",
      "totalFee": "1.5%"
    },
    {
      "paymentMethod": "BC",
      "paymentName": "BCA Virtual Account",
      "paymentImage": "https://...",
      "totalFee": "4000"
    }
  ]
}
```

---

### 2. Request Transaction (Main Flow)

**Request:**
```typescript
POST https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry
Content-Type: application/json

{
  "merchantCode": "DXXXX",
  "paymentAmount": 100000,
  "paymentMethod": "BC", // Payment method code
  "merchantOrderId": "INV-1234567890", // Unique order ID
  "productDetails": "Donasi untuk Campaign ABC",
  "email": "donor@example.com",
  "phoneNumber": "08123456789",
  "customerVaName": "John Doe",
  "callbackUrl": "https://yourdomain.com/api/duitku/callback",
  "returnUrl": "https://yourdomain.com/payment/success",
  "expiryPeriod": 1440, // in minutes (24 hours)
  "signature": "md5_hash_here",
  
  // Optional but recommended
  "itemDetails": [
    {
      "name": "Donasi Campaign ABC",
      "price": 100000,
      "quantity": 1
    }
  ],
  "customerDetail": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "donor@example.com",
    "phoneNumber": "08123456789",
    "billingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "address": "Jl. Example No. 123",
      "city": "Jakarta",
      "postalCode": "12345",
      "phone": "08123456789",
      "countryCode": "ID"
    }
  }
}
```

**Response (Success):**
```json
{
  "merchantCode": "DXXXX",
  "reference": "DK12345678",
  "paymentUrl": "https://app-sandbox.duitku.com/payment/...",
  "vaNumber": "1234567890123456",
  "amount": "100000",
  "statusCode": "00",
  "statusMessage": "SUCCESS"
}
```

**Important Fields:**
- `paymentUrl` - Redirect user ke halaman ini untuk melakukan pembayaran
- `reference` - Duitku transaction reference (simpan di database)
- `vaNumber` - Virtual Account number (untuk VA payment method)

---

### 3. Callback Handler

Duitku akan mengirim POST request ke `callbackUrl` setelah pembayaran sukses.

**Callback Payload:**
```json
{
  "merchantCode": "DXXXX",
  "amount": "100000",
  "merchantOrderId": "INV-1234567890",
  "productDetail": "Donasi untuk Campaign ABC",
  "resultCode": "00",
  "reference": "DK12345678",
  "signature": "md5_hash_here",
  "publisherOrderId": "",
  "spUserHash": "",
  "settlementDate": "2025-12-18 10:30:00",
  "paymentCode": "BC"
}
```

**Status Codes:**
- `00` - Success
- `01` - Pending
- `02` - Failed/Expired

**CRITICAL: Validate Signature!**
```javascript
const calculatedSignature = MD5(merchantCode + amount + merchantOrderId + apiKey);
if (signature !== calculatedSignature) {
  throw new Error('Invalid signature - possible fraud attempt');
}
```

---

### 4. Check Transaction Status

Untuk polling status pembayaran atau verifikasi.

**Request:**
```typescript
POST https://sandbox.duitku.com/webapi/api/merchant/transactionStatus
Content-Type: application/json

{
  "merchantCode": "DXXXX",
  "merchantOrderId": "INV-1234567890",
  "signature": "md5_hash_here"
}
```

**Response:**
```json
{
  "merchantOrderId": "INV-1234567890",
  "reference": "DK12345678",
  "amount": "100000",
  "fee": "4000",
  "statusCode": "00",
  "statusMessage": "SUCCESS"
}
```

---

## 📁 Database Schema

### Tabel `transactions`

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Order Information
  merchant_order_id text UNIQUE NOT NULL,
  invoice_code text UNIQUE NOT NULL,
  
  -- Transaction Details
  amount numeric NOT NULL,
  fee numeric DEFAULT 0,
  payment_method text NOT NULL, -- Payment method code (BC, VC, etc)
  payment_method_name text, -- Payment method display name
  
  -- Duitku References
  duitku_reference text UNIQUE, -- Duitku transaction reference
  va_number text, -- Virtual Account number (if applicable)
  payment_url text, -- Duitku payment URL
  
  -- Status
  status text DEFAULT 'pending', -- pending, success, failed, expired
  result_code text, -- Duitku result code
  status_message text, -- Duitku status message
  
  -- Related Data
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Customer Information
  customer_name text,
  customer_email text,
  customer_phone text,
  
  -- Product Information
  product_details text,
  item_details jsonb, -- Store itemDetails array
  
  -- Callback & Return URLs
  callback_url text,
  return_url text,
  
  -- Timestamps
  expiry_time timestamptz,
  settlement_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Additional Parameters
  additional_param text,
  metadata jsonb -- Store any extra data
);

-- Indexes for performance
CREATE INDEX idx_transactions_merchant_order_id ON transactions(merchant_order_id);
CREATE INDEX idx_transactions_duitku_reference ON transactions(duitku_reference);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_campaign_id ON transactions(campaign_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- RLS Policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can create transactions (for donations)
CREATE POLICY "Anyone can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

-- Only system can update transactions (via Edge Functions)
CREATE POLICY "System can update transactions"
  ON transactions FOR UPDATE
  USING (true); -- Add service_role check in Edge Function
```

---

## 🔧 Implementation: Supabase Edge Functions

### Edge Function: `create-duitku-transaction`

**Location:** `/supabase/functions/create-duitku-transaction/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DUITKU_MERCHANT_CODE = Deno.env.get('DUITKU_MERCHANT_CODE') || '';
const DUITKU_API_KEY = Deno.env.get('DUITKU_API_KEY') || '';
const DUITKU_SANDBOX = Deno.env.get('DUITKU_SANDBOX') === 'true';
const DUITKU_BASE_URL = DUITKU_SANDBOX 
  ? 'https://sandbox.duitku.com/webapi/api/merchant'
  : 'https://passport.duitku.com/webapi/api/merchant';

interface CreateTransactionRequest {
  campaignId: string;
  amount: number;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl?: string;
}

// MD5 hash function
async function md5(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', { 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: CreateTransactionRequest = await req.json();
    
    // Validate input
    if (!body.campaignId || !body.amount || !body.paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', body.campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique merchant order ID
    const timestamp = Date.now();
    const merchantOrderId = `DNK-${timestamp}`;
    const invoiceCode = `INV-${timestamp}`;

    // Calculate signature: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
    const signature = await md5(
      DUITKU_MERCHANT_CODE + merchantOrderId + body.amount + DUITKU_API_KEY
    );

    // Prepare callback and return URLs
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/duitku-callback`;
    const returnUrl = body.returnUrl || `${req.headers.get('origin')}/payment/return`;

    // Prepare Duitku request
    const duitkuRequest = {
      merchantCode: DUITKU_MERCHANT_CODE,
      paymentAmount: body.amount,
      paymentMethod: body.paymentMethod,
      merchantOrderId: merchantOrderId,
      productDetails: `Donasi untuk ${campaign.title}`,
      email: body.customerEmail,
      phoneNumber: body.customerPhone,
      customerVaName: body.customerName,
      callbackUrl: callbackUrl,
      returnUrl: returnUrl,
      expiryPeriod: 1440, // 24 hours
      signature: signature,
      itemDetails: [
        {
          name: campaign.title,
          price: body.amount,
          quantity: 1
        }
      ],
      customerDetail: {
        firstName: body.customerName.split(' ')[0] || body.customerName,
        lastName: body.customerName.split(' ').slice(1).join(' ') || '-',
        email: body.customerEmail,
        phoneNumber: body.customerPhone
      }
    };

    // Call Duitku API
    const duitkuResponse = await fetch(
      `${DUITKU_BASE_URL}/v2/inquiry`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duitkuRequest)
      }
    );

    const duitkuData = await duitkuResponse.json();

    if (duitkuResponse.status !== 200 || duitkuData.statusCode !== '00') {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create transaction',
          message: duitkuData.statusMessage || 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Save transaction to database
    const { data: transaction, error: dbError } = await supabase
      .from('transactions')
      .insert({
        merchant_order_id: merchantOrderId,
        invoice_code: invoiceCode,
        amount: body.amount,
        payment_method: body.paymentMethod,
        duitku_reference: duitkuData.reference,
        va_number: duitkuData.vaNumber,
        payment_url: duitkuData.paymentUrl,
        status: 'pending',
        result_code: duitkuData.statusCode,
        status_message: duitkuData.statusMessage,
        campaign_id: body.campaignId,
        customer_name: body.customerName,
        customer_email: body.customerEmail,
        customer_phone: body.customerPhone,
        product_details: `Donasi untuk ${campaign.title}`,
        callback_url: callbackUrl,
        return_url: returnUrl,
        expiry_time: new Date(Date.now() + 1440 * 60 * 1000) // 24 hours from now
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save transaction' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          id: transaction.id,
          merchantOrderId: merchantOrderId,
          invoiceCode: invoiceCode,
          reference: duitkuData.reference,
          paymentUrl: duitkuData.paymentUrl,
          vaNumber: duitkuData.vaNumber,
          amount: body.amount,
          expiryTime: transaction.expiry_time
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### Edge Function: `duitku-callback`

**Location:** `/supabase/functions/duitku-callback/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DUITKU_MERCHANT_CODE = Deno.env.get('DUITKU_MERCHANT_CODE') || '';
const DUITKU_API_KEY = Deno.env.get('DUITKU_API_KEY') || '';
const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN') || '';

// MD5 hash function
async function md5(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Send WhatsApp notification via Fonnte
async function sendWhatsAppNotification(phone: string, message: string) {
  if (!FONNTE_TOKEN) {
    console.warn('FONNTE_TOKEN not configured, skipping WhatsApp notification');
    return;
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: phone,
        message: message,
        countryCode: '62' // Indonesia
      })
    });

    const result = await response.json();
    console.log('WhatsApp notification sent:', result);
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
  }
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse callback data (Duitku sends form-urlencoded)
    const formData = await req.formData();
    const data = Object.fromEntries(formData);

    const {
      merchantCode,
      amount,
      merchantOrderId,
      signature,
      resultCode,
      reference,
      paymentCode,
      settlementDate
    } = data;

    console.log('Duitku callback received:', { merchantOrderId, resultCode });

    // Validate signature
    const calculatedSignature = await md5(
      merchantCode + amount + merchantOrderId + DUITKU_API_KEY
    );

    if (signature !== calculatedSignature) {
      console.error('Invalid signature!', { received: signature, calculated: calculatedSignature });
      return new Response('Invalid signature', { status: 400 });
    }

    // Get transaction from database
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*, campaigns(*)')
      .eq('merchant_order_id', merchantOrderId)
      .single();

    if (txError || !transaction) {
      console.error('Transaction not found:', merchantOrderId);
      return new Response('Transaction not found', { status: 404 });
    }

    // Determine status based on result code
    let status = 'pending';
    if (resultCode === '00') {
      status = 'success';
    } else if (resultCode === '02') {
      status = 'failed';
    }

    // Update transaction
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: status,
        result_code: resultCode,
        settlement_date: settlementDate,
        updated_at: new Date().toISOString()
      })
      .eq('merchant_order_id', merchantOrderId);

    if (updateError) {
      console.error('Failed to update transaction:', updateError);
      return new Response('Failed to update transaction', { status: 500 });
    }

    // If payment successful, update campaign amount and send notification
    if (status === 'success' && transaction.campaign_id) {
      // Update campaign current_amount
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({
          current_amount: (transaction.campaigns.current_amount || 0) + parseFloat(amount)
        })
        .eq('id', transaction.campaign_id);

      if (campaignError) {
        console.error('Failed to update campaign:', campaignError);
      }

      // Create donation record
      await supabase.from('donations').insert({
        campaign_id: transaction.campaign_id,
        donor_name: transaction.customer_name,
        amount: parseFloat(amount),
        payment_method: paymentCode,
        status: 'completed',
        is_anonymous: false
      });

      // Send WhatsApp notification
      if (transaction.customer_phone) {
        const message = `Terima kasih atas donasi Anda!

Invoice: ${transaction.invoice_code}
Campaign: ${transaction.campaigns?.title || 'N/A'}
Jumlah: Rp ${parseInt(amount).toLocaleString('id-ID')}
Status: BERHASIL ✅

Semoga berkah dan bermanfaat. Jazakallah khairan katsiran! 🙏`;

        await sendWhatsAppNotification(transaction.customer_phone, message);
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Callback error:', error);
    return new Response(error.message, { status: 500 });
  }
});
```

---

### Edge Function: `check-duitku-transaction`

**Location:** `/supabase/functions/check-duitku-transaction/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DUITKU_MERCHANT_CODE = Deno.env.get('DUITKU_MERCHANT_CODE') || '';
const DUITKU_API_KEY = Deno.env.get('DUITKU_API_KEY') || '';
const DUITKU_SANDBOX = Deno.env.get('DUITKU_SANDBOX') === 'true';
const DUITKU_BASE_URL = DUITKU_SANDBOX 
  ? 'https://sandbox.duitku.com/webapi/api/merchant'
  : 'https://passport.duitku.com/webapi/api/merchant';

// MD5 hash function
async function md5(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        } 
      });
    }

    const { merchantOrderId } = await req.json();

    if (!merchantOrderId) {
      return new Response(
        JSON.stringify({ error: 'merchantOrderId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate signature
    const signature = await md5(
      DUITKU_MERCHANT_CODE + merchantOrderId + DUITKU_API_KEY
    );

    // Call Duitku Check Transaction API
    const response = await fetch(
      `${DUITKU_BASE_URL}/transactionStatus`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantCode: DUITKU_MERCHANT_CODE,
          merchantOrderId: merchantOrderId,
          signature: signature
        })
      }
    );

    const data = await response.json();

    if (response.status === 200) {
      // Update local transaction status
      let status = 'pending';
      if (data.statusCode === '00') {
        status = 'success';
      } else if (data.statusCode === '02') {
        status = 'failed';
      }

      await supabase
        .from('transactions')
        .update({
          status: status,
          result_code: data.statusCode,
          status_message: data.statusMessage,
          updated_at: new Date().toISOString()
        })
        .eq('merchant_order_id', merchantOrderId);
    }

    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 🎨 Frontend Implementation

### Payment Method Selection

```typescript
// src/components/PaymentMethodSelector.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PaymentMethod {
  paymentMethod: string;
  paymentName: string;
  paymentImage: string;
  totalFee: string;
}

export function PaymentMethodSelector({ amount, onSelect }: { 
  amount: number; 
  onSelect: (method: string) => void;
}) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMethods();
  }, [amount]);

  async function fetchPaymentMethods() {
    try {
      // Call your Edge Function or directly to Duitku
      const datetime = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const merchantCode = import.meta.env.VITE_DUITKU_MERCHANT_CODE;
      const apiKey = import.meta.env.VITE_DUITKU_API_KEY;
      
      // Calculate SHA256 signature
      const signatureString = `${merchantCode}${amount}${datetime}${apiKey}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(signatureString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const response = await fetch(
        'https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantcode: merchantCode,
            amount: amount.toString(),
            datetime: datetime,
            signature: signature
          })
        }
      );

      const data = await response.json();
      setMethods(data.paymentFee || []);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading payment methods...</div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-800">Pilih Metode Pembayaran</h3>
      <div className="grid grid-cols-2 gap-3">
        {methods.map((method) => (
          <button
            key={method.paymentMethod}
            onClick={() => {
              setSelected(method.paymentMethod);
              onSelect(method.paymentMethod);
            }}
            className={`p-4 border-2 rounded-lg transition-all ${
              selected === method.paymentMethod
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <img 
              src={method.paymentImage} 
              alt={method.paymentName}
              className="h-8 mb-2 mx-auto object-contain"
            />
            <p className="text-sm font-medium text-gray-800">{method.paymentName}</p>
            <p className="text-xs text-gray-600">Fee: {method.totalFee}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Create Transaction & Redirect

```typescript
// In your donation form component
async function handlePayment() {
  try {
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('create-duitku-transaction', {
      body: {
        campaignId: campaign.id,
        amount: donationAmount,
        paymentMethod: selectedPaymentMethod,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        returnUrl: `${window.location.origin}/campaign/${campaign.slug}/invoice`
      }
    });

    if (error) throw error;

    if (data.success) {
      // Redirect to Duitku payment page
      window.location.href = data.transaction.paymentUrl;
    }
  } catch (error) {
    console.error('Payment error:', error);
    alert('Gagal membuat transaksi. Silakan coba lagi.');
  } finally {
    setLoading(false);
  }
}
```

### Payment Return Handler

```typescript
// src/pages/PaymentReturnPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  const merchantOrderId = searchParams.get('merchantOrderId');
  const reference = searchParams.get('reference');
  const resultCode = searchParams.get('resultCode');

  useEffect(() => {
    if (merchantOrderId) {
      checkPaymentStatus();
    }
  }, [merchantOrderId]);

  async function checkPaymentStatus() {
    try {
      // Check transaction status via Edge Function
      const { data, error } = await supabase.functions.invoke('check-duitku-transaction', {
        body: { merchantOrderId }
      });

      if (error) throw error;

      if (data.statusCode === '00') {
        setStatus('success');
      } else {
        setStatus('failed');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus('failed');
    }
  }

  if (status === 'checking') {
    return <div>Memeriksa status pembayaran...</div>;
  }

  if (status === 'success') {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          Pembayaran Berhasil! ✅
        </h1>
        <p>Terima kasih atas donasi Anda.</p>
        <p className="text-sm text-gray-600 mt-2">
          Reference: {reference}
        </p>
      </div>
    );
  }

  return (
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold text-red-600 mb-4">
        Pembayaran Gagal ❌
      </h1>
      <p>Silakan coba lagi atau hubungi customer service.</p>
    </div>
  );
}
```

---

## 🧪 Testing

### Sandbox Testing

Duitku menyediakan test credentials untuk testing:

**Virtual Account:**
- Simulasi sukses: Bayar dengan nominal exact amount
- Simulasi gagal: Bayar dengan nominal berbeda

**Test Payment Methods:**
- BC (BCA VA): Test VA number provided
- VC (Credit Card): Use test card numbers dari Duitku docs
- SP (ShopeePay): Test e-wallet flow

**Test Credentials:** Available in Duitku dashboard sandbox

---

## 📝 Environment Variables

```env
# Duitku Configuration
DUITKU_MERCHANT_CODE=DXXXX
DUITKU_API_KEY=your_api_key_here
DUITKU_SANDBOX=true  # Set to false in production

# For frontend (if needed)
VITE_DUITKU_MERCHANT_CODE=DXXXX
VITE_DUITKU_API_KEY=your_api_key_here  # Only if calling directly (not recommended)
```

---

## ✅ Deployment Checklist

- [ ] Create `transactions` table in Supabase
- [ ] Deploy Edge Functions:
  - [ ] `create-duitku-transaction`
  - [ ] `duitku-callback`
  - [ ] `check-duitku-transaction`
- [ ] Set Supabase secrets:
  - [ ] `DUITKU_MERCHANT_CODE`
  - [ ] `DUITKU_API_KEY`
  - [ ] `DUITKU_SANDBOX`
  - [ ] `FONNTE_TOKEN` (for WhatsApp)
- [ ] Configure callback URL di Duitku dashboard
- [ ] Test in sandbox environment
- [ ] Switch to production credentials
- [ ] Monitor callback logs
- [ ] Setup cron job for checking pending transactions

---

## 🔒 Security Best Practices

1. **Always validate signature** in callback handler
2. **Use HTTPS** for callback URL
3. **Never expose API Key** to frontend
4. **Use Edge Functions** for server-side operations
5. **Log all callback attempts** for debugging
6. **Implement idempotency** - don't double-process same callback
7. **Set appropriate RLS policies** on transactions table
8. **Validate amount** before updating campaign
9. **Use environment variables** for credentials
10. **Monitor for fraud** - unusual patterns, amounts, etc.

---

## 📞 Support

- Duitku Docs: https://docs.duitku.com/
- Duitku Support: [support email]
- Postman Collection: https://www.postman.com/duitku/

---

**Last Updated:** 18 Desember 2025
