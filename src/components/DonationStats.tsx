
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake, MessageCircle } from 'lucide-react';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { supabase } from '../lib/supabase';

export default function DonationStats() {
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const [settings, setSettings] = useState({
    primaryLabel: 'Donasi Sekarang',
    primaryLink: '/donasi',
    secondaryLabel: 'Hubungi Admin',
    secondaryLink: 'https://wa.me/'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('layout_settings')
        .select('cta_primary_label, cta_primary_link, cta_secondary_label, cta_secondary_link')
        .single();

      if (data) {
        setSettings({
          primaryLabel: data.cta_primary_label || 'Donasi Sekarang',
          primaryLink: data.cta_primary_link || '/donasi',
          secondaryLabel: data.cta_secondary_label || 'Hubungi Admin',
          secondaryLink: data.cta_secondary_link || 'https://wa.me/'
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleNavigation = (link: string) => {
    if (link.startsWith('http') || link.startsWith('https') || link.startsWith('wa.me')) {
      window.open(link, '_blank');
    } else {
      navigate(link);
    }
  };

  return (
    <div className="bg-gray-50 py-8">
      <div className="w-full max-w-[480px] mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center relative overflow-hidden">
          {/* Decorative background circle */}
          <div
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-5"
            style={{ backgroundColor: primaryColor }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full opacity-5"
            style={{ backgroundColor: primaryColor }}
          />

          <div className="relative z-10">
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
              Sudah berbagi hari ini?
              {/* <HeartHandshake className="w-6 h-6 text-orange-500" /> */}
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Mari sisihkan sedikit rezeki untuk membantu sesama yang membutuhkan.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => handleNavigation(settings.primaryLink)}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white shadow-md hover:shadow-lg transition-all active:scale-95"
                style={{ backgroundColor: primaryColor }}
              >
                <HeartHandshake className="w-5 h-5" />
                {settings.primaryLabel}
              </button>

              <button
                onClick={() => handleNavigation(settings.secondaryLink)}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold bg-white border-2 hover:bg-gray-50 transition-colors active:scale-95"
                style={{
                  borderColor: primaryColor,
                  color: primaryColor
                }}
              >
                <MessageCircle className="w-5 h-5" />
                {settings.secondaryLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
