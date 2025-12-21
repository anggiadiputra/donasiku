import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Share2,
    Minus,
    Plus,
    User,
    ChevronUp,
    X,
    Link
} from 'lucide-react';
import { supabase, FidyahSettings, Campaign, Donation } from '../lib/supabase';
import Header from '../components/Header';
import { useAppName } from '../hooks/useAppName';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { getHoverColor } from '../utils/colorUtils';
import { FidyahSkeleton } from '../components/SkeletonLoader';

export default function FidyahPage() {
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();
    const hoverColor = getHoverColor(primaryColor);
    const { appName } = useAppName();

    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<FidyahSettings | null>(null);
    const [targetCampaign, setTargetCampaign] = useState<Campaign | null>(null);
    const [donors, setDonors] = useState<Donation[]>([]);

    const [days, setDays] = useState(1);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

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
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDonors = async (campaignId?: string | null) => {
        try {
            let query = supabase
                .from('transactions')
                .select('*')
                .eq('status', 'success')
                .order('created_at', { ascending: false })
                .limit(5);

            if (campaignId) {
                query = query.eq('campaign_id', campaignId);
            } else {
                // Only fetch Fidyah transactions if no campaign specified
                query = query.ilike('product_details', '%Fidyah%');
            }

            const { data } = await query;

            if (data) {
                const mappedDonors = data.map(tx => ({
                    id: tx.id,
                    donor_name: tx.customer_name,
                    amount: tx.amount,
                    is_anonymous: tx.customer_name === 'Orang Baik',
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

                        {/* Info Terbaru */}
                        <div className="p-4 mb-2">
                            <h3 className="font-bold text-gray-900 mb-3">Info Terbaru</h3>
                            <p className="text-sm text-gray-500 italic">Belum ada kabar terbaru.</p>
                        </div>

                        {/* Donatur */}
                        <div className="p-4 mb-2">
                            <h3 className="font-bold text-gray-900 mb-4">Donatur ({targetCampaign?.donor_count || 0})</h3>
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

                            {donors.length > 0 && (
                                <button
                                    className="w-full mt-4 py-2 border rounded-full text-sm font-semibold hover:bg-gray-50"
                                    style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
                                >
                                    Lihat Semua
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
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowShareModal(false)}>
                    <div className="bg-white w-full max-w-sm sm:rounded-2xl rounded-t-2xl p-6 animate-slideUp sm:animate-none" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Bagikan lewat</h3>
                            <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-8">
                            {/* WhatsApp */}
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/fidyah?utm_source=socialsharing_donor_web_fidyah&utm_medium=share_campaign_copas&utm_campaign=share_detail_campaign`;
                                    const text = `Mari tunaikan Fidyah anda sekarang. ${url}`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-sm">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-gray-600 font-medium">WhatsApp</span>
                            </button>

                            {/* Facebook */}
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/fidyah?utm_source=socialsharing_donor_web_fidyah&utm_medium=share_campaign_copas&utm_campaign=share_detail_campaign`;
                                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                                }}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-12 h-12 bg-[#1877F2] rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-sm">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                        <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-gray-600 font-medium">Facebook</span>
                            </button>

                            {/* LINE */}
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/fidyah?utm_source=socialsharing_donor_web_fidyah&utm_medium=share_campaign_copas&utm_campaign=share_detail_campaign`;
                                    const text = `Mari tunaikan Fidyah anda sekarang.`;
                                    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-12 h-12 bg-[#00C300] rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-sm">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                        <path d="M21.2 9.6c0-4.6-4.6-8.4-10.2-8.4-5.6 0-10.2 3.8-10.2 8.4 0 4.1 3.6 7.6 8.5 8.3.3 0 .7.1.8.3.2.4.1 1-.1 1.6 0 0-.2.9 0 1.1.2.2.6.2.8.1.3 0 2.5-1.5 3.4-2.5 1.7-1.3 2.8-2.6 2.8-2.6 2.1-1.6 3.2-3.8 3.2-6.3zm-11.4 3c0 .2-.2.4-.4.4h-3.4c-.2 0-.4-.2-.4-.4v-5.6c0-.2.2-.4.4-.4h.8c.2 0 .4.2.4.4v4.4h2.2c.2 0 .4.2.4.4v.8zm3.2 0c0 .2-.2.4-.4.4h-.8c-.2 0-.4-.2-.4-.4v-5.6c0-.2.2-.4.4-.4h.8c.2 0 .4.2.4.4v5.6zm4.5 0c0 .2-.2.4-.4.4h-.8c-.1 0-.2-.1-.3-.2l-2.4-3.3v2.7c0 .2-.2.4-.4.4h-.8c-.2 0-.4-.2-.4-.4v-5.6c0-.2.2-.4.4-.4h.8c-.1 0-.2.1-.3.2l2.4 3.3v-2.7c0-.2.2-.4.4-.4h.8c.2 0 .4.2.4.4v5.6zm4.1-1.6c0 .2-.2.4-.4.4h-2.2c-.2 0-.4-.2-.4-.4v-.8c0-.2.2-.4.4-.4h2.2c.2 0 .4-.2.4-.4v-.8c0-.2-.2-.4-.4-.4h-2.2v-1h2.2c.2 0 .4-.2.4-.4v-.8c0-.2-.2-.4-.4-.4h-3.4c-.2 0-.4.2-.4.4v5.6c0 .2.2.4.4.4h3.4c.2 0 .4-.2.4-.4v-.8z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-gray-600 font-medium">LINE</span>
                            </button>

                            {/* Twitter */}
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/fidyah?utm_source=socialsharing_donor_web_fidyah&utm_medium=share_campaign_copas&utm_campaign=share_detail_campaign`;
                                    const text = `Mari tunaikan Fidyah anda sekarang.`;
                                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-12 h-12 bg-[#1DA1F2] rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-sm">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-gray-600 font-medium">Twitter</span>
                            </button>
                        </div>

                        {/* Copy Link Section */}
                        <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
                            <Link className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
                            <input
                                type="text"
                                readOnly
                                value={`${window.location.origin}/fidyah?utm_source=socialsharing_donor_web_fidyah...`}
                                className="flex-1 bg-transparent border-none text-xs text-gray-600 focus:ring-0 truncate"
                            />
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/fidyah?utm_source=socialsharing_donor_web_fidyah&utm_medium=share_campaign_copas&utm_campaign=share_detail_campaign`;
                                    navigator.clipboard.writeText(url);
                                    // Maybe show toast? For now native alert is safer or custom label change.
                                    alert('Link berhasil disalin!');
                                }}
                                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-md transition-colors"
                            >
                                Salin
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
