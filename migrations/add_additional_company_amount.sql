-- Add additional_company_amount column to deals table for exchange deals
-- This field will be used when the customer's car is more expensive than the company's car
-- In this case, the company owes the customer money

ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS additional_company_amount numeric;

COMMENT ON COLUMN public.deals.additional_company_amount IS 'For exchange deals: additional amount the company owes the customer when their car is more expensive';
