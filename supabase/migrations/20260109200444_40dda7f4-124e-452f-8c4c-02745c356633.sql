-- Create table to track processed PayPal orders (idempotency)
CREATE TABLE public.paypal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_order_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  order_type TEXT NOT NULL, -- 'credits', 'marketplace', 'subscription'
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  credits_amount INTEGER,
  pack_type TEXT,
  cart_items JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.paypal_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own orders"
ON public.paypal_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage orders"
ON public.paypal_orders FOR ALL
USING (current_setting('role') = 'service_role');

-- Create index for fast lookups
CREATE INDEX idx_paypal_orders_paypal_order_id ON public.paypal_orders(paypal_order_id);
CREATE INDEX idx_paypal_orders_user_id ON public.paypal_orders(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_paypal_orders_updated_at
BEFORE UPDATE ON public.paypal_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();