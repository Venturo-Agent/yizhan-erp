-- 為現有團補建提案和套件（僅在 main_city_id 欄位存在時執行）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tours' AND column_name='main_city_id') THEN
    RAISE NOTICE '⚠️ tours.main_city_id 不存在，跳過 backfill';
    RETURN;
  END IF;

  -- 1. 為每個沒有 proposal 的團建立提案
  INSERT INTO public.proposals (
    id, code, customer_name, title, destination, country_id, main_city_id,
    expected_start_date, expected_end_date, group_size, status,
    converted_tour_id, converted_at, workspace_id, created_by, created_at, updated_at
  )
  SELECT
    gen_random_uuid() as id,
    'P' || LPAD((
      COALESCE((SELECT MAX(NULLIF(regexp_replace(code, '[^0-9]', '', 'g'), '')::integer) FROM public.proposals), 0) +
      ROW_NUMBER() OVER (ORDER BY t.created_at)
    )::text, 6, '0') as code,
    COALESCE(c.name, t.name, '未知客戶') as customer_name,
    t.name as title,
    t.location as destination,
    t.country_id,
    t.main_city_id,
    t.departure_date as expected_start_date,
    t.return_date as expected_end_date,
    t.max_participants as group_size,
    'converted' as status,
    t.id as converted_tour_id,
    t.created_at as converted_at,
    t.workspace_id,
    t.created_by,
    t.created_at,
    t.created_at as updated_at
  FROM public.tours t
  LEFT JOIN public.customers c ON c.id = (
    SELECT customer_id FROM public.orders WHERE tour_id = t.id LIMIT 1
  )
  WHERE t.proposal_id IS NULL
    AND t.converted_from_proposal IS NOT TRUE
    AND t.workspace_id IS NOT NULL;

  -- 2. 為每個新建的提案建立套件
  INSERT INTO public.proposal_packages (
    id, proposal_id, version_name, version_number, country_id, main_city_id,
    destination, start_date, end_date, days, nights, group_size,
    is_selected, is_active, created_at, updated_at
  )
  SELECT
    gen_random_uuid() as id,
    p.id as proposal_id,
    '原始方案' as version_name,
    COALESCE((SELECT MAX(version_number) FROM public.proposal_packages WHERE proposal_id = p.id), 0) + 1 as version_number,
    t.country_id,
    t.main_city_id,
    t.location as destination,
    t.departure_date as start_date,
    t.return_date as end_date,
    CASE WHEN t.departure_date IS NOT NULL AND t.return_date IS NOT NULL
      THEN (t.return_date - t.departure_date + 1)::integer ELSE NULL END as days,
    CASE WHEN t.departure_date IS NOT NULL AND t.return_date IS NOT NULL
      THEN (t.return_date - t.departure_date)::integer ELSE NULL END as nights,
    t.max_participants as group_size,
    true as is_selected,
    true as is_active,
    t.created_at,
    t.created_at as updated_at
  FROM public.proposals p
  JOIN public.tours t ON t.id = p.converted_tour_id
  WHERE p.status = 'converted'
    AND NOT EXISTS (SELECT 1 FROM public.proposal_packages pp WHERE pp.proposal_id = p.id);

  -- 3. 更新 tours 表
  UPDATE public.tours t
  SET proposal_id = p.id, proposal_package_id = pp.id, converted_from_proposal = true
  FROM public.proposals p
  JOIN public.proposal_packages pp ON pp.proposal_id = p.id
  WHERE t.id = p.converted_tour_id AND t.proposal_id IS NULL;

  -- 4. 更新提案的 selected_package_id
  UPDATE public.proposals p
  SET selected_package_id = pp.id
  FROM public.proposal_packages pp
  WHERE pp.proposal_id = p.id AND pp.is_selected = true AND p.selected_package_id IS NULL;

  -- 5. 把現有報價單關聯到套件
  UPDATE public.quotes q
  SET proposal_package_id = t.proposal_package_id
  FROM public.tours t
  WHERE q.tour_id = t.id AND t.proposal_package_id IS NOT NULL AND q.proposal_package_id IS NULL;

  -- 6. 把現有行程表關聯到套件
  UPDATE public.itineraries i
  SET proposal_package_id = t.proposal_package_id
  FROM public.tours t
  WHERE i.tour_id = t.id AND t.proposal_package_id IS NOT NULL AND i.proposal_package_id IS NULL;

  -- 7. 更新套件的 quote_id 和 itinerary_id
  UPDATE public.proposal_packages pp
  SET quote_id = (SELECT q.id FROM public.quotes q WHERE q.proposal_package_id = pp.id LIMIT 1)
  WHERE pp.quote_id IS NULL;

  UPDATE public.proposal_packages pp
  SET itinerary_id = (SELECT i.id FROM public.itineraries i WHERE i.proposal_package_id = pp.id LIMIT 1)
  WHERE pp.itinerary_id IS NULL;

END $$;
