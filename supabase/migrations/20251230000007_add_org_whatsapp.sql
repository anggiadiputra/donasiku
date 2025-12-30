-- MIGRATION: ADD WHATSAPP NUMBER TO ORGANIZATIONS
-- Allowing organizations to have a contact WhatsApp number for visitors.

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS whatsapp_no text;
 Broadway
