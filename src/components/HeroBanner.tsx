import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, HeroSliderItem } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';

export default function HeroBanner() {
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const [sliderItems, setSliderItems] = useState<HeroSliderItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Calculate hover color (darker)
  const getHoverColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const hoverR = Math.max(0, r - 25);
    const hoverG = Math.max(0, g - 25);
    const hoverB = Math.max(0, b - 25);
    return `#${hoverR.toString(16).padStart(2, '0')}${hoverG.toString(16).padStart(2, '0')}${hoverB.toString(16).padStart(2, '0')}`;
  };

  const hoverColor = getHoverColor(primaryColor);

  useEffect(() => {
    fetchSliderSettings();
  }, []);

  const fetchSliderSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('layout_settings')
        .select('hero_slider_enabled, hero_slider_items')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching slider settings:', error);
      }

      if (data && data.hero_slider_enabled && data.hero_slider_items) {
        const items = Array.isArray(data.hero_slider_items)
          ? data.hero_slider_items
          : JSON.parse(data.hero_slider_items || '[]');
        setSliderItems(items);
      } else {
        // Default fallback if no settings or empty array
        setSliderItems([{
          image: 'https://images.pexels.com/photos/1912868/pexels-photo-1912868.jpeg',
          title: 'Saatnya Sejuta',
          subtitle: 'BANTU HIDUP ANAK TERLANTAR',
          description: 'Bantuan dari 250.000 orang/bulan yang akan berulang terus dan terus setiap bulannya',
          buttonText: 'Donasi Sekarang',
          buttonLink: '/donasi'
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      // Default fallback on error
      setSliderItems([{
        image: 'https://images.pexels.com/photos/1912868/pexels-photo-1912868.jpeg',
        title: 'Saatnya Sejuta',
        subtitle: 'BANTU HIDUP ANAK TERLANTAR',
        description: 'Bantuan dari 250.000 orang/bulan yang akan berulang terus dan terus setiap bulannya',
        buttonText: 'Donasi Sekarang',
        buttonLink: '/donasi'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-play slider
  useEffect(() => {
    if (sliderItems.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sliderItems.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [sliderItems.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + sliderItems.length) % sliderItems.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sliderItems.length);
  };

  if (loading || sliderItems.length === 0) {
    return (
      <div className="relative w-full h-[220px] bg-gray-200 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[220px] overflow-hidden">
      {/* Slider Images */}
      <div className="relative w-full h-full overflow-hidden">
        {sliderItems.map((item, index) => {
          const isActive = index === currentIndex;
          const isNext = index === (currentIndex + 1) % sliderItems.length;
          const isPrev = index === (currentIndex - 1 + sliderItems.length) % sliderItems.length;

          // Calculate position for book page effect
          let transform = '';
          let zIndex = 0;

          if (isActive) {
            transform = 'translateX(0%)';
            zIndex = 10;
          } else if (isNext) {
            transform = 'translateX(100%)';
            zIndex = 5;
          } else if (isPrev) {
            transform = 'translateX(-100%)';
            zIndex = 5;
          } else {
            // Slides that are further away
            const diff = index - currentIndex;
            const direction = diff > 0 ? 1 : -1;
            transform = `translateX(${direction * 100}%)`;
            zIndex = 1;
          }

          return (
            <div
              key={index}
              className="absolute inset-0 transition-transform duration-700 ease-in-out"
              style={{
                transform,
                zIndex,
                opacity: isActive ? 1 : 0.7
              }}
            >
              <img
                src={item.image || 'https://images.pexels.com/photos/1912868/pexels-photo-1912868.jpeg'}
                alt={item.title || 'Banner'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30"></div>
            </div>
          );
        })}
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-center z-20">
        <div className="w-full max-w-[480px] mx-auto px-4">
          <div className="text-left max-w-xl">
            {sliderItems.map((slide, index) => {
              const isActive = index === currentIndex;
              return (
                <div
                  key={index}
                  className={`transition-all duration-700 ease-in-out ${isActive
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-4 pointer-events-none absolute'
                    }`}
                >
                  {slide.title && (
                    <h2 className="text-lg font-bold mb-1 text-white leading-tight drop-shadow-lg">
                      {slide.title}
                    </h2>
                  )}
                  {slide.subtitle && (
                    <h3
                      className="text-base font-bold mb-2 leading-tight drop-shadow-lg"
                      style={{ color: primaryColor }}
                    >
                      {slide.subtitle}
                    </h3>
                  )}
                  {slide.description && (
                    <p className="text-sm text-white/95 leading-relaxed drop-shadow-md mb-4 line-clamp-2">
                      {slide.description}
                    </p>
                  )}
                  {slide.buttonText && slide.buttonLink && (
                    <button
                      onClick={() => navigate(slide.buttonLink || '/donasi')}
                      className="text-white px-4 py-2 rounded-full font-semibold text-sm transition-colors shadow-md"
                      style={{ backgroundColor: primaryColor }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = hoverColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = primaryColor;
                      }}
                    >
                      {slide.buttonText}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {sliderItems.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-full transition-colors backdrop-blur-sm"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-full transition-colors backdrop-blur-sm"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {sliderItems.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {sliderItems.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-1.5 rounded-full transition-all ${index === currentIndex
                ? 'w-6'
                : 'bg-white/50 hover:bg-white/70 w-1.5'
                }`}
              style={index === currentIndex ? { backgroundColor: primaryColor } : undefined}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
