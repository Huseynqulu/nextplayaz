
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('user', 'seller', 'admin');
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.order_status AS ENUM ('pending', 'payment_received', 'delivered', 'completed', 'dispute', 'cancelled');
CREATE TYPE public.product_category AS ENUM ('Games', 'Accounts', 'Keys', 'Services');
CREATE TYPE public.delivery_type AS ENUM ('Instant', 'Manual');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- has_role function (SECURITY DEFINER, no recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SELLER APPLICATIONS
CREATE TABLE public.seller_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  category public.product_category NOT NULL,
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  status public.application_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.seller_applications TO authenticated;
GRANT ALL ON public.seller_applications TO service_role;
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own applications" ON public.seller_applications FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own applications" ON public.seller_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update applications" ON public.seller_applications FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER seller_apps_updated_at BEFORE UPDATE ON public.seller_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  old_price NUMERIC(12,2),
  platform TEXT NOT NULL,
  category public.product_category NOT NULL,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  delivery public.delivery_type NOT NULL DEFAULT 'Instant',
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sellers create own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = seller_id AND (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Sellers update own products" ON public.products FOR UPDATE USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sellers delete own products" ON public.products FOR DELETE USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_seller ON public.products(seller_id);

-- ORDERS (escrow)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  delivery_payload TEXT,
  buyer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers and sellers view own orders" ON public.orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyers create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Order parties update" ON public.orders FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, reviewer_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users create own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Users delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin'));
