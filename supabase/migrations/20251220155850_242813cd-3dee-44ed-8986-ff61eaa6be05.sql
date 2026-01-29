-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cashier_shifts (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    market_id uuid NOT NULL,
    user_id uuid NOT NULL,
    start_amount numeric DEFAULT 0.00,
    end_amount numeric,
    difference numeric,
    opened_at timestamp
    with
        time zone DEFAULT now(),
        closed_at timestamp
    with
        time zone,
        notes text,
        CONSTRAINT cashier_shifts_pkey PRIMARY KEY (id),
        CONSTRAINT cashier_shifts_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets (id),
        CONSTRAINT cashier_shifts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
);

CREATE TABLE public.coin_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  amount_brl numeric NOT NULL DEFAULT 0,
  amount_coins numeric NOT NULL DEFAULT 0,
  CONSTRAINT coin_requests_pkey PRIMARY KEY (id),
  CONSTRAINT coin_requests_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id)
);

CREATE TABLE public.coin_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  market_id uuid,
  amount numeric NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['purchase'::text, 'bonus'::text, 'redemption'::text, 'manual_adjustment'::text])),
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coin_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT coin_transactions_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id)
);

CREATE TABLE public.couriers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  vehicle_type text DEFAULT 'motorcycle'::text,
  is_active boolean DEFAULT true,
  is_busy boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  cpf text,
  birth_date date,
  plate text,
  current_lat double precision,
  current_lng double precision,
  last_location_update timestamp with time zone,
  CONSTRAINT couriers_pkey PRIMARY KEY (id),
  CONSTRAINT couriers_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id)
);

CREATE TABLE public.ingredients (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    market_id uuid NOT NULL,
    name text NOT NULL,
    unit text NOT NULL,
    current_stock numeric DEFAULT 0,
    min_stock numeric DEFAULT 0,
    cost_price numeric DEFAULT 0,
    created_at timestamp
    with
        time zone DEFAULT now(),
        CONSTRAINT ingredients_pkey PRIMARY KEY (id),
        CONSTRAINT ingredients_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets (id)
);

CREATE TABLE public.market_employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role USER-DEFINED DEFAULT 'waiter'::employee_role,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT market_employees_pkey PRIMARY KEY (id),
  CONSTRAINT market_employees_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id),
  CONSTRAINT market_employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.market_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL,
  provider text NOT NULL,
  api_key text,
  api_secret text,
  is_active boolean DEFAULT false,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT market_integrations_pkey PRIMARY KEY (id),
  CONSTRAINT market_integrations_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id)
);

CREATE TABLE public.markets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id uuid,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  amenities ARRAY,
  address text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  cover_image text,
  rating numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  delivery_fee numeric DEFAULT 0.00,
  delivery_time_min integer DEFAULT 30,
  delivery_time_max integer DEFAULT 45,
  coin_balance integer DEFAULT 0,
  points_per_currency numeric DEFAULT 0.5,
  opening_hours jsonb DEFAULT '{"sexta": {"open": "08:00", "close": "23:00", "closed": false}, "terca": {"open": "08:00", "close": "22:00", "closed": false}, "quarta": {"open": "08:00", "close": "22:00", "closed": false}, "quinta": {"open": "08:00", "close": "22:00", "closed": false}, "sabado": {"open": "08:00", "close": "23:00", "closed": false}, "domingo": {"open": "08:00", "close": "22:00", "closed": false}, "segunda": {"open": "08:00", "close": "22:00", "closed": false}}'::jsonb,
  CONSTRAINT markets_pkey PRIMARY KEY (id),
  CONSTRAINT markets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  market_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  category text,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id)
);

