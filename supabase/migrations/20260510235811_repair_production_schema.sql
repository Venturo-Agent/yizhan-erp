-- repair production schema: 補回 42 張缺失的表 + 必要 enums
-- production 從未 apply 過 accounting / ref / tour 等模組的整批 migration
-- idempotent: 全部 CREATE TABLE IF NOT EXISTS / CREATE TYPE IF NOT EXISTS
-- 沒帶 FK / index、避免循環依賴問題、之後再補

BEGIN;

-- ===== ENUMS =====
DO $$ BEGIN
  CREATE TYPE public.subledger_type AS ENUM ('customer','supplier','bank','group','employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.voucher_status AS ENUM ('draft','posted','reversed','locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('pending','processing','completed','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('low','normal','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== SEQUENCES =====
CREATE SEQUENCE IF NOT EXISTS public.tasks_id_seq;

-- ===== ACCOUNTING =====
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid,
  code text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL,
  parent_id uuid,
  is_system_locked boolean DEFAULT false,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_favorite boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  last_used_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  code character varying(20) NOT NULL,
  name character varying(100) NOT NULL,
  bank_name character varying(100),
  account_number character varying(50),
  account_id uuid,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid,
  voucher_no text NOT NULL,
  voucher_date date NOT NULL,
  memo text,
  company_unit text DEFAULT 'DEFAULT'::text,
  event_id uuid,
  status public.voucher_status DEFAULT 'posted',
  total_debit numeric(20,2) DEFAULT 0,
  total_credit numeric(20,2) DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  reversed_from_id uuid,
  reversed_by_id uuid,
  source_type character varying(50),
  source_id uuid
);

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id uuid,
  line_no integer NOT NULL,
  account_id uuid,
  subledger_type public.subledger_type,
  subledger_id uuid,
  description text,
  debit_amount numeric(20,2) DEFAULT 0,
  credit_amount numeric(20,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_period_closings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid,
  period_type character varying(10) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  closing_voucher_id uuid,
  net_income numeric(15,2) NOT NULL DEFAULT 0,
  closed_by uuid,
  closed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  check_number text NOT NULL,
  check_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric(20,2) NOT NULL,
  payee_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  memo text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number text NOT NULL,
  order_id text,
  customer_id text,
  payment_method text NOT NULL,
  payment_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  confirmed_at timestamp with time zone,
  confirmed_by text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  workspace_id uuid NOT NULL,
  order_number character varying(50),
  tour_name character varying(255),
  receipt_type integer NOT NULL DEFAULT 1,
  receipt_amount numeric(20,2) NOT NULL,
  actual_amount numeric(20,2) DEFAULT 0,
  receipt_date date,
  receipt_account character varying(255),
  fees numeric(20,2),
  created_by uuid,
  updated_by uuid,
  customer_name text,
  tour_id text,
  accounting_subject_id uuid,
  payment_method_id uuid NOT NULL,
  batch_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  transferred_pair_id uuid,
  refunded_at timestamp with time zone,
  refund_amount numeric(20,2),
  refund_voucher_id uuid,
  refund_notes text,
  refunded_by uuid,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  deleted_reason text
);

CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  tour_id text,
  request_type text NOT NULL,
  amount numeric(20,2) NOT NULL,
  supplier_id text,
  supplier_name text,
  status text DEFAULT 'pending'::text,
  approved_by uuid,
  approved_at timestamp with time zone,
  paid_by uuid,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  workspace_id uuid NOT NULL,
  request_date date DEFAULT CURRENT_DATE,
  total_amount numeric(20,2) DEFAULT 0,
  tour_code text,
  tour_name text,
  budget_warning boolean DEFAULT false,
  created_by uuid,
  updated_by uuid,
  notes text,
  order_id text,
  order_number text,
  created_by_name text,
  request_category character varying(20) DEFAULT 'tour'::character varying,
  expense_type character varying(10),
  is_special_billing boolean DEFAULT false,
  request_number text,
  batch_id uuid,
  accounting_subject_id uuid,
  payment_method_id uuid,
  accounting_voucher_id uuid,
  transferred_pair_id uuid,
  disbursement_order_id uuid,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  deleted_reason text
);

-- disbursement_orders 已存在於本地 migration、production 沒、補上
CREATE TABLE IF NOT EXISTS public.disbursement_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text,
  amount numeric(20,2) NOT NULL,
  payment_method text,
  status text NOT NULL DEFAULT 'pending'::text,
  handled_by text,
  handled_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  workspace_id uuid NOT NULL,
  updated_by uuid,
  order_number text,
  disbursement_date date,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  created_by uuid,
  pdf_url text,
  disbursement_type character varying(20) DEFAULT 'payment_request'::character varying,
  refund_id uuid,
  bank_account_id uuid,
  accounting_voucher_id uuid,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  deleted_reason text
);

