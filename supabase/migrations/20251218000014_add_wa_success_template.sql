ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS whatsapp_success_template TEXT DEFAULT 'Alhamdulillah, terima kasih Kak {name}. Donasi sebesar {amount} untuk {campaign} telah kami terima. Semoga menjadi amal jariyah yang tak terputus pahalanya. 🤲';
