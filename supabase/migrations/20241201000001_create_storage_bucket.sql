/*
  # Create Storage Bucket for Campaigns

  Creates a public storage bucket for campaign images
*/

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaigns', 'campaigns', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Anyone can view campaign images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaigns');

CREATE POLICY "Authenticated users can upload campaign images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'campaigns' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own campaign images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'campaigns' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own campaign images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'campaigns' AND auth.role() = 'authenticated');