-- ===== BUSINESS CORE =====
CREATE TABLE IF NOT EXISTS public.quotes (
  id text NOT NULL PRIMARY KEY,
  code text,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  destination text,
  start_date date,
  end_date date,
  days integer,
  nights integer,
  adult_count integer DEFAULT 0,
  child_count integer DEFAULT 0,
  infant_count integer DEFAULT 0,
  total_amount numeric(20,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'::text,
  valid_until date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  group_size integer DEFAULT 0,
  accommodation_days integer,
  version integer DEFAULT 1,
  created_by text,
  created_by_name text,
  converted_to_tour boolean DEFAULT false,
  tour_id text,
  categories jsonb DEFAULT '[]'::jsonb,
  versions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  number_of_people integer DEFAULT 0,
  customer_id text,
  participant_counts jsonb DEFAULT '{"adult": 1, "infant": 0, "single_room": 0, "child_no_bed": 0, "child_with_bed": 0}'::jsonb,
  selling_prices jsonb DEFAULT '{"adult": 0, "infant": 0, "single_room": 0, "child_no_bed": 0, "child_with_bed": 0}'::jsonb,
  total_cost numeric(20,2) DEFAULT 0,
  is_pinned boolean DEFAULT false,
  country_id text,
  airport_code text,
  other_city_ids text[] DEFAULT '{}'::text[],
  quote_type text DEFAULT 'standard'::text,
  contact_phone text,
  contact_address text,
  tour_code text,
  handler_name text DEFAULT 'William'::text,
  issue_date date DEFAULT CURRENT_DATE,
  received_amount numeric(20,2) DEFAULT 0,
  balance_amount numeric(20,2) DEFAULT 0,
  quick_quote_items jsonb DEFAULT '[]'::jsonb,
  workspace_id uuid NOT NULL,
  shared_with_workspaces uuid[] DEFAULT '{}'::uuid[],
  updated_by uuid,
  current_version_index integer DEFAULT 0,
  itinerary_id text,
  expense_description text,
  tier_pricings jsonb DEFAULT '[]'::jsonb,
  confirmation_status text DEFAULT 'draft'::text,
  confirmation_token text,
  confirmation_token_expires_at timestamp with time zone,
  confirmed_at timestamp with time zone,
  confirmed_by_type text,
  confirmed_by_name text,
  confirmed_by_email text,
  confirmed_by_phone text,
  confirmed_by_staff_id text,
  confirmed_version integer,
  confirmation_ip text,
  confirmation_user_agent text,
  confirmation_notes text,
  cost_structure jsonb,
  profit_margin numeric,
  confirmed_by text,
  customer_confirmed_at timestamp with time zone,
  display_price numeric,
  is_locked boolean DEFAULT false,
  locked_at timestamp with time zone,
  locked_by uuid,
  overall_margin_percent numeric,
  country_code text,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  deleted_reason text
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  tour_id text NOT NULL,
  code character varying(30) NOT NULL,
  template character varying(50) NOT NULL,
  signer_type character varying(20) DEFAULT 'individual'::character varying,
  signer_name character varying(100),
  signer_id_number character varying(20),
  signer_phone character varying(30),
  signer_address text,
  company_name character varying(200),
  company_tax_id character varying(20),
  company_representative character varying(100),
  company_address text,
  emergency_contact_name character varying(100),
  emergency_contact_relation character varying(50),
  emergency_contact_phone character varying(30),
  member_ids uuid[] DEFAULT '{}'::uuid[],
  contract_data jsonb DEFAULT '{}'::jsonb,
  status character varying(20) DEFAULT 'draft'::character varying,
  sent_via character varying(20),
  sent_to character varying(200),
  sent_at timestamp with time zone,
  signature_image text,
  signature_ip character varying(50),
  signature_user_agent text,
  signed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  include_member_list boolean DEFAULT false,
  include_itinerary boolean DEFAULT false,
  order_id text
);

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  company_name text NOT NULL,
  tax_id text,
  phone text,
  email text,
  website text,
  payment_terms integer DEFAULT 30,
  credit_limit numeric(12,2) DEFAULT 0,
  vip_level integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  invoice_title text,
  invoice_address text,
  invoice_email text,
  payment_method text DEFAULT 'transfer'::text,
  bank_name text,
  bank_account text,
  bank_branch text,
  registered_address text,
  mailing_address text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.company_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  company_id uuid,
  name text NOT NULL,
  english_name text,
  title text,
  department text,
  phone text,
  mobile text,
  email text,
  line_id text,
  is_primary boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- ===== TOUR EXTENSIONS =====
CREATE TABLE IF NOT EXISTS public.tour_itinerary_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id text,
  itinerary_id text,
  workspace_id uuid NOT NULL,
  day_number integer,
  sort_order integer DEFAULT 0,
  category text,
  sub_category text,
  title text,
  description text,
  service_date date,
  service_date_end date,
  resource_type text,
  resource_id uuid,
  resource_name text,
  latitude numeric,
  longitude numeric,
  google_maps_url text,
  unit_price numeric,
  quantity numeric,
  total_cost numeric,
  currency text DEFAULT 'TWD'::text,
  pricing_type text,
  adult_price numeric,
  child_price numeric,
  infant_price numeric,
  quote_note text,
  quote_item_id text,
  supplier_id text,
  supplier_name text,
  request_id uuid,
  request_status text DEFAULT 'none'::text,
  request_sent_at timestamp with time zone,
  request_reply_at timestamp with time zone,
  reply_content jsonb,
  reply_cost numeric,
  estimated_cost numeric,
  quoted_cost numeric,
  confirmation_item_id uuid,
  confirmed_cost numeric,
  booking_reference text,
  booking_status text,
  confirmation_date timestamp with time zone,
  confirmation_note text,
  actual_expense numeric,
  expense_note text,
  expense_at timestamp with time zone,
  receipt_images text[],
  quote_status text DEFAULT 'none'::text,
  confirmation_status text DEFAULT 'none'::text,
  leader_status text DEFAULT 'none'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  show_on_web boolean NOT NULL DEFAULT true,
  show_on_brochure boolean NOT NULL DEFAULT true,
  updated_by uuid,
  show_on_quote boolean DEFAULT true,
  driver_name text,
  driver_phone text,
  vehicle_plate text,
  vehicle_type text,
  booking_confirmed_at timestamp with time zone,
  assignee_id uuid,
  assigned_at timestamp with time zone,
  assigned_by uuid,
  handled_by text,
  room_details jsonb DEFAULT '[]'::jsonb,
  override_title text,
  override_description text,
  override_by uuid,
  override_at timestamp with time zone,
  is_reserved boolean DEFAULT false,
  reserved_at timestamp with time zone,
  unit_price_formula text,
  quantity_formula text,
  adult_price_formula text,
  child_price_formula text,
  infant_price_formula text,
  day_title text,
  day_route text,
  day_note text,
  day_blocks jsonb,
  is_same_accommodation boolean NOT NULL DEFAULT false,
  breakfast_preset text,
  lunch_preset text,
  dinner_preset text
);

