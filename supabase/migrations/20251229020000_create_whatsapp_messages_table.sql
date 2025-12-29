-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  message text NOT NULL,
  status text DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policies

-- Allow anyone (public) to insert messages
CREATE POLICY "Anyone can insert whatsapp messages"
  ON whatsapp_messages FOR INSERT
  WITH CHECK (true);

-- Allow admins (authenticated) to view all messages
CREATE POLICY "Admins can view all messages"
  ON whatsapp_messages FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow admins (authenticated) to update messages (e.g. mark as read)
CREATE POLICY "Admins can update messages"
  ON whatsapp_messages FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Allow admins (authenticated) to delete messages
CREATE POLICY "Admins can delete messages"
  ON whatsapp_messages FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create index for performance
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages(status);
