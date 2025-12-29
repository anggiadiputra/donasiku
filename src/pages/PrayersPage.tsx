import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Search, Filter, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import Header from '../components/Header';
import Footer from '../components/Footer';
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

interface Campaign {
    id: string;
    title: string;
}

export default function PrayersPage() {
    const [prayers, setPrayers] = useState<Prayer[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [amenedPrayers, setAmenedPrayers] = useState<Set<string>>(new Set());
    const itemsPerPage = 12;
    const primaryColor = usePrimaryColor();
    const navigate = useNavigate();

    useEffect(() => {
        fetchPrayers();
        fetchCampaigns();
        loadAmenedPrayers();
    }, []);

    const loadAmenedPrayers = () => {
        const stored = localStorage.getItem('amened_prayers');
        if (stored) {
            setAmenedPrayers(new Set(JSON.parse(stored)));
        }
    };

    const handleAmen = async (prayerId: string) => {
        if (amenedPrayers.has(prayerId)) return;

        try {
            const prayer = prayers.find(p => p.id === prayerId);
            if (!prayer) return;

            const { error } = await supabase
                .from('transactions')
                .update({ amen_count: (prayer.amen_count || 0) + 1 })
                .eq('id', prayerId);

            if (error) throw error;

            setPrayers(prev => prev.map(p =>
                p.id === prayerId
                    ? { ...p, amen_count: (p.amen_count || 0) + 1 }
                    : p
            ));

            const newAmened = new Set(amenedPrayers);
            newAmened.add(prayerId);
            setAmenedPrayers(newAmened);
            localStorage.setItem('amened_prayers', JSON.stringify([...newAmened]));
        } catch (error) {
            console.error('Error updating amen:', error);
        }
    };

    const fetchCampaigns = async (retryCount = 0) => {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('id, title')
                .eq('status', 'published')
                .order('title');

            if (error) {
                if (isNetworkError(error) && retryCount < 2) {
                    setTimeout(() => fetchCampaigns(retryCount + 1), 2000);
                    return;
                }
                throw error;
            }
            setCampaigns(data || []);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        }
    };

    const fetchPrayers = async (retryCount = 0) => {
        try {
            setLoading(true);

            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('id, customer_name, customer_message, amount, created_at, campaign_id, status, amen_count')
                .eq('status', 'success')
                .not('customer_message', 'is', null)
                .neq('customer_message', '')
                .order('created_at', { ascending: false });

            if (error) {
                if (isNetworkError(error) && retryCount < 2) {
                    console.warn(`PrayersPage network issue, retrying (${retryCount + 1})...`);
                    setTimeout(() => fetchPrayers(retryCount + 1), 2000);
                    return;
                }
                throw error;
            }

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
            console.error('Error fetching prayers:', err);
            if (isNetworkError(err) && retryCount < 2) {
                setTimeout(() => fetchPrayers(retryCount + 1), 2000);
                return;
            }
        } finally {
            if (retryCount === 0 || !loading) {
                setLoading(false);
            }
        }
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

    // Filter prayers
    const filteredPrayers = prayers.filter(prayer => {
        const matchesSearch =
            prayer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prayer.customer_message.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCampaign =
            selectedCampaign === 'all' || prayer.campaign_id === selectedCampaign;

        return matchesSearch && matchesCampaign;
    });

    // Pagination
    const totalPages = Math.ceil(filteredPrayers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPrayers = filteredPrayers.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCampaign]);

    return (
        <div className="fixed inset-0 bg-gray-100 flex justify-center">
            <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
                <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    <Header />
                    <div className="min-h-screen bg-white">
                        <div className="px-4 py-8">
                            {/* Header */}
                            <div className="mb-8">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    Kembali
                                </button>

                                <div className="flex items-center gap-3 mb-2">
                                    <MessageCircle className="w-8 h-8" style={{ color: primaryColor }} />
                                    <h1 className="text-3xl font-bold text-gray-800">Semua Doa</h1>
                                </div>
                                <p className="text-gray-600">
                                    {filteredPrayers.length} doa dari para donatur
                                </p>
                            </div>

                            {/* Filters */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                                <div className="grid grid-cols-1 gap-4">
                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Cari nama atau pesan doa..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
                                            style={{ borderColor: '#e5e7eb' }}
                                        />
                                    </div>

                                    {/* Campaign Filter */}
                                    <div className="relative">
                                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <select
                                            value={selectedCampaign}
                                            onChange={(e) => setSelectedCampaign(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 appearance-none bg-white"
                                        >
                                            <option value="all">Semua Campaign</option>
                                            {campaigns.map(campaign => (
                                                <option key={campaign.id} value={campaign.id}>
                                                    {campaign.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Prayers Grid */}
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse border border-gray-100">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                                <div className="flex-1">
                                                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                                </div>
                                            </div>
                                            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : currentPrayers.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                                    <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Tidak ada doa ditemukan</h3>
                                    <p className="text-gray-600">
                                        {searchTerm || selectedCampaign !== 'all'
                                            ? 'Coba ubah filter pencarian Anda'
                                            : 'Belum ada doa yang dibagikan'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4 mb-8">
                                        {currentPrayers.map((prayer) => (
                                            <div
                                                key={prayer.id}
                                                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
                                            >
                                                {/* Header */}
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div
                                                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                                                        style={{ backgroundColor: primaryColor }}
                                                    >
                                                        {prayer.is_anonymous ? '?' : getInitial(prayer.customer_name)}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-gray-800 truncate">
                                                            {prayer.is_anonymous ? 'Hamba Allah' : prayer.customer_name}
                                                        </h3>
                                                        <p className="text-xs text-gray-500">{formatTimeAgo(prayer.created_at)}</p>
                                                    </div>
                                                </div>

                                                {/* Message */}
                                                <div className="mb-4">
                                                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-4 italic">
                                                        "{prayer.customer_message}"
                                                    </p>
                                                </div>

                                                {/* Footer */}
                                                <div className="pt-4 border-t border-gray-100">
                                                    <div className="flex items-center justify-between gap-2 mb-3">
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-1 min-w-0">
                                                            <Heart className="w-3.5 h-3.5 flex-shrink-0" />
                                                            <span className="truncate">{prayer.campaign_title}</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleAmen(prayer.id)}
                                                        disabled={amenedPrayers.has(prayer.id)}
                                                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                        <Heart className="w-4 h-4" fill={amenedPrayers.has(prayer.id) ? 'currentColor' : 'none'} />
                                                        {amenedPrayers.has(prayer.id) ? 'Diamini' : 'Aamiin'}
                                                        {prayer.amen_count && prayer.amen_count > 0 && (
                                                            <span className="ml-1">({prayer.amen_count})</span>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-2 pb-8">
                                            <button
                                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                disabled={currentPage === 1}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Previous
                                            </button>

                                            <div className="flex gap-2">
                                                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                                                    let pageNum;
                                                    if (totalPages <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage <= 2) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage >= totalPages - 1) {
                                                        pageNum = totalPages - 2 + i;
                                                    } else {
                                                        pageNum = currentPage - 1 + i;
                                                    }

                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => setCurrentPage(pageNum)}
                                                            className="w-10 h-10 rounded-lg font-semibold transition-colors"
                                                            style={{
                                                                backgroundColor: currentPage === pageNum ? primaryColor : 'white',
                                                                color: currentPage === pageNum ? 'white' : '#6b7280',
                                                                border: `1px solid ${currentPage === pageNum ? primaryColor : '#e5e7eb'}`,
                                                            }}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <button
                                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <Footer />
                </div>
            </div>
        </div>
    );
}
