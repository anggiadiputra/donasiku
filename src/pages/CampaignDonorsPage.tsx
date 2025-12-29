import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { CampaignDonorsSkeleton } from '../components/SkeletonLoader';
import { isNetworkError } from '../utils/errorHandling';

// Utility functions (mirrored from utils/format usually, or inline if simple)
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari yang lalu`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} bulan yang lalu`;
    const years = Math.floor(months / 12);
    return `${years} tahun yang lalu`;
};

export default function CampaignDonorsPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();

    const [loading, setLoading] = useState(true);
    const [donors, setDonors] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [campaignTitle, setCampaignTitle] = useState('');

    useEffect(() => {
        if (slug) {
            fetchData();
        }
    }, [slug]);

    const fetchData = async (retryCount = 0) => {
        try {
            setLoading(true);

            // 1. Get Campaign ID by Slug
            const { data: campaign, error: campaignError } = await supabase
                .from('campaigns')
                .select('id, title')
                .eq('slug', slug)
                .single();

            if (campaignError) {
                if (isNetworkError(campaignError) && retryCount < 2) {
                    console.warn(`Campaign lookup network issue, retrying (${retryCount + 1})...`);
                    setTimeout(() => fetchData(retryCount + 1), 2000);
                    return;
                }
                throw new Error('Campaign not found');
            }

            if (!campaign) throw new Error('Campaign not found');
            setCampaignTitle(campaign.title);

            // 2. Fetch Donors
            const { data: donorsData, error: donorsError } = await supabase
                .from('transactions')
                .select('*')
                .eq('campaign_id', campaign.id)
                .eq('status', 'success')
                .order('created_at', { ascending: false });

            if (donorsError) {
                if (isNetworkError(donorsError) && retryCount < 2) {
                    console.warn(`Donors fetch network issue, retrying (${retryCount + 1})...`);
                    setTimeout(() => fetchData(retryCount + 1), 2000);
                    return;
                }
                throw donorsError;
            }
            setDonors(donorsData || []);

        } catch (err: any) {
            console.error('Error fetching data in DonorsPage:', err);
            if (isNetworkError(err) && retryCount < 2) {
                setTimeout(() => fetchData(retryCount + 1), 2000);
                return;
            }
        } finally {
            if (retryCount === 0 || !loading) {
                setLoading(false);
            }
        }
    };

    const filteredDonors = donors.filter(donor => {
        const name = donor.is_anonymous ? 'Hamba Allah' : (donor.customer_name || 'Hamba Allah');
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (loading) {
        return <CampaignDonorsSkeleton />;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 flex items-center px-4 py-3 sticky top-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div className="ml-2 flex-1">
                    <h1 className="font-bold text-gray-800 text-lg leading-tight">Donatur</h1>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{campaignTitle}</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-[61px] z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari nama donatur..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                        style={{
                            borderColor: 'transparent',
                            // focus ring color logic could be inline but using simpler focus-visible
                        }}
                        // On focus border color
                        onFocus={(e) => e.target.style.borderColor = primaryColor}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-200 rounded-full p-0.5"
                        >
                            <X className="w-3 h-3 text-gray-500" />
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4">
                {filteredDonors.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-sm">
                        {searchQuery ? 'Tidak ada donatur dengan nama tersebut.' : 'Belum ada donatur.'}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredDonors.map((donor) => (
                            <div key={donor.id} className="flex gap-4 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                    {donor.is_anonymous || !donor.customer_name ? (
                                        <div className="w-5 h-5 bg-gray-200 rounded-full" />
                                    ) : (
                                        <span className="font-bold text-gray-500 text-sm">
                                            {donor.customer_name.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800 text-sm">
                                        {(donor.is_anonymous || donor.metadata?.is_anonymous) ? 'Orang Baik' : (donor.customer_name || 'Hamba Allah')}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Berdonasi sebesar <span className="font-semibold text-gray-900">{formatCurrency(donor.amount)}</span>
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {getTimeAgo(donor.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
