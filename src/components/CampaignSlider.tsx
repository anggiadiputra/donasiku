import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CheckCircle } from 'lucide-react';
import { supabase, Campaign } from '../lib/supabase';
import { createSlug } from '../utils/slug';
import { usePrimaryColor } from '../hooks/usePrimaryColor';

interface CampaignSliderProps {
    variant?: 'primary' | 'secondary';
}

export default function CampaignSlider({ variant = 'primary' }: CampaignSliderProps) {
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [sectionTitle, setSectionTitle] = useState('Pilihan Donasiku');

    useEffect(() => {
        fetchData();
    }, [variant]); // Refetch if variant changes

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Settings
            const { data: settings } = await supabase
                .from('layout_settings')
                .select('*') // Fetch all to be safe, or specify all column names
                .limit(1)
                .maybeSingle();

            if (settings) {
                let enabled, title, ids;

                if (variant === 'secondary') {
                    enabled = settings.campaign_slider_2_enabled;
                    title = settings.campaign_slider_2_title;
                    ids = settings.campaign_slider_2_ids;
                } else {
                    // Default to primary
                    enabled = settings.campaign_slider_enabled;
                    title = settings.campaign_slider_title;
                    ids = settings.campaign_slider_ids;
                }

                if (enabled === false) {
                    setCampaigns([]);
                    setLoading(false);
                    return;
                }
                if (title) {
                    setSectionTitle(title);
                }

                // 2. Fetch Campaigns based on settings
                let query = supabase
                    .from('campaigns')
                    .select('*')
                    .eq('status', 'published')
                    .not('slug', 'in', '("infaq","fidyah","zakat","wakaf","sedekah-subuh","kemanusiaan")');

                if (ids && Array.isArray(ids) && ids.length > 0) {
                    // Filter for valid UUIDs to prevent 400 Bad Request
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    const validIds = ids.filter(id => id && typeof id === 'string' && uuidRegex.test(id));

                    if (validIds.length === 0) {
                        // Fallback if all IDs are invalid
                        const { data, error } = await query
                            .order('created_at', { ascending: false })
                            .limit(10);
                        if (data) setCampaigns(data);
                    } else {
                        // Fetch specific campaigns
                        const { data, error } = await query.in('id', validIds);

                        if (data) {
                            // Sort by the order in ids
                            const sortedData = ids
                                .map(id => data.find(c => c.id === id))
                                .filter(c => c !== undefined) as Campaign[];
                            setCampaigns(sortedData);
                        }
                    }
                } else {
                    // Default: Top 10 recent
                    const { data, error } = await query
                        .order('created_at', { ascending: false })
                        .limit(10);

                    if (data) setCampaigns(data);
                }

            } else {
                // Fallback if no settings
                const { data, error } = await supabase
                    .from('campaigns')
                    .select('*')
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .limit(10);
                if (data) setCampaigns(data);
            }

        } catch (error) {
            console.error('Error:', error);
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="py-6 bg-white border-b border-gray-100">
                <div className="w-full max-w-[480px] mx-auto px-4">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
                    <div className="flex gap-4 overflow-hidden">
                        {[1, 2].map(i => (
                            <div key={i} className="w-[280px] shrink-0 bg-gray-100 rounded-xl h-[320px] animate-pulse"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (campaigns.length === 0) return null;

    return (
        <div className="py-6 bg-white border-b border-gray-100">
            <div className="w-full max-w-[480px] mx-auto pl-4">
                <div className="flex items-center justify-between pr-4 mb-4">
                    <h2 className="text-lg font-bold text-gray-800">{sectionTitle}</h2>
                    <button
                        onClick={() => navigate('/campaign')}
                        className="text-sm font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity"
                        style={{ color: primaryColor }}
                    >
                        Lihat Semua
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-x-auto flex gap-4 pb-4 -ml-4 pl-4 scrollbar-hide snap-x snap-mandatory pr-4">
                    {campaigns.map((campaign) => {
                        const progress = Math.min(((campaign.current_amount || 0) / (campaign.target_amount || 1)) * 100, 100);
                        const slug = campaign.slug || createSlug(campaign.title);

                        return (
                            <div
                                key={campaign.id}
                                onClick={() => navigate(`/campaign/${slug}`)}
                                className="w-[260px] flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden snap-center cursor-pointer hover:shadow-md transition-shadow"
                            >
                                {/* Image */}
                                <div className="h-[140px] relative bg-gray-100">
                                    <img
                                        src={campaign.image_url || 'https://via.placeholder.com/400x200'}
                                        alt={campaign.title}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Category Badge (Optional/Dynamic) */}
                                    <div className="absolute top-2 left-2">
                                        <div className="bg-white/90 backdrop-blur rounded-full p-1.5 shadow-sm">
                                            {/* Example icon, ideally dynamic */}
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: primaryColor }} >
                                                <img src="/logo.png" className="w-full h-full object-contain rounded-full opacity-0" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                {/* Use initial if no logo */}
                                                D
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-4 flex flex-col h-[180px] justify-between">
                                    <div>
                                        {/* Organization */}
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <span className="text-xs font-medium text-gray-600 truncate max-w-[140px]">
                                                {campaign.organization_name || 'Donasiku'}
                                            </span>
                                            {campaign.is_verified && (
                                                <CheckCircle className="w-3 h-3 text-blue-500 fill-current" />
                                            )}
                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded border border-blue-100 font-medium">ORG</span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 mb-3 h-[42px]">
                                            {campaign.title}
                                        </h3>
                                    </div>

                                    {/* Progress & Stats */}
                                    <div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${progress}%`, backgroundColor: primaryColor }}
                                            ></div>
                                        </div>

                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-0.5">Terkumpul</p>
                                                <p className="text-sm font-bold text-gray-900" style={{ color: primaryColor }}>
                                                    {formatCurrency(campaign.current_amount)}
                                                </p>
                                            </div>
                                            {/* Optional: Sisa hari or other stat */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