CREATE TABLE IF NOT EXISTS public.tour_member_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id text NOT NULL,
  order_member_id uuid NOT NULL,
  field_name character varying(100) NOT NULL,
  field_value text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tour_bonus_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  tour_id text NOT NULL,
  type integer NOT NULL,
  bonus numeric NOT NULL DEFAULT 0,
  bonus_type integer NOT NULL,
  employee_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  created_by uuid,
  updated_by uuid,
  payment_request_id uuid,
  disbursement_date date
);

CREATE TABLE IF NOT EXISTS public.tour_custom_cost_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id text NOT NULL,
  field_name text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tour_role_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id text NOT NULL,
  order_id text,
  role_id uuid,
  employee_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  field_id uuid
);

CREATE TABLE IF NOT EXISTS public.tour_meal_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id text NOT NULL,
  day_number integer NOT NULL,
  meal_type text NOT NULL,
  restaurant_name text,
  enabled boolean DEFAULT false,
  display_order integer DEFAULT 0,
  workspace_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tour_departure_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id text NOT NULL,
  flight_info jsonb DEFAULT '{}'::jsonb,
  hotel_info jsonb DEFAULT '{}'::jsonb,
  bus_info jsonb DEFAULT '{}'::jsonb,
  guide_info jsonb DEFAULT '{}'::jsonb,
  emergency_contact jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.tour_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id text NOT NULL,
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  file_path text NOT NULL,
  public_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- ===== REF / MASTER DATA =====
