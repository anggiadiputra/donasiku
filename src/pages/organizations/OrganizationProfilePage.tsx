import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, MapPin, Share2, ArrowLeft } from 'lucide-react';
import { supabase, Campaign } from '../../lib/supabase';
import ShareModal from '../../components/ShareModal';
import Footer from '../../components/Footer';
import { usePageTitle } from '../../hooks/usePageTitle';
import CampaignCard from '../../components/CampaignCard';
import { toast } from 'sonner';
import { usePrimaryColor } from '../../hooks/usePrimaryColor';
import { OrganizationProfileSkeleton } from '../../components/SkeletonLoader';

interface Organization {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    description: string | null;
    location: string | null;
    whatsapp_no: string | null;
}

export default function OrganizationProfilePage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalDonors, setTotalDonors] = useState(0);
    const [totalRaised, setTotalRaised] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 7;
    const [showShareModal, setShowShareModal] = useState(false);

    usePageTitle(organization?.name || 'Profil Organisasi');

    useEffect(() => {
        if (slug) {
            fetchOrganizationData();
        }
    }, [slug]);

    const fetchOrganizationData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Organization
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .eq('slug', slug)
                .single();

            if (orgError || !org) {
                console.error('Org not found:', orgError);
                toast.error('Organisasi tidak ditemukan');
                navigate('/campaign');
                return;
            }

            setOrganization(org);

            // 2. Fetch Campaigns
            const { data: campaignList, error: campaignsError } = await supabase
                .from('campaigns')
                .select('*')
                .eq('organization_id', org.id)
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            if (campaignsError) throw campaignsError;
            setCampaigns(campaignList || []);

            // 3. Calculate Aggregates
            const campaignIds = (campaignList || []).map(c => c.id);
            let donorsCount = 0;
            const totalRaisedAmount = (campaignList || []).reduce((acc, curr) => acc + (curr.current_amount || 0), 0);

            if (campaignIds.length > 0) {
                const { count, error: countError } = await supabase
                    .from('transactions')
                    .select('*', { count: 'exact', head: true })
                    .in('campaign_id', campaignIds)
                    .eq('status', 'success');

                if (!countError && count !== null) {
                    donorsCount = count;
                }
            }

            setTotalDonors(donorsCount);
            setTotalRaised(totalRaisedAmount);
        } catch (error: any) {
            console.error('Error fetching org data:', error);
            toast.error('Gagal memuat profil organisasi');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <OrganizationProfileSkeleton />;
    }

    if (!organization) return null;

    return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
            {/* Minimal Sticky Header for Branding */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                    {organization.logo_url && <img src={organization.logo_url} className="w-6 h-6 rounded-md object-cover" alt="" />}
                    <span className="font-bold text-gray-800 text-sm truncate max-w-[150px]">{organization.name}</span>
                </div>
                <button onClick={() => setShowShareModal(true)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Share2 className="w-4 h-4 text-gray-600" />
                </button>
            </div>

            <main className="flex-1 pb-16">
                {/* Visual Header / Cover */}
                <div
                    className="h-32 md:h-40 w-full relative"
                    style={{
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                        opacity: 0.9
                    }}
                >
                    <div className="absolute inset-0 overflow-hidden opacity-20">
                        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white blur-3xl"></div>
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-white blur-3xl"></div>
                    </div>
                </div>

                {/* Profile Section */}
                <div className="px-5 -mt-12 relative z-10">
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-6 border border-gray-50">
                        <div className="flex flex-col items-center text-center">
                            {/* Large Floating Logo */}
                            <div className="w-24 h-24 rounded-[2rem] bg-white p-1 shadow-lg -mt-16 border border-gray-50 overflow-hidden">
                                {organization.logo_url ? (
                                    <img src={organization.logo_url} alt={organization.name} className="w-full h-full object-cover rounded-[1.8rem]" />
                                ) : (
                                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                        <Building2 className="w-10 h-10 text-gray-300" />
                                    </div>
                                )}
                            </div>

                            {/* Verification & Title */}
                            <div className="mt-4 flex flex-col items-center">
                                <div className="flex items-center gap-1 mb-1">
                                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                                        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z" fill="currentColor" />
                                        <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span className="text-[10px] font-bold text-blue-500 border border-blue-200 rounded px-1">
                                        ORG
                                    </span>
                                </div>
                                <h1 className="text-2xl font-black text-gray-900 leading-tight">
                                    {organization.name}
                                </h1>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{organization.location || 'Indonesia'}</span>
                                </div>
                            </div>

                            {/* About / Description */}
                            <p className="mt-4 text-sm text-gray-500 leading-relaxed max-w-sm">
                                {organization.description || 'Wadah kolaborasi kebaikan untuk Indonesia yang lebih baik. Mari bersama-sama menebar manfaat melalui berbagai program kami.'}
                            </p>

                            {/* Interaction Stats */}
                            <div className="grid grid-cols-3 gap-6 w-full mt-6 py-4 border-t border-b border-gray-50">
                                <div>
                                    <div className="text-lg font-bold text-gray-900">{campaigns.length}</div>
                                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Program</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-gray-900">{totalDonors.toLocaleString()}</div>
                                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Donatur</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-gray-900" style={{ color: primaryColor }}>
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalRaised).replace('IDR', 'Rp')}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Total Dana</div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 w-full mt-6">
                                <button
                                    onClick={() => {
                                        if (organization.whatsapp_no) {
                                            window.open(`https://wa.me/${organization.whatsapp_no.replace(/\D/g, '')}`, '_blank');
                                        } else {
                                            toast.error('Nomor kontak belum tersedia');
                                        }
                                    }}
                                    className="flex-1 py-3.5 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    Hubungi Kami
                                </button>
                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="w-14 h-14 flex items-center justify-center rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shrink-0 active:scale-95"
                                    aria-label="Bagikan"
                                >
                                    <Share2 className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Campaigns List */}
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">Program Berbagi</h2>
                        <button
                            onClick={() => navigate(`/org/${slug}/explore`)}
                            className="text-xs font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-full active:scale-95 transition-all"
                        >
                            Explore
                        </button>
                    </div>

                    <div className="space-y-4">
                        {campaigns.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((campaign) => (
                            <CampaignCard key={campaign.id} campaign={campaign} />
                        ))}

                        {campaigns.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm">Belum ada program bantuan</p>
                            </div>
                        )}
                    </div>

                    {campaigns.length > ITEMS_PER_PAGE && (
                        <div className="mt-6 flex items-center justify-center gap-4">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-50 disabled:bg-gray-50 active:scale-95 transition-all"
                            >
                                Sebelumnya
                            </button>
                            <span className="text-sm font-bold text-gray-600">
                                {currentPage} / {Math.ceil(campaigns.length / ITEMS_PER_PAGE)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(campaigns.length / ITEMS_PER_PAGE), prev + 1))}
                                disabled={currentPage === Math.ceil(campaigns.length / ITEMS_PER_PAGE)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-50 disabled:bg-gray-50 active:scale-95 transition-all"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <Footer />

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                shareUrl={window.location.href}
                shareText={`Dukung berbagai program kebaikan dari ${organization.name} di Donasiku!`}
            />
        </div>
    );
}
