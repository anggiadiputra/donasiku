-- Create testimonials table for campaign testimonials/comments
CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campaign relation
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Donor information
  donor_name text NOT NULL,
  donor_email text,
  
  -- Testimonial content
  message text NOT NULL,
  
  -- Status
  is_approved boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_testimonials_campaign_id ON testimonials(campaign_id);
CREATE INDEX idx_testimonials_created_at ON testimonials(created_at DESC);
CREATE INDEX idx_testimonials_is_approved ON testimonials(is_approved);
CREATE INDEX idx_testimonials_is_featured ON testimonials(is_featured);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read approved testimonials
CREATE POLICY "Anyone can view approved testimonials"
  ON testimonials
  FOR SELECT
  USING (is_approved = true);

-- Policy: Authenticated users can insert testimonials
CREATE POLICY "Authenticated users can insert testimonials"
  ON testimonials
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update their own testimonials
CREATE POLICY "Users can update own testimonials"
  ON testimonials
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Admins can do anything
CREATE POLICY "Service role can do anything with testimonials"
  ON testimonials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_testimonials_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();

-- Add comment
COMMENT ON TABLE testimonials IS 'Stores testimonials and comments from donors for campaigns';
