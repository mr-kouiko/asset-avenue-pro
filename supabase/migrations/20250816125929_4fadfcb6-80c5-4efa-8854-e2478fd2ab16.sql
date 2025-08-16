-- Améliorer les tables existantes pour le backoffice vendeur

-- Créer une fonction pour la gestion des timestamps automatique
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ajouter des triggers pour les timestamps automatiques
CREATE TRIGGER update_content_submissions_updated_at
  BEFORE UPDATE ON public.content_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_content_files_updated_at
  BEFORE UPDATE ON public.content_files
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Ajouter la colonne updated_at pour content_files si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'content_files' AND column_name = 'updated_at') THEN
    ALTER TABLE public.content_files ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- Créer des index pour améliorer les performances des requêtes du backoffice
CREATE INDEX IF NOT EXISTS idx_content_submissions_creator_status ON public.content_submissions(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_content_files_submission_type ON public.content_files(submission_id, file_type);
CREATE INDEX IF NOT EXISTS idx_content_submissions_created_at ON public.content_submissions(created_at DESC);

-- Ajouter des contraintes pour la validation des fichiers
ALTER TABLE public.content_files 
ADD CONSTRAINT check_file_size_limit CHECK (file_size <= 104857600); -- 100MB limite

-- Ajouter une fonction pour calculer les statistiques vendeur
CREATE OR REPLACE FUNCTION public.get_seller_stats(seller_user_id UUID)
RETURNS TABLE (
  total_submissions INTEGER,
  approved_submissions INTEGER,
  pending_submissions INTEGER,
  rejected_submissions INTEGER,
  total_downloads INTEGER,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_submissions,
    COUNT(CASE WHEN status = 'approved' THEN 1 END)::INTEGER as approved_submissions,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::INTEGER as pending_submissions,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END)::INTEGER as rejected_submissions,
    COALESCE(SUM(
      (SELECT COUNT(*) FROM downloads d 
       WHERE d.submission_id = cs.id)
    ), 0)::INTEGER as total_downloads,
    COALESCE(SUM(
      CASE WHEN status = 'approved' THEN price ELSE 0 END
    ), 0) as total_revenue
  FROM content_submissions cs
  WHERE cs.creator_id = seller_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politique RLS pour permettre aux vendeurs d'accéder à leurs statistiques
CREATE POLICY "Sellers can view their own stats" ON public.content_submissions
FOR SELECT USING (
  creator_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);