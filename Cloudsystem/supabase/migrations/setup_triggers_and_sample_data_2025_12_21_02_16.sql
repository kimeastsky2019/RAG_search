-- 사용자 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user_2025_12_21_02_16()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles_2025_12_21_02_16 (user_id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
CREATE OR REPLACE TRIGGER on_auth_user_created_2025_12_21_02_16
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_2025_12_21_02_16();

-- 샘플 데이터 삽입 (테스트용)
INSERT INTO public.datasets_2025_12_21_02_16 (name, description, json_data, uploaded_by) VALUES
('강남구 샘플 데이터', '강남구 지역 정보 샘플 데이터셋', '{
  "district": "강남구",
  "population": 561052,
  "area": 39.5,
  "landmarks": [
    {
      "name": "코엑스",
      "type": "컨벤션센터",
      "location": "삼성동"
    },
    {
      "name": "봉은사",
      "type": "사찰",
      "location": "삼성동"
    }
  ],
  "transportation": {
    "subway_lines": ["2호선", "3호선", "7호선", "9호선"],
    "bus_routes": 150
  }
}', '00000000-0000-0000-0000-000000000000');

INSERT INTO public.policies_2025_12_21_02_16 (name, description, sparql_query, status, created_by) VALUES
('인구 밀도 검증 정책', '지역별 인구 밀도가 적정 수준인지 검증하는 정책', 'PREFIX ex: <http://example.org/ontology#>
SELECT ?district ?population ?area ?density
WHERE {
  ?district ex:population ?population ;
           ex:area ?area .
  BIND(?population / ?area AS ?density)
  FILTER(?density > 10000)
}', 'active', '00000000-0000-0000-0000-000000000000'),

('교통 인프라 평가 정책', '지역별 교통 인프라 충족도를 평가하는 정책', 'PREFIX ex: <http://example.org/ontology#>
SELECT ?district ?subwayLines ?busRoutes
WHERE {
  ?district ex:transportation ?transport .
  ?transport ex:subway_lines ?subwayLines ;
            ex:bus_routes ?busRoutes .
  FILTER(?busRoutes < 100)
}', 'draft', '00000000-0000-0000-0000-000000000000');