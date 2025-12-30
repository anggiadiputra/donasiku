-- Update RLS policies for whatsapp_messages to allow campaigners as well
-- Many "Personal Account" users have the 'campaigner' role and need to see visitor messages.

DROP POLICY IF EXISTS "whatsapp_messages_s_admin" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_u_admin" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_d_admin" ON whatsapp_messages;

-- SELECT: Allow both admin and campaigners
CREATE POLICY "whatsapp_messages_s_rbac" ON whatsapp_messages FOR SELECT TO authenticated 
  USING (public.check_is_admin() OR public.check_is_campaigner());

-- UPDATE: Allow both admin and campaigners
CREATE POLICY "whatsapp_messages_u_rbac" ON whatsapp_messages FOR UPDATE TO authenticated 
  USING (public.check_is_admin() OR public.check_is_campaigner());

-- DELETE: Allow both admin and campaigners
CREATE POLICY "whatsapp_messages_d_rbac" ON whatsapp_messages FOR DELETE TO authenticated 
  USING (public.check_is_admin() OR public.check_is_campaigner());
