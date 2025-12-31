import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Search } from 'lucide-react';
import { supabase, Campaign } from '../../lib/supabase';
import { CampaignCardSkeleton } from '../../components/SkeletonLoader';
import CampaignCard from '../../components/CampaignCard';
import { usePageTitle } from '../../hooks/usePageTitle';
import { usePrimaryColor } from '../../hooks/usePrimaryColor';

export default function OrganizationExplorePage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();
    const [organization, setOrganization] = useState<any>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const observer = useRef<IntersectionObserver | null>(null);
    const ITEMS_PER_PAGE = 7;

    usePageTitle(`Eksplor Program - ${organization?.name || 'Loading...'}`);

    useEffect(() => {
        if (slug) {
            fetchInitialData();
        }
    }, [slug]);

    useEffect(() => {
        if (page > 0) {
            fetchMoreCampaigns();
        }
    }, [page]);

    // Initial fetch for org and first page of campaigns
    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .eq('slug', slug)
                .single();

            if (orgError || !org) {
                navigate('/campaign');
                return;
            }
            setOrganization(org);

            const { data: campaignList, error: campaignsError } = await supabase
                .from('campaigns')
                .select('*, profiles:user_id(role), organizations(name, logo_url)')
                .eq('organization_id', org.id)
                .eq('status', 'published')
                .order('created_at', { ascending: false })
                .range(0, ITEMS_PER_PAGE - 1);

            if (campaignsError) throw campaignsError;

            setCampaigns(campaignList || []);
            setHasMore((campaignList || []).length === ITEMS_PER_PAGE);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMoreCampaigns = async () => {
        if (!organization || !hasMore) return;

        try {
            const from = page * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data: moreCampaigns, error } = await supabase
                .from('campaigns')
                .select('*, profiles:user_id(role), organizations(name, logo_url)')
                .eq('organization_id', organization.id)
                .eq('status', 'published')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            if (moreCampaigns && moreCampaigns.length > 0) {
                setCampaigns(prev => [...prev, ...moreCampaigns]);
                setHasMore(moreCampaigns.length === ITEMS_PER_PAGE);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error fetching more campaigns:', error);
        }
    };

    const lastCampaignRef = (node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    };

    const filteredCampaigns = campaigns.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-800" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-bold text-gray-900 truncate">Program {organization?.name}</h1>
                </div>
            </div>

            <main className="flex-1 p-4">
                {/* Search Bar */}
                <div className="mb-6 relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Cari program kebaikan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 transition-all text-sm"
                        style={{ '--tw-ring-color': primaryColor } as any}
                    />
                </div>

                {/* Campaign List */}
                <div className="space-y-4">
                    {loading && page === 0 ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <CampaignCardSkeleton key={i} />
                        ))
                    ) : filteredCampaigns.length > 0 ? (
                        <>
                            {filteredCampaigns.map((campaign, index) => {
                                if (filteredCampaigns.length === index + 1) {
                                    return (
                                        <div ref={lastCampaignRef} key={campaign.id}>
                                            <CampaignCard campaign={campaign} />
                                        </div>
                                    );
                                } else {
                                    return <CampaignCard key={campaign.id} campaign={campaign} />;
                                }
                            })}

                            {hasMore && (
                                <div className="space-y-4 pt-4">
                                    <CampaignCardSkeleton />
                                    <CampaignCardSkeleton />
                                </div>
                            )}
                        </>
                    ) : (
                        !loading && (
                            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200 px-6">
                                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <h3 className="text-gray-900 font-bold mb-1">Program Tidak Ditemukan</h3>
                                <p className="text-gray-500 text-sm">Coba cari dengan kata kunci lain</p>
                            </div>
                        )
                    )}
                </div>
            </main>
        </div>
    );
}
