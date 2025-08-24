-- Créer les fonctions sécurisées pour l'administration des paramètres Stripe

-- Fonction pour récupérer les paramètres de la plateforme (admin uniquement)
CREATE OR REPLACE FUNCTION public.admin_get_platform_settings()
RETURNS SETOF platform_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Logger l'accès
  PERFORM log_sensitive_access('platform_settings_read', 'platform_settings');
  
  -- Retourner tous les paramètres
  RETURN QUERY
  SELECT * FROM public.platform_settings;
END;
$$;

-- Fonction pour mettre à jour les paramètres de la plateforme (admin uniquement)  
CREATE OR REPLACE FUNCTION public.admin_update_platform_settings(
  new_stripe_publishable_key text DEFAULT NULL,
  new_stripe_secret_key text DEFAULT NULL,
  new_stripe_webhook_secret text DEFAULT NULL,
  new_commission_rate numeric DEFAULT NULL,
  new_stripe_application_fee_rate numeric DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  settings_id uuid;
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Logger l'accès à la modification des paramètres sensibles
  PERFORM log_sensitive_access('platform_settings_update', 'platform_settings', 
    jsonb_build_object(
      'stripe_key_updated', (new_stripe_secret_key IS NOT NULL),
      'webhook_updated', (new_stripe_webhook_secret IS NOT NULL)
    )
  );
  
  -- Récupérer l'ID des paramètres (il doit y en avoir qu'un)
  SELECT id INTO settings_id FROM public.platform_settings LIMIT 1;
  
  IF settings_id IS NULL THEN
    RAISE EXCEPTION 'Platform settings not found';
  END IF;
  
  -- Mettre à jour seulement les champs fournis
  UPDATE public.platform_settings 
  SET 
    stripe_publishable_key = COALESCE(new_stripe_publishable_key, stripe_publishable_key),
    stripe_secret_key = COALESCE(new_stripe_secret_key, stripe_secret_key),
    stripe_webhook_secret = COALESCE(new_stripe_webhook_secret, stripe_webhook_secret),
    commission_rate = COALESCE(new_commission_rate, commission_rate),
    stripe_application_fee_rate = COALESCE(new_stripe_application_fee_rate, stripe_application_fee_rate),
    updated_at = now()
  WHERE id = settings_id;
  
  RETURN true;
END;
$$;