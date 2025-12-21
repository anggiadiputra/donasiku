import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { supabase } from '../lib/supabase';

const DEFAULT_ITEMS = [
    {
        id: 1,
        title: 'Zakat untuk Penyintas Bencana',
        subtitle: 'Niatkan zakat tahun ini untuk dukung #SumateraPulih',
        image: 'https://images.pexels.com/photos/933624/pexels-photo-933624.jpeg?auto=compress&cs=tinysrgb&w=800',
        theme: 'green',
        buttonText: 'Zakat sekarang!',
        buttonLink: '/zakat'
    },
    {
        id: 2,
        title: 'SELAMATKAN MASA DEPAN BAYI TERLANTAR',
        subtitle: 'Salurkan donasi rutin melalui Jadi Orang Tua Asuh',
        image: 'https://images.pexels.com/photos/5624357/pexels-photo-5624357.jpeg?auto=compress&cs=tinysrgb&w=800',
        theme: 'pink',
        buttonText: 'Donasi Sekarang',
        buttonLink: '/donasi'
    }
];

export default function PromoSlider() {
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();
    const [items, setItems] = useState<any[]>([]); // Start empty to wait for fetch
    const [currentIndex, setCurrentIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            // Fetch from dedicated columns now
            const { data, error } = await supabase
                .from('layout_settings')
                .select('promo_slider_items, promo_slider_enabled')
                .limit(1)
                .maybeSingle();

            if (data) {
                // Check enabled flag
                if (data.promo_slider_enabled === false) {
                    setItems([]);
                } else if (data.promo_slider_items && Array.isArray(data.promo_slider_items) && data.promo_slider_items.length > 0) {
                    setItems(data.promo_slider_items);
                } else {
                    // If enabled but no items, fallback
                    setItems(DEFAULT_ITEMS);
                }
            } else {
                // No settings found
                setItems(DEFAULT_ITEMS);
            }
        } catch (err) {
            console.error('Error fetching promo settings:', err);
            // Fallback
            setItems(DEFAULT_ITEMS);
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
            default: return { gradient: 'from-[#f472b6] to-[#db2777]', buttonColor: 'text-pink-600' };
        }
    };

    if (loading) {
        return (
            <div className="py-2 bg-white mb-2 animate-pulse">
                <div className="w-full max-w-[480px] mx-auto px-4">
                    <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
                    <div className="w-full aspect-[16/9] bg-gray-200 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className="py-2 bg-white mb-2">
            <div className="w-full max-w-[480px] mx-auto px-4">
                {/* Section Title */}
                <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ color: primaryColor }}>
                    Spesial Buat Kamu
                </h2>

                {/* Slider Card */}
                <div
                    className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-lg group cursor-pointer"
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >
                    {items.map((item, index) => {
                        const styles = getThemeStyles(item.theme);
                        return (
                            <div
                                key={index}
                                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                    }`}
                            >
                                {/* Background Image */}
                                <img
                                    src={item.image || 'https://via.placeholder.com/800x400'}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    alt={item.title}
                                />

                                {/* Content Layer (Removed Blur Box) */}
                                <div className="absolute inset-0 p-6 flex flex-col justify-center items-start z-20">
                                    <div className="max-w-[90%] space-y-3">
                                        <div className="space-y-1">
                                            {item.title && (
                                                <h3 className="text-xl font-bold leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                                    {item.title}
                                                </h3>
                                            )}
                                            {item.subtitle && (
                                                <p className="text-sm font-medium text-white/95 leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                                    {item.subtitle}
                                                </p>
                                            )}
                                        </div>

                                        {item.buttonText && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(item.buttonLink || '/');
                                                }}
                                                className={`px-5 py-2 bg-white rounded-full font-bold text-sm shadow-md transition-all transform hover:scale-105 active:scale-95 ${styles.buttonColor}`}
                                            >
                                                {item.buttonText}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Dots Indicator */}
                    {items.length > 1 && (
                        <div className="absolute bottom-4 left-6 z-30 flex gap-1.5">
                            {items.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentIndex(idx);
                                    }}
                                    className={`transition-all duration-300 rounded-full shadow-sm hover:bg-white ${idx === currentIndex
                                            ? 'w-6 h-1.5 bg-white'
                                            : 'w-1.5 h-1.5 bg-white/60'
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
