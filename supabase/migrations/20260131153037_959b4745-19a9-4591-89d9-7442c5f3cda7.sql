
-- Create draft submissions for all orphaned uploaded_files and link them
-- This recovers 529 orphaned files by creating proper draft entries

DO $$
DECLARE
    orphan_record RECORD;
    new_submission_id UUID;
BEGIN
    -- Loop through all orphaned completed uploads
    FOR orphan_record IN 
        SELECT id, user_id, file_name, file_type, created_at
        FROM uploaded_files
        WHERE status = 'completed' 
          AND draft_id IS NULL
    LOOP
        -- Create a new draft submission for this file
        INSERT INTO content_submissions (
            creator_id,
            title,
            description,
            status,
            created_at,
            updated_at
        ) VALUES (
            orphan_record.user_id,
            COALESCE(
                NULLIF(regexp_replace(orphan_record.file_name, '\.[^.]+$', ''), ''),
                'Recovered Upload'
            ),
            'This draft was automatically recovered from an orphaned upload. Please complete the submission details.',
            'draft',
            orphan_record.created_at,
            NOW()
        )
        RETURNING id INTO new_submission_id;
        
        -- Link the uploaded_file to the new draft
        UPDATE uploaded_files 
        SET draft_id = new_submission_id,
            updated_at = NOW()
        WHERE id = orphan_record.id;
        
        RAISE NOTICE 'Recovered file % -> draft %', orphan_record.file_name, new_submission_id;
    END LOOP;
END $$;

-- Verify the recovery
SELECT 
    'Orphaned files remaining' as metric,
    COUNT(*) as count
FROM uploaded_files 
WHERE status = 'completed' AND draft_id IS NULL
UNION ALL
SELECT 
    'Total drafts with recovered files' as metric,
    COUNT(DISTINCT draft_id) as count
FROM uploaded_files 
WHERE status = 'completed' AND draft_id IS NOT NULL;
