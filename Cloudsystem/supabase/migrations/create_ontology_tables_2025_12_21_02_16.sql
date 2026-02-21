-- 온톨로지 데이터 시스템 테이블 생성
-- 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS public.user_profiles_2025_12_21_02_16 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'analyst', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 데이터셋 테이블 (업로드된 JSON 데이터)
CREATE TABLE IF NOT EXISTS public.datasets_2025_12_21_02_16 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    json_data JSONB NOT NULL,
    file_size INTEGER,
    uploaded_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'processing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TTL 파일 테이블
CREATE TABLE IF NOT EXISTS public.ttl_files_2025_12_21_02_16 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES public.datasets_2025_12_21_02_16(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ttl_content TEXT NOT NULL,
    base_uri TEXT,
    namespace TEXT,
    conversion_settings JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 정책 테이블
CREATE TABLE IF NOT EXISTS public.policies_2025_12_21_02_16 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    sparql_query TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'inactive')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SPARQL 쿼리 실행 로그
CREATE TABLE IF NOT EXISTS public.query_executions_2025_12_21_02_16 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES public.policies_2025_12_21_02_16(id),
    query TEXT NOT NULL,
    results JSONB,
    execution_time INTEGER, -- milliseconds
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
    error_message TEXT,
    executed_by UUID REFERENCES auth.users(id),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LLM 분석 결과 테이블
CREATE TABLE IF NOT EXISTS public.llm_analyses_2025_12_21_02_16 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES public.policies_2025_12_21_02_16(id),
    analysis_type TEXT DEFAULT 'quality' CHECK (analysis_type IN ('quality', 'performance', 'optimization')),
    analysis_result TEXT NOT NULL,
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    recommendations JSONB,
    llm_model TEXT DEFAULT 'llama3',
    analyzed_by UUID REFERENCES auth.users(id),
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_datasets_uploaded_by ON public.datasets_2025_12_21_02_16(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_datasets_status ON public.datasets_2025_12_21_02_16(status);
CREATE INDEX IF NOT EXISTS idx_policies_created_by ON public.policies_2025_12_21_02_16(created_by);
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies_2025_12_21_02_16(status);
CREATE INDEX IF NOT EXISTS idx_query_executions_policy_id ON public.query_executions_2025_12_21_02_16(policy_id);
CREATE INDEX IF NOT EXISTS idx_llm_analyses_policy_id ON public.llm_analyses_2025_12_21_02_16(policy_id);