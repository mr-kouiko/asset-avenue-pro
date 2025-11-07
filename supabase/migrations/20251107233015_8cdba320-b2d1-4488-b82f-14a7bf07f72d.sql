-- Fix: Remove public access policy from profiles table that exposes emails
-- The creator_profiles_public table already provides safe public access without exposing emails

DROP POLICY IF EXISTS "Public can view safe creator profiles" ON public.profiles;