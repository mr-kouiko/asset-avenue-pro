INSERT INTO public.user_credits (user_id, credits_balance)
VALUES ('2b9c53cc-2efb-4840-9048-f556b63b3e5f', 1000)
ON CONFLICT (user_id) DO UPDATE SET credits_balance = public.user_credits.credits_balance + 1000;