CREATE TABLE IF NOT EXISTS public.countries (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  name_en text NOT NULL,
  emoji text,
  code text,
  has_regions boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  region text,
  workspace_id uuid,
  usage_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.regions (
  id text NOT NULL PRIMARY KEY,
  country_id text NOT NULL,
  name text NOT NULL,
  name_en text,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  workspace_id uuid,
  country_code text
);

CREATE TABLE IF NOT EXISTS public.cities (
  id text NOT NULL PRIMARY KEY,
  country_id text NOT NULL,
  region_id text,
  name text NOT NULL,
  name_en text,
  description text,
  timezone text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  airport_code character varying(3),
  background_image_url text,
  background_image_url_2 text,
  primary_image integer DEFAULT 1,
  is_major boolean DEFAULT false,
  parent_city_id text,
  workspace_id uuid,
  usage_count integer DEFAULT 0,
  country_code text
);

CREATE TABLE IF NOT EXISTS public.attractions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  english_name text,
  description text,
  country_id text NOT NULL,
  region_id text,
  city_id text,
  category text,
  tags text[],
  opening_hours jsonb,
  duration_minutes integer,
  address text,
  phone text,
  website text,
  latitude numeric(10,8),
  longitude numeric(11,8),
  google_maps_url text,
  images text[],
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  workspace_id uuid NOT NULL,
  type text DEFAULT 'attraction'::text,
  ticket_price text,
  data_verified boolean DEFAULT false,
  created_by uuid,
  updated_by uuid,
  contact_name text,
  fax text,
  country_code text,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  deleted_reason text
);

CREATE TABLE IF NOT EXISTS public.hotels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  english_name text,
  name_local text,
  brand text,
  country_id text NOT NULL,
  region_id text,
  city_id text,
  address text,
  address_en text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  google_maps_url text,
  star_rating integer,
  hotel_class text,
  category text,
  description text,
  description_en text,
  highlights text[],
  room_types jsonb,
  price_range text,
  avg_price_per_night integer,
  currency text DEFAULT 'USD'::text,
  facilities jsonb,
  amenities text[],
  restaurants_count integer,
  has_michelin_restaurant boolean DEFAULT false,
  dining_options text[],
  booking_contact text,
  booking_email text,
  booking_phone text,
  website text,
  group_friendly boolean DEFAULT true,
  min_rooms_for_group integer,
  max_group_size integer,
  group_rate_available boolean DEFAULT false,
  commission_rate numeric(5,2),
  airport_transfer boolean DEFAULT false,
  concierge_service boolean DEFAULT true,
  butler_service boolean DEFAULT false,
  best_seasons text[],
  awards text[],
  certifications text[],
  images text[],
  notes text,
  internal_notes text,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  data_verified boolean DEFAULT false,
  fax text,
  phone text,
  country_code text,
  workspace_id uuid NOT NULL,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  deleted_reason text
);

CREATE TABLE IF NOT EXISTS public.restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  english_name text,
  name_local text,
  country_id text NOT NULL,
  region_id text,
  city_id text,
  address text,
  address_en text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  google_maps_url text,
  cuisine_type text[],
  category text,
  meal_type text[],
  description text,
  description_en text,
  specialties text[],
  highlights text[],
  price_range text,
  avg_price_lunch integer,
  avg_price_dinner integer,
  currency text DEFAULT 'TWD'::text,
  opening_hours jsonb,
  phone text,
  website text,
  reservation_required boolean DEFAULT false,
  reservation_url text,
  group_friendly boolean DEFAULT true,
  min_group_size integer,
  max_group_size integer,
  group_menu_available boolean DEFAULT false,
  group_menu_price integer,
  group_menu_options jsonb,
  private_room boolean DEFAULT false,
  private_room_capacity integer,
  booking_contact text,
  booking_email text,
  booking_phone text,
  booking_notes text,
  commission_rate numeric(5,2),
  facilities jsonb,
  dietary_options text[],
  images text[],
  menu_images text[],
  rating numeric(2,1),
  review_count integer DEFAULT 0,
  notes text,
  internal_notes text,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  data_verified boolean DEFAULT false,
  fax text,
  country_code text,
  michelin_stars integer,
  michelin_guide_year integer,
  bib_gourmand boolean DEFAULT false,
  michelin_plate boolean DEFAULT false,
  green_star boolean DEFAULT false,
  chef_name text,
  chef_profile text,
  signature_dishes text[],
  dress_code text,
  dining_restrictions jsonb,
  awards text[],
  ratings jsonb,
  dining_style text,
  recommended_for text[],
  best_season text[],
  workspace_id uuid NOT NULL,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  deleted_reason text
);