CREATE TABLE public.order_items (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    order_id uuid NOT NULL,
    menu_item_id uuid,
    market_id uuid NOT NULL,
    name text NOT NULL,
    quantity integer DEFAULT 1,
    unit_price numeric NOT NULL,
    total_price numeric NOT NULL,
    notes text,
    created_at timestamp
    with
        time zone DEFAULT now(),
        CONSTRAINT order_items_pkey PRIMARY KEY (id),
        CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders (id),
        CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items (id),
        CONSTRAINT order_items_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets (id)
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL,
  customer_id uuid,
  table_id uuid,
  display_id integer NOT NULL DEFAULT nextval('orders_display_id_seq'::regclass),
  status USER-DEFINED DEFAULT 'pending'::order_status,
  order_type USER-DEFINED NOT NULL DEFAULT 'table'::order_type,
  payment_status USER-DEFINED DEFAULT 'pending'::payment_status,
  total_amount numeric DEFAULT 0.00,
  discount_amount numeric DEFAULT 0.00,
  delivery_fee numeric DEFAULT 0.00,
  delivery_address text,
  customer_name text,
  customer_phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  courier_id uuid,
  address_street text,
  address_number text,
  address_neighborhood text,
  address_city text,
  address_complement text,
  payment_method text,
  change_for numeric,
  user_id uuid,
  delivery_code text,
  delivery_provider text DEFAULT 'own_fleet'::text,
  external_delivery_id text,
  external_tracking_url text,
  estimated_min integer,
  estimated_max integer,
  coins_used integer DEFAULT 0,
  subtotal numeric DEFAULT 0,
  address_data jsonb DEFAULT '{}'::jsonb,
  courier_paid boolean DEFAULT false,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id),
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id),
  CONSTRAINT orders_courier_id_fkey FOREIGN KEY (courier_id) REFERENCES public.couriers(id),
  CONSTRAINT orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    order_id uuid NOT NULL,
    market_id uuid NOT NULL,
    shift_id uuid,
    amount numeric NOT NULL,
    method USER - DEFINED NOT NULL,
    created_at timestamp
    with
        time zone DEFAULT now(),
        CONSTRAINT payments_pkey PRIMARY KEY (id),
        CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders (id),
        CONSTRAINT payments_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets (id),
        CONSTRAINT payments_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.cashier_shifts (id)
);

CREATE TABLE public.product_recipes (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    menu_item_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity_needed numeric NOT NULL,
    CONSTRAINT product_recipes_pkey PRIMARY KEY (id),
    CONSTRAINT product_recipes_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items (id),
    CONSTRAINT product_recipes_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients (id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text,
  avatar_url text,
  role USER-DEFINED DEFAULT 'user'::user_role,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  coin_balance numeric DEFAULT 0,
  full_name text,
  phone_number text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.restaurant_tables (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    market_id uuid NOT NULL,
    table_number text NOT NULL,
    capacity integer DEFAULT 4,
    is_occupied boolean DEFAULT false,
    qr_code_url text,
    created_at timestamp
    with
        time zone DEFAULT now(),
        CONSTRAINT restaurant_tables_pkey PRIMARY KEY (id),
        CONSTRAINT restaurant_tables_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets (id)
);

CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  market_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.spatial_ref_sys (
    srid integer NOT NULL CHECK (
        srid > 0
        AND srid <= 998999
    ),
    auth_name character varying,
    auth_srid integer,
    srtext character varying,
    proj4text character varying,
    CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);

CREATE TABLE public.stock_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    market_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    change_amount numeric NOT NULL,
    reason USER - DEFINED NOT NULL,
    user_id uuid,
    order_id uuid,
    created_at timestamp
    with
        time zone DEFAULT now(),
        CONSTRAINT stock_logs_pkey PRIMARY KEY (id),
        CONSTRAINT stock_logs_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets (id),
        CONSTRAINT stock_logs_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients (id),
        CONSTRAINT stock_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id),
        CONSTRAINT stock_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders (id)
);

CREATE TABLE public.user_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text,
  street text NOT NULL,
  number text NOT NULL,
  neighborhood text NOT NULL,
  city text DEFAULT 'Santos'::text,
  complement text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);