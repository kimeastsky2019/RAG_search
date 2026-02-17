import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

interface AnalysisRequest {
  policy_id: string;
  sparql_query: string;
  policy_name: string;
  analysis_type?: 'quality' | 'performance' | 'optimization';
}

interface AnalysisResult {
  quality_score: number;
  analysis_result: string;
  recommendations: {
    strengths: string[];
    improvements: string[];
    suggestions: string[];
    performance: {
      estimated_time: string;
      memory_usage: string;
      scalability: string;
    };
  };
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
    const { policy_id, sparql_query, policy_name, analysis_type = 'quality' }: AnalysisRequest = await req.json();

    if (!policy_id || !sparql_query) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: policy_id, sparql_query' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simulate LLM analysis (in real implementation, this would call Ollama API)
    const analysisResult = await performLLMAnalysis(sparql_query, policy_name, analysis_type);

    // Save analysis result to database
    const { data: analysisData, error: insertError } = await supabaseClient
      .from('llm_analyses_2025_12_21_02_16')
      .insert({
        policy_id,
        analysis_type,
        analysis_result: analysisResult.analysis_result,
        quality_score: analysisResult.quality_score,
        recommendations: analysisResult.recommendations,
        llm_model: 'llama3',
        analyzed_by: req.headers.get('user-id') // This would come from JWT
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save analysis result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        analysis_id: analysisData.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze_policy_quality:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performLLMAnalysis(sparqlQuery: string, policyName: string, analysisType: string): Promise<AnalysisResult> {
  // Simulate LLM processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Analyze SPARQL query structure
  const hasPrefix = sparqlQuery.includes('PREFIX');
  const hasFilter = sparqlQuery.includes('FILTER');
  const hasOptional = sparqlQuery.includes('OPTIONAL');
  const hasUnion = sparqlQuery.includes('UNION');
  const hasLimit = sparqlQuery.includes('LIMIT');
  const queryLength = sparqlQuery.length;
  const complexityScore = calculateComplexityScore(sparqlQuery);

  // Calculate quality score
  let qualityScore = 60; // Base score
  if (hasPrefix) qualityScore += 10;
  if (hasFilter) qualityScore += 10;
  if (hasLimit) qualityScore += 5;
  if (queryLength > 100 && queryLength < 500) qualityScore += 10;
  if (complexityScore < 5) qualityScore += 5;

  // Generate analysis result
  const analysisResult = generateAnalysisText(policyName, sparqlQuery, qualityScore, {
    hasPrefix, hasFilter, hasOptional, hasUnion, hasLimit, queryLength, complexityScore
  });

  // Generate recommendations
  const recommendations = generateRecommendations({
    hasPrefix, hasFilter, hasOptional, hasUnion, hasLimit, queryLength, complexityScore
  });

  return {
    quality_score: Math.min(qualityScore, 100),
    analysis_result: analysisResult,
    recommendations
  };
}

function calculateComplexityScore(query: string): number {
  let complexity = 0;
  if (query.includes('JOIN')) complexity += 2;
  if (query.includes('UNION')) complexity += 2;
  if (query.includes('OPTIONAL')) complexity += 1;
  if (query.includes('FILTER')) complexity += 1;
  if (query.includes('GROUP BY')) complexity += 2;
  if (query.includes('ORDER BY')) complexity += 1;
  return complexity;
}

function generateAnalysisText(policyName: string, query: string, score: number, metrics: any): string {
  return `
LLM 품질 분석 결과: ${policyName}

📊 정책 품질 점수: ${score}/100

✅ 강점:
${metrics.hasPrefix ? '- SPARQL 쿼리 구문이 정확합니다 (PREFIX 사용)' : ''}
${metrics.hasFilter ? '- 필터 조건이 명확하게 정의되어 있습니다' : ''}
${metrics.hasLimit ? '- 성능 최적화를 위한 LIMIT 절이 포함되어 있습니다' : ''}
${metrics.queryLength > 100 && metrics.queryLength < 500 ? '- 적절한 쿼리 길이를 유지하고 있습니다' : ''}

⚠️ 개선 사항:
${!metrics.hasPrefix ? '- PREFIX 선언을 추가하여 네임스페이스를 명확히 하세요' : ''}
${!metrics.hasFilter ? '- 더 구체적인 필터 조건 설정을 권장합니다' : ''}
${!metrics.hasLimit ? '- 성능을 위해 LIMIT 절 추가를 고려하세요' : ''}
${metrics.queryLength > 500 ? '- 쿼리가 너무 복잡합니다. 단순화를 고려하세요' : ''}

🔍 권장 사항:
- OPTIONAL 절을 사용하여 누락된 데이터 처리 고려
- UNION을 활용한 다중 조건 검색 검토
- 성능 최적화를 위한 인덱스 활용 검토

📈 예상 성능:
- 실행 시간: ~${metrics.complexityScore * 50}ms
- 메모리 사용량: ${metrics.complexityScore < 3 ? '낮음' : metrics.complexityScore < 6 ? '보통' : '높음'}
- 확장성: ${metrics.complexityScore < 4 ? '양호' : '검토 필요'}
  `;
}

function generateRecommendations(metrics: any) {
  const strengths = [];
  const improvements = [];
  const suggestions = [];

  if (metrics.hasPrefix) strengths.push('네임스페이스 사용이 적절합니다');
  if (metrics.hasFilter) strengths.push('필터 조건이 명확합니다');
  if (metrics.hasLimit) strengths.push('성능 최적화가 고려되었습니다');

  if (!metrics.hasPrefix) improvements.push('PREFIX 선언 추가');
  if (!metrics.hasFilter) improvements.push('구체적인 필터 조건 설정');
  if (!metrics.hasOptional) improvements.push('OPTIONAL 절을 통한 데이터 누락 처리');

  suggestions.push('정기적인 쿼리 성능 모니터링');
  suggestions.push('데이터 증가에 따른 확장성 검토');
  suggestions.push('인덱스 최적화 고려');

  return {
    strengths,
    improvements,
    suggestions,
    performance: {
      estimated_time: `~${metrics.complexityScore * 50}ms`,
      memory_usage: metrics.complexityScore < 3 ? '낮음' : metrics.complexityScore < 6 ? '보통' : '높음',
      scalability: metrics.complexityScore < 4 ? '양호' : '검토 필요'
    }
  };
}