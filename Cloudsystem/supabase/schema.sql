
-- Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Datasets Table
CREATE TABLE IF NOT EXISTS public.datasets_2025_12_21_02_16 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  json_data JSONB,
  file_size BIGINT,
  status TEXT DEFAULT 'active',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create TTL Files Table
CREATE TABLE IF NOT EXISTS public.ttl_files_2025_12_21_02_16 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES public.datasets_2025_12_21_02_16(id),
  ttl_content TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Policies Table
CREATE TABLE IF NOT EXISTS public.policies_2025_12_21_02_16 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sparql_query TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create LLM Analysis Table
CREATE TABLE IF NOT EXISTS public.llm_analyses_2025_12_21_02_16 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID REFERENCES public.policies_2025_12_21_02_16(id) ON DELETE CASCADE,
  analysis_result TEXT,
  quality_score INTEGER,
  recommendations JSONB,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Query Executions Table
CREATE TABLE IF NOT EXISTS public.query_executions_2025_12_21_02_16 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  results JSONB,
  execution_time INTEGER,
  status TEXT,
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets_2025_12_21_02_16 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttl_files_2025_12_21_02_16 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies_2025_12_21_02_16 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_analyses_2025_12_21_02_16 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_executions_2025_12_21_02_16 ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: Users can view/edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Datasets: Users can view/create/delete their own datasets
CREATE POLICY "Users can view own datasets" ON public.datasets_2025_12_21_02_16 FOR SELECT USING (auth.uid() = uploaded_by);
CREATE POLICY "Users can insert own datasets" ON public.datasets_2025_12_21_02_16 FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete own datasets" ON public.datasets_2025_12_21_02_16 FOR DELETE USING (auth.uid() = uploaded_by);

-- Policies: Users can view/create/update/delete their own policies
CREATE POLICY "Users can view own policies" ON public.policies_2025_12_21_02_16 FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert own policies" ON public.policies_2025_12_21_02_16 FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own policies" ON public.policies_2025_12_21_02_16 FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own policies" ON public.policies_2025_12_21_02_16 FOR DELETE USING (auth.uid() = created_by);

-- LLM Analyses: Users can view analysis for their policies
-- (Assuming analyses are linked to policies which are linked to users)
CREATE POLICY "Users can view analysis of their policies" ON public.llm_analyses_2025_12_21_02_16 FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.policies_2025_12_21_02_16 p
    WHERE p.id = llm_analyses_2025_12_21_02_16.policy_id AND p.created_by = auth.uid()
  )
);
CREATE POLICY "Users can insert analysis" ON public.llm_analyses_2025_12_21_02_16 FOR INSERT WITH CHECK (true); -- Allow insertion by Edge Functions

-- Query Executions
CREATE POLICY "Users can view own executions" ON public.query_executions_2025_12_21_02_16 FOR SELECT USING (auth.uid() = executed_by);
CREATE POLICY "Users can insert own executions" ON public.query_executions_2025_12_21_02_16 FOR INSERT WITH CHECK (auth.uid() = executed_by);

-- Triggers
-- Handle new user signup -> Create Profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
