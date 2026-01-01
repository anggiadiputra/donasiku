import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 1. Verify the caller
        const {
            data: { user },
            error: authError,
        } = await supabaseClient.auth.getUser()

        if (authError || !user) {
            throw new Error('Unauthorized: Invalid token')
        }

        // 2. Check if caller is admin
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError || profile?.role !== 'admin') {
            throw new Error('Unauthorized: Must be an admin')
        }

        // 3. Process the request
        const { email, full_name } = await req.json()

        if (!email || !full_name) {
            throw new Error('Email and Full Name are required')
        }

        // 4. Invite the User
        // Use inviteUserByEmail to send an invitation link.
        // If you prefer to just create without sending email (and manually verify), use createUser.
        // But invite is better for "real" users.
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: { full_name: full_name }
        })

        if (createError) {
            // Handle "User already exists" gracefully if needed, though frontend checks too.
            throw createError
        }

        // Return the new user data
        return new Response(
            JSON.stringify({ user: newUser.user }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