CREATE TABLE IF NOT EXISTS public.ref_countries (
  code text NOT NULL PRIMARY KEY,
  name_zh text NOT NULL,
  name_en text NOT NULL,
  continent text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  sub_region text,
  workspace_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ref_destinations (
  code text NOT NULL PRIMARY KEY,
  short_alias text,
  country_code text NOT NULL,
  name_zh text,
  name_zh_tw text,
  name_zh_cn text,
  name_en text,
  name_ja text,
  name_ko text,
  name_th text,
  type text,
  parent_code text,
  default_airport text,
  google_maps_url text,
  google_place_id text,
  latitude numeric,
  longitude numeric,
  created_at timestamp with time zone DEFAULT now()
);

-- ===== WORKSPACE EXTENSIONS =====
CREATE TABLE IF NOT EXISTS public.workspace_countries (
  workspace_id uuid NOT NULL,
  country_code text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (workspace_id, country_code)
);

CREATE TABLE IF NOT EXISTS public.workspace_selector_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  level text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.selector_field_roles (
  field_id uuid NOT NULL,
  role_id uuid NOT NULL,
  PRIMARY KEY (field_id, role_id)
);

-- ===== MISC =====
CREATE TABLE IF NOT EXISTS public.airport_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  airport_code text NOT NULL,
  image_url text NOT NULL,
  label text,
  season text,
  is_default boolean DEFAULT false,
  display_order integer DEFAULT 0,
  uploaded_by uuid,
  workspace_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.image_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  file_path text NOT NULL,
  public_url text NOT NULL,
  category text DEFAULT 'general'::text,
  tags text[] DEFAULT '{}'::text[],
  file_size integer,
  width integer,
  height integer,
  mime_type text,
  country_id text,
  city_id text,
  attraction_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  country_code text
);

CREATE TABLE IF NOT EXISTS public.background_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type character varying(100) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.task_status NOT NULL DEFAULT 'pending',
  priority public.task_priority NOT NULL DEFAULT 'normal',
  workspace_id uuid NOT NULL,
  created_by uuid,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  scheduled_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error text,
  result jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  start timestamp with time zone NOT NULL,
  "end" timestamp with time zone NOT NULL,
  all_day boolean DEFAULT false,
  type text NOT NULL DEFAULT 'other'::text,
  color text,
  visibility text NOT NULL DEFAULT 'personal'::text,
  related_tour_id text,
  related_order_id text,
  attendees text[] DEFAULT '{}'::text[],
  reminder_minutes integer,
  recurring text,
  recurring_until timestamp with time zone,
  owner_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  workspace_id uuid
);

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tab_id text NOT NULL,
  tab_name text NOT NULL DEFAULT '筆記'::text,
  content text NOT NULL DEFAULT ''::text,
  tab_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  workspace_id uuid,
  created_by uuid,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  preference_key text NOT NULL,
  preference_value jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id integer NOT NULL DEFAULT nextval('public.tasks_id_seq'::regclass) PRIMARY KEY,
  name text NOT NULL,
  assignee text,
  status text,
  progress integer DEFAULT 0,
  due_date date,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  task_type text NOT NULL DEFAULT 'individual'::text,
  workflow_template text,
  workspace_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.todos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  priority integer NOT NULL DEFAULT 3,
  deadline timestamp with time zone,
  status text NOT NULL DEFAULT 'pending'::text,
  completed boolean DEFAULT false,
  assignee uuid,
  visibility text[] DEFAULT '{}'::text[],
  related_items jsonb DEFAULT '[]'::jsonb,
  sub_tasks jsonb DEFAULT '[]'::jsonb,
  notes jsonb DEFAULT '[]'::jsonb,
  enabled_quick_actions text[] DEFAULT '{}'::text[],
  needs_creator_notification boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  workspace_id uuid NOT NULL,
  created_by uuid,
  updated_by uuid,
  is_public boolean DEFAULT false,
  task_type text,
  tour_id text,
  column_id uuid,
  description text
);

-- ===== INDEXES (basic) =====
CREATE INDEX IF NOT EXISTS idx_quotes_workspace ON public.quotes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_contracts_workspace ON public.contracts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tour ON public.contracts(tour_id);
CREATE INDEX IF NOT EXISTS idx_receipts_workspace ON public.receipts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_receipts_order ON public.receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_workspace ON public.payment_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_voucher ON public.journal_lines(voucher_id);
CREATE INDEX IF NOT EXISTS idx_journal_vouchers_workspace ON public.journal_vouchers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chart_workspace ON public.chart_of_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_attractions_workspace ON public.attractions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hotels_workspace ON public.hotels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_workspace ON public.restaurants(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tour_itinerary_items_tour ON public.tour_itinerary_items(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_itinerary_items_workspace ON public.tour_itinerary_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_companies_workspace ON public.companies(workspace_id);

COMMIT;
