import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Minus,
    Plus,
    User,
    ChevronUp,
    ChevronDown,
    Share2,
    Megaphone
} from 'lucide-react';
import { supabase, FidyahSettings, Campaign, Donation } from '../lib/supabase';
import Header from '../components/Header';
import { useAppName } from '../hooks/useAppName';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { usePageTitle } from '../hooks/usePageTitle';
import { getHoverColor } from '../utils/colorUtils';
import { FidyahSkeleton } from '../components/SkeletonLoader';
import ShareModal from '../components/ShareModal';

export default function FidyahPage() {
    usePageTitle('Bayar Fidyah');
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();
    const hoverColor = getHoverColor(primaryColor);
    const { appName } = useAppName();

    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<FidyahSettings | null>(null);
    const [targetCampaign, setTargetCampaign] = useState<Campaign | null>(null);
    const [donors, setDonors] = useState<Donation[]>([]);
    const [totalDonors, setTotalDonors] = useState(0);

    const [days, setDays] = useState(1);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    // Updates State
    const [updates, setUpdates] = useState<any[]>([]);
    const [expandedUpdateId, setExpandedUpdateId] = useState<string | null>(null);

    // Helper to format rough "time ago"
    const getTimeAgo = (dateString: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
        if (seconds < 60) return 'Baru saja';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} menit yang lalu`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} jam yang lalu`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} hari yang lalu`;
        return `${Math.floor(days / 30)} bulan yang lalu`;
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Fidyah Settings
            const { data: settingsData } = await supabase
                .from('fidyah_settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (settingsData) {
                setSettings({
                    ...settingsData,
                    price_per_day: parseFloat(settingsData.price_per_day) || 45000
                });

                // 2. Fetch Target Campaign if exists
                let targetCampaignId = null;
                if (settingsData.target_campaign_id) {
                    const { data: campaignData } = await supabase
                        .from('campaigns')
                        .select('*')
                        .eq('id', settingsData.target_campaign_id)
                        .single();

                    if (campaignData) {
                        setTargetCampaign(campaignData);
                        targetCampaignId = campaignData.id;
                    }
                }

                fetchDonors(targetCampaignId);
                if (targetCampaignId) {
                    fetchUpdates(targetCampaignId);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDonors = async (campaignId?: string | null) => {
        try {
            // 1. Fetch Data (Recent 5)
            let dataQuery = supabase
                .from('transactions')
                .select('*')
                .eq('status', 'success')
                .order('created_at', { ascending: false })
                .limit(5);

            if (campaignId) {
                dataQuery = dataQuery.eq('campaign_id', campaignId);
            } else {
                dataQuery = dataQuery.ilike('product_details', '%Fidyah%');
            }

            const { data } = await dataQuery;

            // 2. Fetch Total Count
            let countQuery = supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'success');

            if (campaignId) {
                countQuery = countQuery.eq('campaign_id', campaignId);
            } else {
                countQuery = countQuery.ilike('product_details', '%Fidyah%');
            }

            const { count } = await countQuery;

            if (count !== null) {
                setTotalDonors(count);
            } else if (data) {
                // Fallback if count fails but data exists
                setTotalDonors(prev => Math.max(prev, data.length));
            }

            if (data) {
                const mappedDonors = data.map(tx => ({
                    id: tx.id,
                    donor_name: tx.customer_name,
                    amount: tx.amount,
                    is_anonymous: tx.is_anonymous || tx.metadata?.is_anonymous,
                    created_at: tx.created_at,
                    campaign_id: tx.campaign_id,
                    payment_method: tx.payment_method,
                    status: tx.status,
                    message: tx.customer_message
                }));
                setDonors(mappedDonors as (Donation & { message?: string })[]);
            }
        } catch (error) {
            console.error('Error fetching donors:', error);
        }
    };

    const fetchUpdates = async (campaignId: string) => {
        const { data: updatesData, error: updatesError } = await supabase
            .from('campaign_updates')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false });

        if (!updatesError && updatesData) {
            setUpdates(updatesData);
        }
    };

    const handleIncrement = () => setDays(prev => prev + 1);
    const handleDecrement = () => setDays(prev => (prev > 1 ? prev - 1 : 1));

    const totalAmount = (settings?.price_per_day || 0) * days;

    const handleDonate = () => {
        // Navigate to DonationForm with state
        navigate(`/fidyah/bayar`, {
            state: {
                customAmount: totalAmount,
                note: `Fidyah untuk ${days} hari`,
                messagePlaceholder: "Sampaikan niat menunaikan Fidyah",
                paymentType: 'fidyah',
                campaign: targetCampaign,
                numberOfDays: days // Pass days for invoice details
            }
        });
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Helper to format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 1) return 'Hari ini';
        if (diffDays === 1) return 'Kemarin';

        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    if (loading) {
        return <FidyahSkeleton />;
    }

    return (
        <div className="fixed inset-0 bg-gray-100 flex justify-center">
            <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
                <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    <Header />

                    <div className="bg-white">
                        {/* Hero Image */}
                        <div className="w-full h-[220px] bg-gray-200">
                            {settings?.program_image ? (
                                <img
                                    src={settings.program_image}
                                    alt={settings.program_title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    No Image
                                </div>
                            )}
                        </div>

                        <div className="p-4 mb-2">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">{settings?.program_title}</h2>

                            {/* Stats */}
                            {targetCampaign && (targetCampaign.donor_count ?? 0) > 0 && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                                    <span className="font-bold text-gray-900">
                                        {targetCampaign.donor_count}
                                    </span>
                                    <span>hamba Allah telah menunaikan fidyah</span>
                                </div>
                            )}

                            {/* Fidyah Calculator */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">
                                        Masukan Nominal Fidyah <span className="text-red-500">*</span>
                                    </label>
                                    <div className="bg-gray-100 rounded-lg px-4 py-3 flex justify-between items-center">
                                        <span className="font-bold text-gray-500">Rp</span>
                                        <span className="font-bold text-xl text-gray-800">{totalAmount.toLocaleString('id-ID')}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 ml-1 text-right">
                                        Minimal transaksi {formatCurrency(10000)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex-1 text-sm text-gray-600">Jumlah Hari</div>
                                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                        <button
                                            onClick={handleDecrement}
                                            className="p-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200"
                                        >
                                            <Minus className="w-4 h-4 text-gray-600" />
                                        </button>
                                        <div className="w-12 text-center font-bold text-gray-800">
                                            {days}
                                        </div>
                                        <button
                                            onClick={handleIncrement}
                                            className="p-3 text-white hover:opacity-90 active:opacity-80"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Subtitle / Note */}
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-600 font-medium">Punya hutang puasa? Penting untuk tau ini</p>
                                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                                        {settings?.program_subtitle || "Tidak semua hutang puasa dapat kita ganti dengan membayar fidyah, sebab hany diperuntukkan bagi mereka yang tidak mampu."}
                                    </p>
                                </div>

                                {/* Description */}
                                {settings?.program_description && (
                                    <div className="mt-4">
                                        <div
                                            className={`text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none ${!showFullDescription ? 'line-clamp-3' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: settings.program_description }}
                                        />
                                        <button
                                            className="w-full mt-2 py-2 border rounded-full text-xs font-semibold flex items-center justify-center gap-1 hover:bg-opacity-5"
                                            style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
                                            onClick={() => setShowFullDescription(!showFullDescription)}
                                        >
                                            {showFullDescription ? 'Tutup Selengkapnya' : 'Baca Selengkapnya'}
                                            <ChevronUp className={`w-3 h-3 transition-transform ${showFullDescription ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Informasi Penggalangan Dana */}
                        <div className="p-4 mb-2">
                            <h3 className="font-bold text-gray-900 mb-3">Informasi Penggalangan Dana</h3>
                            <div className="border border-gray-200 rounded-xl p-4">
                                <p className="text-sm font-semibold text-gray-700 mb-3">Penggalang Dana</p>
                                <div className="flex items-center gap-3">
                                    {/* Logo */}
                                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {targetCampaign?.organization_logo ? (
                                            <img src={targetCampaign.organization_logo} alt="Org" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-pink-500 font-bold text-lg">
                                                {(targetCampaign?.organization_name || appName || 'D').charAt(0)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Name & Badge */}
                                    <div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-gray-900 text-sm">
                                                {targetCampaign?.organization_name || appName || 'Donasiku'}
                                            </span>
                                            {/* Verified Badge */}
                                            <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                                                <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z" fill="currentColor" />
                                                <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span className="text-[10px] font-bold text-blue-500 border border-blue-200 rounded px-1 ml-1">
                                                ORG
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                            <span>Identitas terverifikasi</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Divider Thick */}
                        <div className="h-2 bg-gray-50 w-full mt-6" />

                        {/* Info Terbaru Section */}
                        <div className="bg-white overflow-hidden">
                            <div className="px-5 py-5 border-b border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <Megaphone className="w-5 h-5 text-blue-600" />
                                        Kabar Terbaru
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {updates.length > 0 && (
                                            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full">{updates.length} Update</span>
                                        )}
                                    </div>
                                </div>

                                <div className="relative pl-2">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[7px] top-2 bottom-4 w-[2px] bg-gray-100"></div>

                                    {(updates.length === 0 || !targetCampaign) ? (
                                        <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100 border-dashed ml-6">
                                            <p className="text-gray-500 text-sm mb-2">Belum ada kabar terbaru dari penggalang dana.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {updates.slice(0, 3).map((update) => (
                                                <div key={update.id} className="relative pl-8">
                                                    {/* Dot Indicator */}
                                                    <div
                                                        className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10"
                                                        style={{ backgroundColor: primaryColor }}
                                                    ></div>

                                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-bold text-gray-900 text-sm">{update.title}</h4>
                                                            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-full whitespace-nowrap">
                                                                {getTimeAgo(update.created_at)}
                                                            </span>
                                                        </div>

                                                        {update.image_url && (
                                                            <div className="mb-3 rounded-lg overflow-hidden h-32 w-full">
                                                                <img src={update.image_url} alt="Update" className="w-full h-full object-cover" />
                                                            </div>
                                                        )}

                                                        <div
                                                            className={`text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none ${expandedUpdateId === update.id ? '' : 'line-clamp-3'}`}
                                                            dangerouslySetInnerHTML={{ __html: update.content }}
                                                        />

                                                        {update.content.length > 150 && (
                                                            <button
                                                                onClick={() => setExpandedUpdateId(expandedUpdateId === update.id ? null : update.id)}
                                                                className="text-xs font-semibold mt-2 flex items-center gap-1 hover:underline"
                                                                style={{ color: primaryColor }}
                                                            >
                                                                {expandedUpdateId === update.id ? (
                                                                    <>Sembunyikan <ChevronUp className="w-3 h-3" /></>
                                                                ) : (
                                                                    <>Lihat Selengkapnya <ChevronDown className="w-3 h-3" /></>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {updates.length > 3 && (
                                                <button className="w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors ml-4">
                                                    Lihat Semua Kabar ({updates.length})
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section: Pencairan Dana */}
                            <div className="px-5 py-5 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-gray-800">Pencairan Dana</h3>
                                        <p className="text-xs text-gray-500 mt-1">Transparansi penggunaan dana</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (targetCampaign?.slug) {
                                                navigate(`/campaign/${targetCampaign.slug}/withdrawals`);
                                            }
                                        }}
                                        className={`font-semibold text-sm px-3 py-1.5 rounded-lg border transition-colors ${!targetCampaign ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100'}`}
                                        style={targetCampaign ? { color: primaryColor, borderColor: `${primaryColor}20`, backgroundColor: `${primaryColor}10` } : {}}
                                        disabled={!targetCampaign}
                                    >
                                        Lihat Rincian
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Donatur */}
                        <div className="p-4 mb-2">
                            <h3 className="font-bold text-gray-900 mb-4">Donatur ({totalDonors})</h3>
                            <div className="space-y-4">
                                {donors.map(donor => (
                                    <div key={donor.id} className="flex gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                            <User className="w-5 h-5 text-orange-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">
                                                        {donor.is_anonymous ? 'Hamba Allah' : donor.donor_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {formatDate(donor.created_at)}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-bold text-gray-800">
                                                    {formatCurrency(donor.amount)}
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded italic">
                                                "{((donor as any).message || "Semoga berkah dan bermanfaat.")}"
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {donors.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">Belum ada donatur.</p>
                                )}
                            </div>

                            {totalDonors > 0 && (
                                <button
                                    onClick={() => navigate('/fidyah/donasi')}
                                    className="w-full font-semibold text-sm flex items-center justify-center gap-1 transition-colors py-2 mt-2"
                                    style={{ color: primaryColor }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                    Lihat Selengkapnya
                                    <ChevronUp className="w-4 h-4 rotate-90" />
                                </button>
                            )}
                        </div>

                        {/* Spacer for bottom bar */}
                        <div className="h-24"></div>
                    </div>
                </div>

                {/* Bottom Navigation Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
                        <button
                            onClick={() => navigate(-1)}
                            className="text-white p-2 rounded-full transition-colors"
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverColor}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="text-white p-2 rounded-full transition-colors"
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverColor}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <Share2 className="w-5 h-5" />
                        </button>

                        <button
                            onClick={handleDonate}
                            className="flex-1 ml-4 bg-white px-4 py-2 rounded-lg font-bold transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ color: primaryColor }}
                            onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!e.currentTarget.disabled) {
                                    e.currentTarget.style.backgroundColor = 'white';
                                }
                            }}
                        >
                            Tunaikan Sekarang
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div >

            {/* Share Modal */}
            < ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)
                }
                shareUrl={`${window.location.origin}/fidyah?utm_source=socialsharing_donor_web_fidyah&utm_medium=share_campaign_copas&utm_campaign=share_detail_campaign`}
                shareText="Mari tunaikan Fidyah anda sekarang."
            />
        </div >
    );
}
