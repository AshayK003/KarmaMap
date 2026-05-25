CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE SET NULL,
  ngo_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'pending',
  feature_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payments_ngo_id_idx ON public.payments (ngo_id);
CREATE INDEX payments_gig_id_idx ON public.payments (gig_id);
CREATE INDEX payments_status_idx ON public.payments (status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NGOs can view own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (ngo_id = auth.uid());

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
