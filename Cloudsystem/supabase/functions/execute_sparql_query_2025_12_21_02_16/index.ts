
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { query, fuseki_endpoint } = await req.json()

        if (!query) {
            throw new Error('Query is required')
        }

        const { data: { user } } = await supabaseClient.auth.getUser()

        // Default to a public endpoint if localhost is passed and we are in production
        let targetEndpoint = fuseki_endpoint || 'http://localhost:3030/fc/sparql'

        console.log(`Executing SPARQL query on ${targetEndpoint}`)
        const startTime = Date.now()

        let executionStatus = 'success';
        let resultsData = null;
        let errorMsg = null;

        try {
            const response = await fetch(targetEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/sparql-results+json'
                },
                body: new URLSearchParams({ query: query })
            })

            if (!response.ok) {
                const text = await response.text()
                throw new Error(`Fuseki Error: ${response.status} ${text}`)
            }

            resultsData = await response.json()

        } catch (e) {
            executionStatus = 'failed';
            errorMsg = e.message;
            console.error("SPARQL fail:", e);
        }

        const endTime = Date.now()
        const execTime = endTime - startTime

        // Log execution
        if (user) {
            await supabaseClient.from('query_executions_2025_12_21_02_16').insert({
                query: query,
                results: resultsData,
                execution_time: execTime,
                status: executionStatus,
                executed_by: user.id
            })
        }

        if (executionStatus === 'failed') {
            throw new Error(errorMsg || "Unknown error")
        }

        return new Response(
            JSON.stringify({ results: resultsData }),
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
