
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
        const { policy_id, sparql_query, policy_name } = await req.json()

        console.log(`Analyzing policy: ${policy_name}`)

        // Simulation of LLM Analysis (or connect to OpenAI/Ollama here)
        // To make this robust without API keys, we implement a rule-based heuristic "simulation"
        // that mimics an LLM response.

        let score = 70;
        let analysis = "";
        let recommendations = [];

        // Simple heuristics
        if (sparql_query.includes("LIMIT")) {
            score += 10;
            analysis += "• LIMIT clause found: Good for performance.\n";
        } else {
            score -= 10;
            analysis += "• Missing LIMIT clause: Risk of large result sets.\n";
            recommendations.push("Add LIMIT clause to restrict result size.");
        }

        if (sparql_query.includes("FILTER")) {
            score += 10;
            analysis += "• FILTER used: Precise data retrieval.\n";
        }

        if (sparql_query.includes("OPTIONAL")) {
            score += 5;
            analysis += "• OPTIONAL used: Handles missing data gracefully.\n";
        }

        if (!sparql_query.includes("PREFIX")) {
            score -= 20;
            analysis += "• No PREFIX defined: Queries may be verbose or fail.\n";
            recommendations.push("Define PREFIXes for cleaner queries.");
        }

        // formatting
        if (score > 100) score = 100;
        if (score < 0) score = 0;

        const fullAnalysis = `Policy Analysis for "${policy_name}":\n\nQuality Score: ${score}/100\n\nKey Findings:\n${analysis}\nrecommendations:\n${recommendations.join('\n')}`;

        const result = {
            id: crypto.randomUUID(),
            policy_id: policy_id,
            quality_score: score,
            analysis_result: fullAnalysis,
            recommendations: recommendations,
            analyzed_at: new Date().toISOString()
        };

        // In a real scenario, you would insert this 'result' into the 'llm_analyses' table here as well
        // or let the frontend do it. The frontend code suggests it just receives the data and displays it, 
        // but typically the Edge Function might save it too. 
        // Existing frontend 'handleLLMAnalysis' calls this function and then expects 'data.analysis'.

        return new Response(
            JSON.stringify({ analysis: result }),
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
