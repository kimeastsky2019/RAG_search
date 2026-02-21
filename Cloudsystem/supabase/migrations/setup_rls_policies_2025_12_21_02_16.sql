-- RLS 정책 설정
-- RLS 활성화
ALTER TABLE public.user_profiles_2025_12_21_02_16 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets_2025_12_21_02_16 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttl_files_2025_12_21_02_16 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies_2025_12_21_02_16 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_executions_2025_12_21_02_16 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_analyses_2025_12_21_02_16 ENABLE ROW LEVEL SECURITY;

-- 사용자 프로필 정책
CREATE POLICY "Users can view own profile" ON public.user_profiles_2025_12_21_02_16
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles_2025_12_21_02_16
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles_2025_12_21_02_16
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 데이터셋 정책
CREATE POLICY "Users can view own datasets" ON public.datasets_2025_12_21_02_16
    FOR SELECT USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can insert own datasets" ON public.datasets_2025_12_21_02_16
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own datasets" ON public.datasets_2025_12_21_02_16
    FOR UPDATE USING (auth.uid() = uploaded_by);

-- TTL 파일 정책
CREATE POLICY "Users can view own ttl files" ON public.ttl_files_2025_12_21_02_16
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own ttl files" ON public.ttl_files_2025_12_21_02_16
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 정책 정책 (모든 사용자가 볼 수 있지만 수정은 작성자만)
CREATE POLICY "All users can view policies" ON public.policies_2025_12_21_02_16
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own policies" ON public.policies_2025_12_21_02_16
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own policies" ON public.policies_2025_12_21_02_16
    FOR UPDATE USING (auth.uid() = created_by);

-- 쿼리 실행 로그 정책
CREATE POLICY "Users can view own query executions" ON public.query_executions_2025_12_21_02_16
    FOR SELECT USING (auth.uid() = executed_by);

CREATE POLICY "Users can insert own query executions" ON public.query_executions_2025_12_21_02_16
    FOR INSERT WITH CHECK (auth.uid() = executed_by);

-- LLM 분석 정책
CREATE POLICY "Users can view own llm analyses" ON public.llm_analyses_2025_12_21_02_16
    FOR SELECT USING (auth.uid() = analyzed_by);

CREATE POLICY "Users can insert own llm analyses" ON public.llm_analyses_2025_12_21_02_16
    FOR INSERT WITH CHECK (auth.uid() = analyzed_by);