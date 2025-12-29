import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone } = await req.json()
    const token = Deno.env.get('FONNTE_TOKEN')

    console.log(`Validating phone: ${phone}`);

    if (!token) {
      throw new Error('Server configuration error: FONNTE_TOKEN not set');
    }

    if (!phone) {
      throw new Error('Phone number is required')
    }

    // Call Fonnte API to validate
    const response = await fetch('https://api.fonnte.com/validate', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phone,
        countryCode: '62'
      })
    });

    const data = await response.json();
    console.log('Fonnte validation response:', data);

    // Check if the number is in the 'registered' list
    // Fonnte returns: { status: true, registered: ['08xxx'], not_registered: [] }
    // Or sometimes it might return just the number string in the array.

    // We normalize the input phone to check against response
    // Remove non-digits
    let normalizedInput = phone.replace(/\D/g, '');
    if (normalizedInput.startsWith('0')) normalizedInput = '62' + normalizedInput.slice(1);
    if (normalizedInput.startsWith('8')) normalizedInput = '62' + normalizedInput;

    const isRegistered = data.registered && data.registered.some((p: string) => {
      // Fonnte might return number with @c.us or just digits.
      // Assuming it returns digits (based on docs usually 628xxx)
      let normalizedRegistered = p.replace(/\D/g, '');
      return normalizedRegistered === normalizedInput;
    });

    // Actually, simply checking if 'registered' array has any items 
    // AND 'not_registered' is empty or doesn't contain our number is enough 
    // if we send single target.

    // Simpler check: if `registered` matches our normalized input
    const isValid = isRegistered || (data.registered && data.registered.length > 0 && (!data.not_registered || data.not_registered.length === 0));


    if (!isValid) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'Nomor WhatsApp tidak terdaftar atau tidak aktif.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({ valid: true, message: 'Nomor valid.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ valid: false, message: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
