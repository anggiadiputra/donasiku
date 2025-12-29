import { useState, useEffect } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { darkenColor } from '../utils/colorUtils';
import { useNavigate } from 'react-router-dom';
import { isNetworkError } from '../utils/errorHandling';

interface Prayer {
    id: string;
    customer_name: string;
    customer_message: string;
    amount: number;
    created_at: string;
    campaign_id: string;
    campaign_title?: string;
    is_anonymous: boolean;
    amen_count?: number;
}

export default function PrayersSection() {
    const [prayers, setPrayers] = useState<Prayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [amenedPrayers, setAmenedPrayers] = useState<Set<string>>(new Set());
    const primaryColor = usePrimaryColor();
    const navigate = useNavigate();

    useEffect(() => {
        fetchPrayers();
        loadAmenedPrayers();
    }, []);

    const loadAmenedPrayers = () => {
        // Load from localStorage
        const stored = localStorage.getItem('amened_prayers');
        if (stored) {
            setAmenedPrayers(new Set(JSON.parse(stored)));
        }
    };

    const handleAmen = async (prayerId: string) => {
        if (amenedPrayers.has(prayerId)) return; // Already amened

        try {
            // Update amen count in database
            const prayer = prayers.find(p => p.id === prayerId);
            if (!prayer) return;

            const { error } = await supabase
                .from('transactions')
                .update({ amen_count: (prayer.amen_count || 0) + 1 })
                .eq('id', prayerId);

            if (error) throw error;

            // Update local state
            setPrayers(prev => prev.map(p =>
                p.id === prayerId
                    ? { ...p, amen_count: (p.amen_count || 0) + 1 }
                    : p
            ));

            // Mark as amened
            const newAmened = new Set(amenedPrayers);
            newAmened.add(prayerId);
            setAmenedPrayers(newAmened);
            localStorage.setItem('amened_prayers', JSON.stringify([...newAmened]));
        } catch (error) {
            console.error('Error updating amen:', error);
        }
    };

    const fetchPrayers = async (retryCount = 0) => {
        try {
            setLoading(true);

            // Fetch transactions with messages (prayers)
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('id, customer_name, customer_message, amount, created_at, campaign_id, status, amen_count')
                .eq('status', 'success')
                .not('customer_message', 'is', null)
                .neq('customer_message', '')
                .order('created_at', { ascending: false })
                .limit(7);

            if (error) {
                console.error('Error fetching prayers:', error);

                // Handle Network Errors
                if (isNetworkError(error) && retryCount < 2) {
                    console.warn(`Prayers network issue, retrying (${retryCount + 1})...`);
                    setTimeout(() => fetchPrayers(retryCount + 1), 2000);
                    return;
                }
                setPrayers([]);
                return;
            }

            // Fetch campaign titles
            if (transactions && transactions.length > 0) {
                // Filter for valid UUIDs to prevent 400 Bad Request
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const campaignIds = [...new Set(
                    transactions
                        .map(t => t.campaign_id)
                        .filter(id => id && uuidRegex.test(id))
                )];

                if (campaignIds.length > 0) {
                    const { data: campaigns } = await supabase
                        .from('campaigns')
                        .select('id, title')
                        .in('id', campaignIds);

                    const campaignMap = new Map(campaigns?.map(c => [c.id, c.title]) || []);

                    const prayersWithCampaigns = transactions.map(tx => ({
                        ...tx,
                        campaign_title: campaignMap.get(tx.campaign_id) || 'Campaign',
                        is_anonymous: tx.customer_name === 'Orang Baik' || tx.customer_name === 'Hamba Allah',
                    }));

                    setPrayers(prayersWithCampaigns);
                } else {
                    // No valid campaigns, just show prayers without campaign titles
                    const prayersWithCampaigns = transactions.map(tx => ({
                        ...tx,
                        campaign_title: 'Campaign',
                        is_anonymous: tx.customer_name === 'Orang Baik' || tx.customer_name === 'Hamba Allah',
                    }));
                    setPrayers(prayersWithCampaigns);
                }
            } else {
                setPrayers([]);
            }
        } catch (err: any) {
            console.error('Unexpected Prayers error:', err);
            if (isNetworkError(err) && retryCount < 2) {
                setTimeout(() => fetchPrayers(retryCount + 1), 2000);
                return;
            }
            setPrayers([]);
        } finally {
            if (retryCount === 0 || !loading) {
                setLoading(false);
            }
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Baru saja';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
        return `${Math.floor(diffInSeconds / 604800)} minggu lalu`;
    };

    const getInitial = (name: string) => {
        return name?.charAt(0).toUpperCase() || '?';
    };

    if (loading) {
        return (
            <section className="py-16 bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="w-full max-w-[480px] mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Doa-doa Orang Baik</h2>
                        <p className="text-gray-600">Doa dan dukungan dari para donatur</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/4 mb-4"></div>
                                        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (prayers.length === 0) {
        return null;
    }

    return (
        <section className="py-16 bg-white">
            <div className="w-full max-w-[480px] mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Doa-doa Orang Baik</h2>
                    <p className="text-gray-600 text-sm">
                        Doa dan dukungan tulus dari para donatur untuk kebaikan bersama
                    </p>
                </div>

                {/* Horizontal Scrollable Prayers */}
                <div className="relative">
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                        {prayers.map((prayer) => (
                            <div
                                key={prayer.id}
                                className="flex-shrink-0 w-72 bg-white rounded-xl p-5 shadow-md border border-gray-200 snap-start"
                            >
                                {/* Header with Avatar and Info */}
                                <div className="flex items-start gap-3 mb-3">
                                    {/* Avatar */}
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {prayer.is_anonymous ? '?' : getInitial(prayer.customer_name)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-800 text-sm truncate">
                                            {prayer.is_anonymous ? 'Hamba Allah' : prayer.customer_name}
                                        </h3>
                                        <p className="text-xs text-gray-500">{formatTimeAgo(prayer.created_at)}</p>
                                    </div>
                                </div>

                                {/* Message */}
                                <div className="mb-3">
                                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-3 italic">
                                        "{prayer.customer_message}"
                                    </p>
                                </div>

                                {/* Footer with Aamiin Button */}
                                <div className="pt-3 border-t border-gray-100">
                                    <div className="flex items-center justify-end">
                                        <button
                                            onClick={() => handleAmen(prayer.id)}
                                            disabled={amenedPrayers.has(prayer.id)}
                                            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{
                                                backgroundColor: amenedPrayers.has(prayer.id) ? '#e5e7eb' : `${primaryColor}15`,
                                                color: amenedPrayers.has(prayer.id) ? '#9ca3af' : primaryColor,
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!amenedPrayers.has(prayer.id)) {
                                                    e.currentTarget.style.backgroundColor = `${primaryColor}25`;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!amenedPrayers.has(prayer.id)) {
                                                    e.currentTarget.style.backgroundColor = `${primaryColor}15`;
                                                }
                                            }}
                                        >
                                            <Heart className="w-3 h-3" fill={amenedPrayers.has(prayer.id) ? 'currentColor' : 'none'} />
                                            {amenedPrayers.has(prayer.id) ? 'Diamini' : 'Aamiin'}
                                            {prayer.amen_count && prayer.amen_count > 0 && (
                                                <span className="ml-0.5">({prayer.amen_count})</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* View All Button */}
                <div className="text-center mt-8">
                    <button
                        onClick={() => navigate('/prayers')}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                        style={{
                            backgroundColor: primaryColor,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = darkenColor(primaryColor, 10);
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = primaryColor;
                        }}
                    >
                        <MessageCircle className="w-4 h-4" />
                        Lihat Semua Doa
                    </button>
                </div>
            </div>

            {/* Custom scrollbar styles */}
            <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </section>
    );
}
