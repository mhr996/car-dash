-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id),
  CONSTRAINT roles_name_check CHECK (name IN ('Admin', 'Sales'))
);

-- Create permissions table to define available permissions
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  category character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);

-- Create user_roles table to assign roles to users
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
  CONSTRAINT user_roles_user_id_unique UNIQUE (user_id)
);

-- Create role_permissions table for role-based permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

-- Create user_permissions table for custom user-specific permissions (overrides)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE,
  CONSTRAINT user_permissions_unique UNIQUE (user_id, permission_id)
);

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
  ('Admin', 'Full system access with all permissions'),
  ('Sales', 'Sales team member with customizable page access')
ON CONFLICT (name) DO NOTHING;

-- Insert permissions for all pages and sections
INSERT INTO public.permissions (key, name, description, category) VALUES
  -- Main section
  ('view_dashboard', 'View Dashboard', 'Access to home/dashboard page', 'main'),
  ('view_cars', 'View Cars', 'Access to cars listing and management', 'main'),
  ('view_car_purchase_price', 'View Car Purchase Price', 'Can view purchase price of cars', 'main'),
  ('view_providers', 'View Providers', 'Access to providers management', 'main'),
  ('view_customers', 'View Customers', 'Access to customers management', 'main'),
  
  -- User and Pages section
  ('view_users', 'View Users', 'Access to users management', 'users'),
  ('manage_users', 'Manage Users', 'Create, edit, and delete users', 'users'),
  
  -- Accounting section
  ('view_sales_deals', 'View Sales Deals', 'Access to sales deals', 'accounting'),
  ('manage_sales_deals', 'Manage Sales Deals', 'Create and edit sales deals', 'accounting'),
  ('view_purchases_deals', 'View Purchase Deals', 'Access to purchase deals', 'accounting'),
  ('manage_purchases_deals', 'Manage Purchase Deals', 'Create and edit purchase deals', 'accounting'),
  ('view_bills', 'View Bills', 'Access to bills and invoices', 'accounting'),
  ('manage_bills', 'Manage Bills', 'Create and edit bills', 'accounting'),
  ('view_logs', 'View Logs', 'Access to activity logs', 'accounting'),
  
  -- General Settings section
  ('view_home_settings', 'View Home Settings', 'Access to home page settings', 'settings'),
  ('manage_home_settings', 'Manage Home Settings', 'Edit home page settings', 'settings'),
  ('view_company_settings', 'View Company Settings', 'Access to company settings', 'settings'),
  ('manage_company_settings', 'Manage Company Settings', 'Edit company settings', 'settings')
ON CONFLICT (key) DO NOTHING;

-- Grant all permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign Admin role to all existing users
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM public.users u
CROSS JOIN public.roles r
WHERE r.name = 'Admin'
ON CONFLICT (user_id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions(permission_id);

-- Create a function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid uuid)
RETURNS TABLE (permission_key character varying) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.key
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = user_uuid
  UNION
  SELECT p.key
  FROM permissions p
  INNER JOIN user_permissions up ON p.id = up.permission_id
  WHERE up.user_id = user_uuid AND up.granted = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
