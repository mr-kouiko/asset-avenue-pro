-- Create storage bucket for temporary chunks
INSERT INTO storage.buckets (id, name, public) VALUES ('temp-chunks', 'temp-chunks', false);

-- Create RLS policies for temp-chunks bucket
CREATE POLICY "Users can upload their own chunks" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'temp-chunks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can access their own chunks" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'temp-chunks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own chunks" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'temp-chunks' AND auth.uid()::text = (storage.foldername(name))[1]);