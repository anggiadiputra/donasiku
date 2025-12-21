import { useState } from 'react';
import { Search, Mail, Phone, Calendar, DollarSign, Heart, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { darkenColor } from '../utils/colorUtils';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface Transaction {
    id: string;
    merchant_order_id: string;
    invoice_code: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    amount: number;
    status: string;
    created_at: string;
    campaign_id: string;
}

interface Campaign {
    id: string;
    title: string;
    slug: string;
}

export default function ZiswafPage() {
    const primaryColor = usePrimaryColor();
    const hoverColor = darkenColor(primaryColor, 20);

    const [searchType, setSearchType] = useState<'phone' | 'email'>('phone');
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [campaigns, setCampaigns] = useState<{ [key: string]: Campaign }>({});
    const [donorInfo, setDonorInfo] = useState<{
        name: string;
        totalDonations: number;
        totalAmount: number;
        firstDonation: string;
    } | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const handleSearch = async () => {
        if (!searchValue.trim()) {
            alert('Mohon masukkan nomor WhatsApp atau email');
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            // Build query based on search type
            let query = supabase
                .from('transactions')
                .select('*')
                .eq('status', 'success')
                .order('created_at', { ascending: false });

            if (searchType === 'phone') {
                query = query.eq('customer_phone', searchValue.trim());
            } else {
                query = query.eq('customer_email', searchValue.trim().toLowerCase());
            }

            const { data: txData, error: txError } = await query;

            if (txError) {
                console.error('Error fetching transactions:', txError);
                throw txError;
            }

            setTransactions(txData || []);

            // Fetch campaigns
            if (txData && txData.length > 0) {
                // Filter for valid UUIDs
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const campaignIds = [...new Set(
                    txData
                        .map(tx => tx.campaign_id)
                        .filter(id => id && uuidRegex.test(id))
                )];

                if (campaignIds.length > 0) {
                    const { data: campData } = await supabase
                        .from('campaigns')
                        .select('id, title, slug')
                        .in('id', campaignIds);

                    if (campData) {
                        const campMap: { [key: string]: Campaign } = {};
                        campData.forEach(camp => {
                            campMap[camp.id] = camp;
                        });
                        setCampaigns(campMap);
                    }

                    // Calculate donor info
                    const totalAmount = txData.reduce((sum, tx) => sum + tx.amount, 0);
                    const firstDonation = txData[txData.length - 1].created_at;
                    const donorName = txData[0].customer_name || 'Hamba Allah';

                    setDonorInfo({
                        name: donorName,
                        totalDonations: txData.length,
                        totalAmount: totalAmount,
                        firstDonation: firstDonation,
                    });
                } else {
                    setDonorInfo(null);
                    setCampaigns({});
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Terjadi kesalahan saat mencari data');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (_status: string) => {
        return (
            <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                LUNAS
            </span>
        );
    };

    return (
        <div className="fixed inset-0 bg-gray-100 flex justify-center">
            <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
                <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    <Header />

                    {/* Main Content */}
                    <div className="px-4 py-8">
                        {/* Hero Section */}
                        <div className="text-center mb-8">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ backgroundColor: `${primaryColor}20` }}
                            >
                                <Heart className="w-8 h-8" style={{ color: primaryColor }} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                Cek Riwayat Donasi Anda
                            </h2>
                            <p className="text-sm text-gray-600">
                                Lihat total donasi dan campaign yang telah Anda dukung
                            </p>
                        </div>

                        {/* Search Box */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Cari berdasarkan:
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setSearchType('phone')}
                                        className={`flex-1 py-3 px-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${searchType === 'phone'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Phone className="w-5 h-5" />
                                        <span className="text-xs font-medium">WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={() => setSearchType('email')}
                                        className={`flex-1 py-3 px-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${searchType === 'email'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Mail className="w-5 h-5" />
                                        <span className="text-xs font-medium">Email</span>
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                                    {searchType === 'phone' ? 'Nomor WhatsApp' : 'Alamat Email'}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        {searchType === 'phone' ? (
                                            <Phone className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                    <input
                                        type={searchType === 'phone' ? 'tel' : 'email'}
                                        id="search"
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        placeholder={
                                            searchType === 'phone' ? 'Contoh: 08123456789' : 'Contoh: email@example.com'
                                        }
                                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm"
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="w-full text-white py-3 rounded-lg font-semibold transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                                style={{
                                    backgroundColor: loading ? undefined : primaryColor,
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.backgroundColor = hoverColor;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.backgroundColor = primaryColor;
                                    }
                                }}
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Mencari...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-5 h-5" />
                                        Cari Riwayat Donasi
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Results */}
                        {searched && (
                            <>
                                {donorInfo ? (
                                    <>
                                        {/* Donor Stats */}
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div
                                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: `${primaryColor}20` }}
                                                >
                                                    <User className="w-6 h-6" style={{ color: primaryColor }} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800">{donorInfo.name}</h3>
                                                    <p className="text-xs text-gray-600">
                                                        Donatur sejak {formatDate(donorInfo.firstDonation)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Heart className="w-5 h-5 text-blue-600" />
                                                        <p className="text-sm text-blue-600 font-medium">Total Donasi</p>
                                                    </div>
                                                    <p className="text-2xl font-bold text-blue-900">
                                                        {donorInfo.totalDonations}x
                                                    </p>
                                                </div>

                                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <DollarSign className="w-5 h-5 text-green-600" />
                                                        <p className="text-sm text-green-600 font-medium">Total Nominal</p>
                                                    </div>
                                                    <p className="text-2xl font-bold text-green-900">
                                                        {formatCurrency(donorInfo.totalAmount)}
                                                    </p>
                                                </div>

                                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Calendar className="w-5 h-5 text-purple-600" />
                                                        <p className="text-sm text-purple-600 font-medium">Campaign Didukung</p>
                                                    </div>
                                                    <p className="text-2xl font-bold text-purple-900">
                                                        {Object.keys(campaigns).length}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transaction History */}
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                            <h3 className="text-lg font-bold text-gray-800 mb-6">Riwayat Donasi</h3>
                                            <div className="space-y-4">
                                                {transactions.map((tx) => (
                                                    <div
                                                        key={tx.id}
                                                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex-1">
                                                                <h4 className="font-semibold text-gray-900 mb-1 text-sm line-clamp-1">
                                                                    {campaigns[tx.campaign_id]?.title || 'Campaign'}
                                                                </h4>
                                                                <p className="text-xs text-gray-600">
                                                                    Invoice: {tx.invoice_code}
                                                                </p>
                                                            </div>
                                                            <div className="ml-2">
                                                                {getStatusBadge(tx.status)}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-lg font-bold" style={{ color: primaryColor }}>
                                                                    {formatCurrency(tx.amount)}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {formatDate(tx.created_at)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {campaigns[tx.campaign_id]?.slug && (
                                                            <div className="mt-2 text-right">
                                                                <a
                                                                    href={`/campaign/${campaigns[tx.campaign_id].slug}`}
                                                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                                                >
                                                                    Lihat Campaign →
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                                            Tidak Ada Data Ditemukan
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Belum ada riwayat donasi dengan {searchType === 'phone' ? 'nomor WhatsApp' : 'email'} yang Anda masukkan.
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Pastikan Anda memasukkan {searchType === 'phone' ? 'nomor' : 'email'} yang sama dengan yang digunakan saat berdonasi.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <Footer />
                </div>
            </div>
        </div>
    );
}
