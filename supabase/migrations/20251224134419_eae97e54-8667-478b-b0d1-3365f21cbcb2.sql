
-- Defense-in-depth: remove direct table privileges from unauthenticated clients.
-- RLS is already enabled with policies for authenticated users only.

REVOKE ALL PRIVILEGES ON TABLE public.access_codes FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.combination_history FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.user_roles FROM anon;

