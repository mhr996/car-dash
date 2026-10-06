-- Apply before deploying purchase signing/billing. Existing purchases must be signed in preview before new bills can be issued.
BEGIN;

ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS purchase_car_id bigint REFERENCES public.cars(id);

CREATE INDEX IF NOT EXISTS bills_purchase_car_id_idx ON public.bills(purchase_car_id);

-- Legacy references occupy the first line of bill notes; match the full ID, not a prefix.
UPDATE public.bills b
SET purchase_car_id = c.id
FROM public.cars c
WHERE b.purchase_car_id IS NULL AND b.deal_id IS NULL
AND split_part(b.free_text, E'\n', 1) = 'purchase_car_id:' || c.id::text;

CREATE TABLE IF NOT EXISTS public.purchase_signatures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id bigint NOT NULL UNIQUE REFERENCES public.cars(id) ON DELETE CASCADE,
    seller_id bigint NOT NULL CHECK (seller_id > 0),
    seller_type text NOT NULL CHECK (seller_type IN ('provider', 'customer')),
    seller_signature_url text NOT NULL,
    signed_by_name text NOT NULL,
    signed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_signatures ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.purchase_signatures TO authenticated;

DROP POLICY IF EXISTS purchase_signatures_read ON public.purchase_signatures;
CREATE POLICY purchase_signatures_read ON public.purchase_signatures
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    ) OR EXISTS (
        SELECT 1 FROM public.user_permissions up
        JOIN public.permissions p ON p.id = up.permission_id
        WHERE up.user_id = auth.uid() AND up.granted
        AND p.key IN ('view_cars', 'view_purchases_deals', 'manage_purchases_deals', 'manage_bills')
    )
);

DROP POLICY IF EXISTS purchase_signatures_insert ON public.purchase_signatures;
CREATE POLICY purchase_signatures_insert ON public.purchase_signatures
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    ) OR EXISTS (
        SELECT 1 FROM public.user_permissions up
        JOIN public.permissions p ON p.id = up.permission_id
        WHERE up.user_id = auth.uid() AND up.granted
        AND p.key IN ('manage_purchases_deals', 'manage_bills')
    )
);

DROP POLICY IF EXISTS purchase_signatures_update ON public.purchase_signatures;
CREATE POLICY purchase_signatures_update ON public.purchase_signatures
FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    ) OR EXISTS (
        SELECT 1 FROM public.user_permissions up
        JOIN public.permissions p ON p.id = up.permission_id
        WHERE up.user_id = auth.uid() AND up.granted
        AND p.key IN ('manage_purchases_deals', 'manage_bills')
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    ) OR EXISTS (
        SELECT 1 FROM public.user_permissions up
        JOIN public.permissions p ON p.id = up.permission_id
        WHERE up.user_id = auth.uid() AND up.granted
        AND p.key IN ('manage_purchases_deals', 'manage_bills')
    )
);

COMMIT;
