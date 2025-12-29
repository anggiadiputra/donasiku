import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SkeletonImage, SkeletonBox } from './SkeletonLoader';

const DEFAULT_SLIDES = [
  {
    id: 1,
    image: 'https://images.pexels.com/photos/1648375/pexels-photo-1648375.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: 'SELAMATKAN MASA DEPAN BAYI TERLANTAR',
    subtitle: 'Salurkan donasi rutin melalui Jadi Orang Tua Asuh',
    buttonText: 'Donasi Sekarang',
    link: '/donasi',
    theme: 'pink'
  },
  {
    id: 2,
    image: 'https://images.pexels.com/photos/459976/pexels-photo-459976.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: 'BERI PELUKAN HANGAT UNTUK YATIM',
    subtitle: 'Mari muliakan anak yatim dengan sedekah terbaik',
    buttonText: 'Santuni Sekarang',
    link: '/donasi',
    theme: 'pink'
  },
  {
    id: 3,
    image: 'https://images.pexels.com/photos/5624357/pexels-photo-5624357.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: 'GIZI BAIK UNTUK GENERASI PENERUS',
    subtitle: 'Bantu penuhi nutrisi balita dhuafa di pelosok',
    buttonText: 'Bantu Gizi',
    link: '/donasi',
    theme: 'pink'
  }
];

export default function CTASection() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Use dedicated columns
      const { data, error } = await supabase
        .from('layout_settings')
        .select('cta_slider_items, cta_slider_enabled')
        .limit(1)
        .maybeSingle();

      if (data) {
        if (data.cta_slider_enabled === false) {
          setItems([]);
        } else if (data.cta_slider_items && Array.isArray(data.cta_slider_items) && data.cta_slider_items.length > 0) {
          setItems(data.cta_slider_items);
        } else {
          setItems(DEFAULT_SLIDES);
        }
      } else {
        setItems(DEFAULT_SLIDES);
      }
    } catch (err) {
      console.error('Error fetching cta settings:', err);
      setItems(DEFAULT_SLIDES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused, items.length]);

  const getThemeStyles = (theme?: string) => {
    switch (theme) {
      case 'green': return { gradient: 'from-[#4ade80] to-[#16a34a]', buttonColor: 'text-green-600' };
      case 'blue': return { gradient: 'from-blue-400 to-indigo-600', buttonColor: 'text-blue-600' };
      case 'orange': return { gradient: 'from-orange-400 to-red-500', buttonColor: 'text-orange-600' };
      case 'pink':
      default: return { gradient: 'from-pink-500 to-rose-600', buttonColor: 'text-pink-600' };
    }
  };

  if (loading) {
    return (
      <div className="py-4 bg-white mb-2">
        <div className="w-full max-w-[480px] mx-auto px-4">
          <SkeletonImage className="w-full aspect-[16/9] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="py-4 bg-white mb-2">
      <div className="w-full max-w-[480px] mx-auto px-4">
        <div
          className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-lg group cursor-pointer"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {items.map((slide, index) => {
            const styles = getThemeStyles(slide.theme);
            // Handle button link mapping
            const link = slide.buttonLink || slide.link || '/donasi';

            return (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
              >
                {/* Full Background Image */}
                <img
                  src={slide.image || 'https://via.placeholder.com/800x400'}
                  className="absolute inset-0 w-full h-full object-cover"
                  alt={slide.title}
                />

                {/* Content Overlay (No Blur Box) */}
                <div className="absolute inset-0 p-6 flex flex-col justify-center items-start z-20">
                  <div className="max-w-[90%] space-y-3">
                    <div className="space-y-1">
                      {slide.title && (
                        <h3 className="text-xl font-bold leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {slide.title}
                        </h3>
                      )}
                      {slide.subtitle && (
                        <p className="text-sm font-medium text-white/95 leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {slide.subtitle}
                        </p>
                      )}
                    </div>

                    {slide.buttonText && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(link);
                        }}
                        className={`px-5 py-2 bg-white rounded-full font-bold text-sm shadow-md transition-all transform hover:scale-105 active:scale-95 ${styles.buttonColor}`}
                      >
                        {slide.buttonText}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Dots */}
          {items.length > 1 && (
            <div className="absolute bottom-4 left-6 z-30 flex gap-1.5">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`transition-all duration-300 rounded-full shadow-sm hover:bg-white ${idx === currentIndex ? 'w-6 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'
                    }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
