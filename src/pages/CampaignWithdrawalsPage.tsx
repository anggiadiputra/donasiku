import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Info, Loader2, Calendar, CreditCard, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';

// Utility for formatting currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// Utility for formatting date relative
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

export default function CampaignWithdrawalsPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();

    const [loading, setLoading] = useState(true);
    const [campaign, setCampaign] = useState<any>(null);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);

    // Stats for Modal
    const [stats, setStats] = useState({
        totalDonations: 0,
        totalDonors: 0,
        totalCollected: 0, // Gross
        totalWithdrawn: 0,
        totalBankFee: 0,
        totalPlatformFee: 0
    });

    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (slug) {
            fetchData();
        }
    }, [slug]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Get Campaign with Fee Settings
            const { data: campaignData, error: campaignError } = await supabase
                .from('campaigns')
                .select(`
                    id, title, target_amount, image_url, category,
                    organization_name, organization_logo,
                    organizations (id, platform_fee, zakat_fee),
                    profiles:user_id (id, platform_fee)
                `)
                .eq('slug', slug)
                .single();

            if (campaignError || !campaignData) throw new Error('Campaign not found');
            setCampaign(campaignData);

            // 2. Get Withdrawals
            const { data: withdrawalsData, error: withdrawalsError } = await supabase
                .from('withdrawals')
                .select('*')
                .eq('campaign_id', campaignData.id)
                .in('status', ['approved', 'completed']) // Only show approved/completed
                .order('created_at', { ascending: false });

            if (withdrawalsError) throw withdrawalsError;
            setWithdrawals(withdrawalsData || []);

            // 3. Get Transaction Stats (For Modal)
            const { data: transactionsData, error: transError } = await supabase
                .from('transactions')
                .select('id, amount, customer_email')
                .eq('campaign_id', campaignData.id)
                .eq('status', 'success');

            if (transError) throw transError;

            // Calculate Stats
            const totalCollected = transactionsData?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
            const totalDonations = transactionsData?.length || 0;
            const uniqueDonors = new Set(transactionsData?.map(t => t.customer_email)).size;

            const totalWithdrawn = withdrawalsData?.reduce((sum, w) => sum + (Number(w.amount) || 0), 0) || 0;
            const totalBankFee = withdrawalsData?.reduce((sum, w) => sum + (Number(w.bank_fee) || 0), 0) || 0;

            // --- Fee Estimation Logic ---
            let feePercentage = 0;
            const category = campaignData.category?.toLowerCase() || '';
            const isZakat = category.includes('zakat') || category.includes('fidyah');

            // Check if Org or Independent
            if (campaignData.organizations) {
                // Organization Campaign
                if (isZakat) {
                    feePercentage = campaignData.organizations.zakat_fee ?? 12.5;
                } else {
                    feePercentage = campaignData.organizations.platform_fee ?? 5;
                }
            } else {
                // Independent Campaigner
                // Independent usually doesn't do Zakat officially in this systemcontext, but if so, fallback to platform fee or default
                // For now, assume independent uses platform fee from profile or default 5%
                const profileFee = (campaignData.profiles as any)?.platform_fee;
                feePercentage = profileFee ?? 5;
            }

            // Calculate Estimated Platform/Option Fee on Total Collected
            const totalPlatformFee = Math.round(totalCollected * (feePercentage / 100));

            setStats({
                totalDonations,
                totalDonors: uniqueDonors,
                totalCollected,
                totalWithdrawn,
                totalBankFee, // Actual bank fees from withdrawals
                totalPlatformFee // Estimated fee based on total collected
            });

        } catch (error) {
            console.error('Error fetching withdrawal data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Derived Calculations
    const totalFees = stats.totalBankFee + stats.totalPlatformFee;
    const netDistributable = stats.totalCollected - totalFees; // Dana dapat dicairkan
    const hiddenBalance = netDistributable - stats.totalWithdrawn; // Belum dicairkan

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
            {/* Header - Glassmorphic */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="ml-3 flex-1">
                    <h1 className="font-bold text-lg text-gray-900 leading-tight">Riwayat Pencairan</h1>
                    <p className="text-xs text-gray-500 truncate max-w-[250px]">{campaign?.title}</p>
                </div>
            </div>

            <div className="p-5 max-w-lg mx-auto w-full space-y-8">
                {/* Stats Card - Gradient */}
                <div
                    className="rounded-2xl shadow-lg p-5 text-white relative overflow-hidden"
                    style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor})`,
                    }}
                >
                    {/* Gradient Overlay for Texture */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-black/5 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-blue-100 text-xs font-medium mb-1 uppercase tracking-wider">Total Dicairkan</p>
                                <p className="text-2xl font-bold">{formatCurrency(stats.totalWithdrawn)}</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-blue-100">Frekuensi</p>
                                <p className="font-bold text-sm">{withdrawals.length}x Pencairan</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5"
                            >
                                <Info className="w-3.5 h-3.5" />
                                Rincian Dana
                            </button>
                        </div>
                    </div>
                </div>

                {/* Withdrawals List - Vertical Timeline */}
                <div>
                    <h2 className="text-sm font-bold text-gray-900 mb-4 px-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        Aktivitas Pencairan
                    </h2>

                    <div className="relative pl-2">
                        {/* Vertical Line */}
                        {withdrawals.length > 0 && (
                            <div className="absolute left-[19px] top-2 bottom-4 w-[2px] bg-indigo-50/50"></div>
                        )}

                        <div className="space-y-8">
                            {withdrawals.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <CreditCard className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium">Belum ada riwayat pencairan dana.</p>
                                </div>
                            ) : (
                                withdrawals.map((w, index) => (
                                    <div key={w.id} className="relative pl-10 animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                                        {/* Dot Indicator */}
                                        <div
                                            className="absolute left-[14px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10"
                                            style={{ backgroundColor: primaryColor }}
                                        ></div>

                                        {/* Card content */}
                                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                                                        {new Date(w.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase tracking-wide">
                                                    Berhasil
                                                </span>
                                            </div>

                                            <p className="text-lg font-bold text-gray-900 mb-1">
                                                {formatCurrency(w.amount)}
                                            </p>

                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-50">
                                                <Building2 className="w-3 h-3" />
                                                <span>{w.bank_info?.bank_name} - {w.bank_info?.account_number?.slice(-4).padStart(w.bank_info?.account_number?.length, '*')}</span>
                                            </div>

                                            <div className="bg-blue-50/50 rounded-lg p-3">
                                                <p className="text-[10px] text-blue-600 font-bold uppercase mb-1 tracking-wide">Penggunaan Dana</p>
                                                <p className="text-xs text-gray-700 leading-relaxed">
                                                    {w.description || w.admin_note || "Dana dicairkan untuk keperluan operasional program."}
                                                </p>
                                            </div>

                                            <p className="text-[10px] text-gray-400 mt-2 text-right">
                                                {getTimeAgo(w.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Info Penggunaan Dana */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="bg-white p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                            <h3 className="font-bold text-gray-900 text-lg">Informasi Penggunaan Dana</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-5 space-y-6">
                            {/* Blue Summary Box */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 grid grid-cols-2 gap-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Info className="w-24 h-24 text-blue-600" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-xs text-blue-600 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Sudah dicairkan
                                    </p>
                                    <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(stats.totalWithdrawn)}</p>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-xs text-gray-500 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                                        <span className="w-2 h-2 rounded-full bg-gray-400"></span> Sisa Dana
                                    </p>
                                    <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(hiddenBalance < 0 ? 0 : hiddenBalance)}</p>
                                </div>
                                <div className="col-span-2 pt-3 border-t border-blue-200/50">
                                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <Info className="w-3 h-3" /> Data diperbarui: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            {/* Stats List */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Ringkasan Donasi</h4>

                                <div className="flex justify-between text-sm py-1">
                                    <span className="text-gray-500">Total Transaksi</span>
                                    <span className="font-semibold text-gray-900">{stats.totalDonations} kali</span>
                                </div>
                                <div className="flex justify-between text-sm py-1">
                                    <span className="text-gray-500">Total Donatur</span>
                                    <span className="font-semibold text-gray-900">{stats.totalDonors} orang</span>
                                </div>
                                <div className="flex justify-between text-sm py-1">
                                    <span className="text-gray-500">Total Terkumpul</span>
                                    <span className="font-bold text-gray-900 text-green-600">{formatCurrency(stats.totalCollected)}</span>
                                </div>
                            </div>

                            {/* Waterfall Calculation */}
                            <div className="space-y-4 pt-2">
                                <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Rincian Bersih</h4>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-start">
                                        <span className="text-gray-500 max-w-[200px] leading-tight">Biaya Transaksi & Teknologi (Bank/PG)</span>
                                        <span className="font-medium text-red-500">- {formatCurrency(stats.totalBankFee)}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-gray-500 max-w-[200px] leading-tight">Operasional & Pengembangan Platform</span>
                                        <span className="font-medium text-red-500">- {formatCurrency(stats.totalPlatformFee)}</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center mt-2 border border-gray-100">
                                    <span className="text-sm font-bold text-gray-700">Dana Bersih (Net)</span>
                                    <span className="text-lg font-bold text-blue-600">{formatCurrency(netDistributable)}</span>
                                </div>
                            </div>

                            {/* Footnotes */}
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 space-y-2">
                                <p className="text-[10px] text-yellow-800 leading-relaxed">
                                    <span className="font-bold">Catatan:</span> Dana bersih adalah jumlah yang siap disalurkan atau dicairkan oleh penggalang dana setelah dikurangi biaya operasional dan biaya transaksi pihak ketiga untuk menjaga keberlangsungan platform.
                                </p>
                            </div>
                        </div>

                        {/* Footer Button */}
                        <div className="p-5 border-t border-gray-100 bg-white sticky bottom-0 z-10">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-full py-3.5 text-white font-bold rounded-xl active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Tutup Informasi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
