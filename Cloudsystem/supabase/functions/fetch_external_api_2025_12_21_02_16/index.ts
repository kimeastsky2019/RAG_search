
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { url, method, headers, body } = await req.json()

        if (!url) {
            throw new Error('URL is required')
        }

        console.log(`Proxying request to: ${url}`)

        const fetchOptions: RequestInit = {
            method: method || 'GET',
            headers: headers || { 'Content-Type': 'application/json' },
        }

        if (body && method !== 'GET' && method !== 'HEAD') {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
        }

        const response = await fetch(url, fetchOptions)

        // Attempt to parse JSON, if fails return text
        const contentType = response.headers.get('content-type')
        let responseData
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json()
        } else {
            responseData = { text: await response.text() }
        }

        return new Response(
            JSON.stringify(responseData),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
