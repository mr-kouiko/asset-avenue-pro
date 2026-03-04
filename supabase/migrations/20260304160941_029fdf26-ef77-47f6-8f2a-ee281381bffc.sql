
-- 1. Create detection_results table (immutable for audit)
CREATE TABLE public.detection_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content_submission_id uuid NOT NULL REFERENCES public.content_submissions(id) ON DELETE CASCADE,
    model_used text NOT NULL DEFAULT 'gemini-3-flash-vision',
    detection_score numeric(4,3) NOT NULL CHECK (detection_score >= 0 AND detection_score <= 1),
    ai_score numeric(4,3),
    deepfake_score numeric(4,3),
    quality_score numeric(4,3),
    final_confidence numeric(4,3) NOT NULL CHECK (final_confidence >= 0 AND final_confidence <= 1),
    detection_status text NOT NULL DEFAULT 'completed' CHECK (detection_status IN ('completed', 'failed', 'timeout', 'skipped')),
    reasoning text,
    indicators text[],
    raw_response jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Make detection_results immutable (no updates/deletes for audit trail)
ALTER TABLE public.detection_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "detection_results_insert_service"
ON public.detection_results FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "detection_results_select_admin"
ON public.detection_results FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
        SELECT 1 FROM public.content_submissions cs
        WHERE cs.id = content_submission_id AND cs.creator_id = auth.uid()
    )
);

-- No UPDATE or DELETE policies = immutable

-- 2. Add ai_declaration column to content_submissions
ALTER TABLE public.content_submissions 
ADD COLUMN IF NOT EXISTS ai_declaration text CHECK (ai_declaration IN ('fully_ai_generated', 'ai_assisted', 'no_ai_used'));

-- 3. Add creator integrity columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS creator_integrity_score integer NOT NULL DEFAULT 100 CHECK (creator_integrity_score >= 0 AND creator_integrity_score <= 100),
ADD COLUMN IF NOT EXISTS creator_mismatch_count integer NOT NULL DEFAULT 0;

-- 4. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_detection_results_submission ON public.detection_results(content_submission_id);
CREATE INDEX IF NOT EXISTS idx_content_submissions_status ON public.content_submissions(status);
CREATE INDEX IF NOT EXISTS idx_content_submissions_ai_declaration ON public.content_submissions(ai_declaration);

-- 5. Create function to process scan results and update status
CREATE OR REPLACE FUNCTION public.process_scan_result(
    p_submission_id uuid,
    p_detection_score numeric,
    p_ai_declaration text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_new_status text;
    v_creator_id uuid;
    v_mismatch_count integer;
BEGIN
    -- Get creator ID
    SELECT creator_id INTO v_creator_id
    FROM content_submissions WHERE id = p_submission_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    -- Determine status based on detection score
    IF p_detection_score < 0.55 THEN
        v_new_status := 'approved';
    ELSIF p_detection_score >= 0.55 AND p_detection_score < 0.70 THEN
        v_new_status := 'approved_ai_assisted';
    ELSIF p_detection_score >= 0.70 THEN
        v_new_status := 'approved_ai';
    END IF;

    -- Mismatch check: declared no_ai but detected as AI
    IF p_ai_declaration = 'no_ai_used' AND p_detection_score >= 0.70 THEN
        v_new_status := 'pending_review';
        
        -- Increment mismatch count and decrease integrity
        UPDATE profiles
        SET creator_mismatch_count = creator_mismatch_count + 1,
            creator_integrity_score = GREATEST(0, creator_integrity_score - 15),
            updated_at = now()
        WHERE user_id = v_creator_id;
    ELSE
        -- Accurate declaration: slightly increase integrity
        UPDATE profiles
        SET creator_integrity_score = LEAST(100, creator_integrity_score + 2),
            updated_at = now()
        WHERE user_id = v_creator_id;
    END IF;

    -- Check if creator has too many mismatches (auto-flag future uploads)
    SELECT creator_mismatch_count INTO v_mismatch_count
    FROM profiles WHERE user_id = v_creator_id;
    
    IF v_mismatch_count >= 3 AND v_new_status != 'pending_review' THEN
        v_new_status := 'pending_review';
    END IF;

    -- Update submission status
    UPDATE content_submissions
    SET status = v_new_status,
        updated_at = now()
    WHERE id = p_submission_id;

    RETURN v_new_status;
END;
$$;
