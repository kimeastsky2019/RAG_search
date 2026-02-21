import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

interface QueryRequest {
  query: string;
  policy_id?: string;
  fuseki_endpoint?: string;
}

interface QueryResult {
  results: any;
  execution_time: number;
  status: 'success' | 'error' | 'timeout';
  error_message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request body
    const { query, policy_id, fuseki_endpoint = 'http://localhost:3030/fc/sparql' }: QueryRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: query' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute SPARQL query
    const startTime = Date.now();
    const queryResult = await executeSPARQLQuery(query, fuseki_endpoint);
    const executionTime = Date.now() - startTime;

    // Save query execution log to database
    const { data: logData, error: insertError } = await supabaseClient
      .from('query_executions_2025_12_21_02_16')
      .insert({
        policy_id,
        query,
        results: queryResult.results,
        execution_time: executionTime,
        status: queryResult.status,
        error_message: queryResult.error_message,
        executed_by: req.headers.get('user-id') // This would come from JWT
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Continue even if logging fails
    }

    return new Response(
      JSON.stringify({
        success: queryResult.status === 'success',
        results: queryResult.results,
        execution_time: executionTime,
        status: queryResult.status,
        error_message: queryResult.error_message,
        log_id: logData?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in execute_sparql_query:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function executeSPARQLQuery(query: string, endpoint: string): Promise<QueryResult> {
  try {
    // In a real implementation, this would connect to Fuseki server
    // For now, we'll simulate the query execution with mock data
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Generate mock results based on query type
    const results = generateMockResults(query);
    
    return {
      results,
      execution_time: 500 + Math.random() * 1000,
      status: 'success'
    };

  } catch (error) {
    return {
      results: null,
      execution_time: 0,
      status: 'error',
      error_message: error.message
    };
  }
}

function generateMockResults(query: string): any {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('?subject ?predicate ?object')) {
    return {
      head: { vars: ['subject', 'predicate', 'object'] },
      results: {
        bindings: [
          {
            subject: { type: 'uri', value: 'http://example.org/ontology#강남구' },
            predicate: { type: 'uri', value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' },
            object: { type: 'uri', value: 'http://example.org/ontology#District' }
          },
          {
            subject: { type: 'uri', value: 'http://example.org/ontology#강남구' },
            predicate: { type: 'uri', value: 'http://example.org/ontology#population' },
            object: { type: 'literal', value: '561052', datatype: 'http://www.w3.org/2001/XMLSchema#integer' }
          },
          {
            subject: { type: 'uri', value: 'http://example.org/ontology#강남구' },
            predicate: { type: 'uri', value: 'http://example.org/ontology#area' },
            object: { type: 'literal', value: '39.5', datatype: 'http://www.w3.org/2001/XMLSchema#decimal' }
          }
        ]
      }
    };
  }
  
  if (lowerQuery.includes('?district ?population ?area')) {
    return {
      head: { vars: ['district', 'population', 'area'] },
      results: {
        bindings: [
          {
            district: { type: 'uri', value: 'http://example.org/ontology#강남구' },
            population: { type: 'literal', value: '561052', datatype: 'http://www.w3.org/2001/XMLSchema#integer' },
            area: { type: 'literal', value: '39.5', datatype: 'http://www.w3.org/2001/XMLSchema#decimal' }
          }
        ]
      }
    };
  }
  
  if (lowerQuery.includes('?landmark ?type ?location')) {
    return {
      head: { vars: ['landmark', 'type', 'location'] },
      results: {
        bindings: [
          {
            landmark: { type: 'literal', value: '코엑스' },
            type: { type: 'literal', value: '컨벤션센터' },
            location: { type: 'literal', value: '삼성동' }
          },
          {
            landmark: { type: 'literal', value: '봉은사' },
            type: { type: 'literal', value: '사찰' },
            location: { type: 'literal', value: '삼성동' }
          }
        ]
      }
    };
  }
  
  if (lowerQuery.includes('?subwaylines ?busroutes')) {
    return {
      head: { vars: ['district', 'subwayLines', 'busRoutes'] },
      results: {
        bindings: [
          {
            district: { type: 'uri', value: 'http://example.org/ontology#강남구' },
            subwayLines: { type: 'literal', value: '2호선,3호선,7호선,9호선' },
            busRoutes: { type: 'literal', value: '150', datatype: 'http://www.w3.org/2001/XMLSchema#integer' }
          }
        ]
      }
    };
  }
  
  // Default empty result
  return {
    head: { vars: [] },
    results: {
      bindings: []
    }
  };
}