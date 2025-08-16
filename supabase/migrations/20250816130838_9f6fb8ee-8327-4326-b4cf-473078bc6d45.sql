-- Corriger la récursion infinie dans les politiques RLS user_roles avec le bon rôle

-- Supprimer les politiques problématiques
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;

-- Créer une fonction sécurisée pour vérifier les rôles (évite la récursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Recréer les politiques sans récursion
CREATE POLICY "Admins can view all user roles via function" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user roles via function" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Corriger aussi les autres politiques qui utilisent user_roles pour éviter les problèmes
DROP POLICY IF EXISTS "Sellers can view their own stats" ON public.content_submissions;

-- Recréer la politique de soumissions avec la fonction sécurisée
CREATE POLICY "Creators can view their submissions and admins all" 
ON public.content_submissions 
FOR SELECT 
TO authenticated
USING (
  creator_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Permettre aux créateurs d'insérer du contenu
DROP POLICY IF EXISTS "Creators can create submissions" ON public.content_submissions;

CREATE POLICY "Creators can create submissions" 
ON public.content_submissions 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = creator_id AND 
  (public.has_role(auth.uid(), 'creator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

-- Corriger la politique de mise à jour pour les créateurs
DROP POLICY IF EXISTS "Creators can update their pending submissions" ON public.content_submissions;

CREATE POLICY "Creators can update their pending submissions" 
ON public.content_submissions 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = creator_id AND 
  status = 'pending'::text AND
  (public.has_role(auth.uid(), 'creator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

-- Corriger la politique de vue pour les créateurs
DROP POLICY IF EXISTS "Creators can view their own submissions" ON public.content_submissions;

CREATE POLICY "Creators can view their own submissions" 
ON public.content_submissions 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = creator_id AND
  (public.has_role(auth.uid(), 'creator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

-- Corriger les politiques content_files
DROP POLICY IF EXISTS "Creators can manage their submission files" ON public.content_files;

CREATE POLICY "Creators can manage their submission files" 
ON public.content_files 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_submissions 
    WHERE content_submissions.id = content_files.submission_id 
    AND content_submissions.creator_id = auth.uid()
    AND (public.has_role(auth.uid(), 'creator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);