ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS whatsapp_template TEXT DEFAULT 'Halo Kak {name}, terima kasih telah berniat berdonasi untuk {campaign} sebesar {amount}. Mohon segera selesaikan pembayaran melalui tautan berikut: {link}';
