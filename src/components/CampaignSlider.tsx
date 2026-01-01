import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase, Campaign } from '../lib/supabase';
import { createSlug } from '../utils/slug';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { useAppName } from '../hooks/useAppName';
import VerifiedBadge from './VerifiedBadge';

import { isNetworkError, isDatabaseRelationshipError } from '../utils/errorHandling';
import { CampaignSliderSkeleton } from './SkeletonLoader';

interface CampaignSliderProps {
    variant?: 'primary' | 'secondary';
}

export default function CampaignSlider({ variant = 'primary' }: CampaignSliderProps) {
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();
    const { appName } = useAppName();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [sectionTitle, setSectionTitle] = useState('Pilihan Donasiku');

    useEffect(() => {
        fetchData();
    }, [variant]); // Refetch if variant changes

    const fetchData = async (retryCount = 0) => {
        try {
            setLoading(true);

            // 1. Fetch Settings
            const { data: settings, error: settingsError } = await supabase
                .from('layout_settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (settingsError && isNetworkError(settingsError) && retryCount < 2) {
                console.warn(`Network issue in settings, retrying (${retryCount + 1})...`);
                setTimeout(() => fetchData(retryCount + 1), 2000);
                return;
            }

            if (settings) {
                let enabled, title, ids;

                if (variant === 'secondary') {
                    enabled = settings.campaign_slider_2_enabled;
                    title = settings.campaign_slider_2_title;
                    ids = settings.campaign_slider_2_ids;
                } else {
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
                const query = supabase
                    .from('campaigns')
                    .select('*, profiles:user_id(full_name, organization_name, avatar_url, role, verification_status), organizations(name, logo_url, verification_status)')
                    .eq('status', 'published')
                    .not('slug', 'in', '("infaq","fidyah","zakat","wakaf","sedekah-subuh","kemanusiaan")');

                if (ids && Array.isArray(ids) && ids.length > 0) {
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    const validIds = ids.filter(id => id && typeof id === 'string' && uuidRegex.test(id));

                    if (validIds.length === 0) {
                        const { data, error } = await query
                            .order('is_featured', { ascending: false })
                            .order('is_urgent', { ascending: false })
                            .order('created_at', { ascending: false })
                            .limit(10);
                        if (error) throw error;
                        if (data) setCampaigns(data);
                    } else {
                        const { data, error } = await query.in('id', validIds);
                        if (error) throw error;
                        if (data) {
                            const sortedData = ids
                                .map(id => data.find(c => c.id === id))
                                .filter(c => c !== undefined) as Campaign[];
                            setCampaigns(sortedData);
                        }
                    }
                } else {
                    const { data, error } = await query
                        .order('is_featured', { ascending: false })
                        .order('is_urgent', { ascending: false })
                        .order('created_at', { ascending: false })
                        .limit(10);
                    if (error) throw error;
                    if (data) setCampaigns(data);
                }

            } else {
                const { data, error } = await supabase
                    .from('campaigns')
                    .select('*, profiles:user_id(full_name, organization_name, avatar_url, role, verification_status), organizations(name, logo_url, verification_status)')
                    .eq('status', 'published')
                    .order('is_featured', { ascending: false })
                    .order('is_urgent', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(10);
                if (error) throw error;
                if (data) setCampaigns(data);
            }

        } catch (error: any) {
            console.error('Slider fetchData error:', error);

            if (isNetworkError(error) && retryCount < 2) {
                console.warn(`Network issue in data, retrying (${retryCount + 1})...`);
                setTimeout(() => fetchData(retryCount + 1), 2000);
                return;
            }

            if (isDatabaseRelationshipError(error) || isNetworkError(error)) {
                console.warn('Falling back to basic query in Slider...');
                const { data: fallbackData } = await supabase
                    .from('campaigns')
                    .select('*, profiles:user_id(full_name, organization_name, avatar_url, role, verification_status), organizations(name, logo_url, verification_status)')
                    .eq('status', 'published')
                    .not('slug', 'in', '("infaq","fidyah","zakat","wakaf","sedekah-subuh","kemanusiaan")')
                    .order('is_featured', { ascending: false })
                    .order('is_urgent', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (fallbackData) {
                    setCampaigns(fallbackData);
                    return;
                }
            }

            setCampaigns([]);
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
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return <CampaignSliderSkeleton />;
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
                                                {/* @ts-ignore */}
                                                {campaign.organizations?.name ||
                                                    (campaign.profiles?.role === 'admin' ? (campaign.profiles?.organization_name || appName || campaign.profiles?.full_name || 'Donasiku') :
                                                        (campaign.profiles?.organization_name || campaign.profiles?.full_name || campaign.organization_name || 'Donasiku'))}
                                            </span>
                                            {/* @ts-ignore */}
                                            {((campaign.organizations?.verification_status === 'verified') ||
                                                (!campaign.organizations && (campaign.profiles?.verification_status === 'verified' || campaign.profiles?.role === 'admin'))) && (
                                                    <VerifiedBadge size="sm" className="flex-shrink-0" />
                                                )}
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
