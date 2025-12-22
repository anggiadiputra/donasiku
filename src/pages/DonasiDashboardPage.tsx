import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, Heart, Search, Eye, Trash2, Bell, LogOut, Menu, MessageCircle, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { useAppName } from '../hooks/useAppName';
import { TableSkeleton } from '../components/SkeletonLoader';
import ReceiptModal from '../components/ReceiptModal';
import { usePageTitle } from '../hooks/usePageTitle';

interface Transaction {
    id: string;
    merchant_order_id: string;
    invoice_code: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    customer_message: string;
    amount: number;
    payment_method: string;
    status: string;
    campaign_id: string;
    created_at: string;
    va_number: string;
    duitku_reference: string;
    payment_url: string;
    product_details?: string;
}

interface Campaign {
    id: string;
    title: string;
    slug?: string;
    target_amount: number;
    current_amount: number;
}

export default function DonasiDashboardPage() {
    usePageTitle('Dashboard Donasi');
    const navigate = useNavigate();
    const { appName } = useAppName();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [campaigns, setCampaigns] = useState<{ [key: string]: Campaign }>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [whatsappTemplate, setWhatsappTemplate] = useState('');

    // Receipt Modal
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    // Stats
    const [stats, setStats] = useState({
        totalDonations: 0,
        activePrograms: 0,
        totalDonors: 0,
        targetNotReached: 0,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const appInitial = appName.charAt(0).toUpperCase();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
            navigate('/login');
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch transactions
            const { data: txData, error: txError } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false });

            if (txError) {
                console.error('❌ Error fetching transactions:', txError);
            }

            // Fetch campaigns
            const { data: campData, error: campError } = await supabase
                .from('campaigns')
                .select('id, title, slug, target_amount, current_amount');

            if (campError) {
                console.error('❌ Error fetching campaigns:', campError);
            }

            // Fetch settings for WA template
            const { data: settingsData } = await supabase
                .from('app_settings')
                .select('whatsapp_template')
                .limit(1)
                .single();

            if (settingsData && settingsData.whatsapp_template) {
                setWhatsappTemplate(settingsData.whatsapp_template);
            }

            // Create campaigns map
            const campaignsMap: { [key: string]: Campaign } = {};
            campData?.forEach((camp) => {
                campaignsMap[camp.id] = camp;
            });

            // Calculate stats
            const successTx = txData?.filter(tx => tx.status === 'success') || [];
            const totalAmount = successTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);
            const uniqueDonors = new Set(successTx.map(tx => tx.customer_phone)).size;
            const activePrograms = campData?.length || 0;
            const notReachedSum = campData?.reduce((sum, c) => {
                return sum + ((c.current_amount || 0) < (c.target_amount || 0) ? 1 : 0);
            }, 0) || 0;

            setTransactions(txData || []);
            setCampaigns(campaignsMap);
            setStats({
                totalDonations: totalAmount,
                activePrograms: activePrograms,
                totalDonors: uniqueDonors,
                targetNotReached: notReachedSum,
            });

        } catch (error) {
            console.error('Error fetching data:', error);
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

    const handleFollowUp = (tx: Transaction) => {
        let message = whatsappTemplate || 'Halo Kak {name}, terima kasih telah berniat berdonasi untuk {campaign} sebesar {amount}. Mohon selesaikan pembayaran melalui tautan berikut: {link}';

        // Replace placeholders
        message = message
            .replace(/{name}/g, tx.customer_name || 'Kak')
            .replace(/{amount}/g, formatCurrency(tx.amount))
            .replace(/{campaign}/g, campaigns[tx.campaign_id]?.title || 'Campaign')
            .replace(/{link}/g, tx.payment_url || `https://donasiku.com/invoice/${tx.invoice_code}`);

        // Format phone number (change 08 to 628)
        let phone = tx.customer_phone || '';
        phone = phone.replace(/\D/g, ''); // Remove non-limit digits
        if (phone.startsWith('0')) {
            phone = '62' + phone.substring(1);
        }

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Baru saja';
        if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} menit lalu`;
        }
        if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} jam lalu`;
        }
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} hari lalu`;
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            success: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            failed: 'bg-red-100 text-red-800',
        };
        const labels: Record<string, string> = {
            success: 'BERHASIL',
            pending: 'PENDING',
            failed: 'GAGAL',
        };
        const key = status?.toLowerCase() || 'pending';
        return <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[key] || 'bg-gray-100'}`}>{labels[key] || status}</span>;
    };

    const filteredTransactions = transactions.filter((tx) =>
        tx.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.customer_phone?.includes(searchTerm) ||
        tx.invoice_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed md:static inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-200 ease-in-out md:transform-none
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main Content */}
            <div className="flex-1 md:ml-0 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-30 flex-shrink-0">
                    <div className="px-4 md:px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    className="p-2 -ml-2 hover:bg-gray-100 rounded-lg md:hidden"
                                >
                                    <Menu className="w-6 h-6 text-gray-600" />
                                </button>
                                <div className="flex items-center gap-3 md:hidden">
                                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">{appInitial}</span>
                                    </div>
                                    <h1 className="text-lg font-bold text-gray-800">{appName}</h1>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <Bell className="w-5 h-5 text-gray-600" />
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <LogOut className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6 lg:p-8">
                    <div className="w-full">
                        {/* Stats Section */}
                        <div className="mb-6">
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">Dashboard Donasi</h2>
                            <p className="text-gray-600">Kelola donasi dan program Anda</p>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                                        <Heart className="w-5 h-5 text-pink-600" />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">Total Donasi</p>
                                <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalDonations)}</p>
                            </div>

                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">Program Aktif</p>
                                <p className="text-xl font-bold text-gray-800">{stats.activePrograms}</p>
                            </div>

                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">Total Donatur</p>
                                <p className="text-xl font-bold text-gray-800">{stats.totalDonors}</p>
                            </div>

                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-orange-600" />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">Perlu didorong</p>
                                <p className="text-xl font-bold text-gray-800">{stats.targetNotReached}</p>
                            </div>
                        </div>

                        {/* Recent Donations Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <h3 className="text-lg font-bold text-gray-800">Donasi Terbaru</h3>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:flex-initial">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Cari donatur..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full sm:w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                    <select
                                        value={entriesPerPage}
                                        onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Donatur</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jumlah</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Program</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Follow Up</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {loading ? (
                                            <TableSkeleton rows={entriesPerPage} columns={7} />
                                        ) : currentTransactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                                    Belum ada data donasi
                                                </td>
                                            </tr>
                                        ) : (
                                            currentTransactions.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                                                {tx.customer_name?.charAt(0).toUpperCase() || '?'}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900">{tx.customer_name || 'Hamba Allah'}</div>
                                                                <div className="text-xs text-gray-500">{tx.invoice_code}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-semibold text-gray-900">{formatCurrency(tx.amount)}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {campaigns[tx.campaign_id] ? (
                                                            <button
                                                                onClick={() => navigate(`/campaign/${campaigns[tx.campaign_id].slug}`)}
                                                                className="max-w-xs truncate text-left text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                                title={campaigns[tx.campaign_id]?.title}
                                                            >
                                                                {campaigns[tx.campaign_id]?.title}
                                                            </button>
                                                        ) : tx.product_details ? (
                                                            <div className="max-w-xs truncate text-gray-900 font-medium" title={tx.product_details}>
                                                                {tx.product_details}
                                                            </div>
                                                        ) : (
                                                            <div className="max-w-xs truncate text-gray-400">-</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                        {tx.status === 'pending' ? (
                                                            <button
                                                                onClick={() => handleFollowUp(tx)}
                                                                className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors border border-green-200 shadow-sm"
                                                                title="Follow up via WhatsApp"
                                                            >
                                                                <MessageCircle className="w-3.5 h-3.5" />
                                                                <span className="text-xs font-medium">Follow Up</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs flex items-center gap-1">
                                                                {tx.payment_method || '-'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(tx.status)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm">
                                                            <div className="text-gray-900 font-medium">{formatDate(tx.created_at)}</div>
                                                            <div className="text-xs text-gray-600">Pukul {formatTime(tx.created_at)}</div>
                                                            <div className="text-xs text-gray-500">{getRelativeTime(tx.created_at)}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    if (tx.payment_url) {
                                                                        window.open(tx.payment_url, '_blank');
                                                                    } else {
                                                                        alert('Payment URL tidak tersedia');
                                                                    }
                                                                }}
                                                                className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors flex items-center gap-1"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                Invoice
                                                            </button>
                                                            {tx.status === 'success' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedTransaction(tx);
                                                                        setShowReceiptModal(true);
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-600 rounded hover:bg-green-50 transition-colors flex items-center gap-1"
                                                                    title="Print Kwitansi"
                                                                >
                                                                    <Printer className="w-3 h-3" />
                                                                    Kwitansi
                                                                </button>
                                                            )}
                                                            <button
                                                                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {!loading && filteredTransactions.length > 0 && (
                                <div className="px-6 py-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-500">
                                            Showing {Math.min(startIndex + 1, filteredTransactions.length)} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} results
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(Math.min(Math.ceil(filteredTransactions.length / entriesPerPage), currentPage + 1))}
                                                disabled={currentPage >= Math.ceil(filteredTransactions.length / entriesPerPage)}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipt Modal */}
            {selectedTransaction && (
                <ReceiptModal
                    isOpen={showReceiptModal}
                    onClose={() => {
                        setShowReceiptModal(false);
                        setSelectedTransaction(null);
                    }}
                    transaction={selectedTransaction}
                    campaign={campaigns[selectedTransaction.campaign_id] || { id: '', title: 'Unknown Campaign' }}
                />
            )}
        </div>
    );
}
