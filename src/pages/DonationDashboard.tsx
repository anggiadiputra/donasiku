import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Eye, Trash2, RefreshCw } from 'lucide-react';
import { DashboardSkeleton } from '../components/SkeletonLoader';
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
}

interface Campaign {
    id: string;
    title: string;
}

export default function DonationDashboard() {
    usePageTitle('Dashboard Donasi');
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [campaigns, setCampaigns] = useState<{ [key: string]: Campaign }>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [currentPage, entriesPerPage, searchTerm]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch transactions with pagination
            let query = supabase
                .from('transactions')
                .select('*', { count: 'exact' });

            if (searchTerm) {
                query = query.or(`customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%,invoice_code.ilike.%${searchTerm}%`);
            }

            const from = (currentPage - 1) * entriesPerPage;
            const to = from + entriesPerPage - 1;

            const { data: txData, count, error: txError } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (txError) throw txError;

            if (count !== null) setTotalCount(count);

            if (txData && txData.length > 0) {
                // Fetch only related campaigns
                // Filter for valid UUIDs to prevent 400 Bad Request
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const campaignIds = [...new Set(
                    txData
                        .map(tx => tx.campaign_id)
                        .filter(id => id && uuidRegex.test(id))
                )];

                if (campaignIds.length > 0) {
                    const { data: campData, error: campError } = await supabase
                        .from('campaigns')
                        .select('id, title')
                        .in('id', campaignIds);

                    if (campError) throw campError;

                    // Create campaigns map
                    const campaignsMap: { [key: string]: Campaign } = {};
                    campData?.forEach((camp) => {
                        campaignsMap[camp.id] = camp;
                    });
                    setCampaigns(campaignsMap);
                }
            }

            setTransactions(txData || []);
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
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    const getStatusBadge = (status: string) => {
        const statusMap: { [key: string]: { label: string; color: string } } = {
            pending: { label: 'Waiting', color: 'bg-red-500' },
            success: { label: 'Success', color: 'bg-green-500' },
            failed: { label: 'Failed', color: 'bg-gray-500' },
        };

        const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-500' };

        return (
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-xs font-semibold ${statusInfo.color}`}>
                <span className="w-2 h-2 bg-white rounded-full"></span>
                {statusInfo.label}
            </span>
        );
    };

    const totalPages = Math.ceil(totalCount / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = Math.min(startIndex + entriesPerPage, totalCount);
    const currentTransactions = transactions; // Data is already paginated form DB

    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Data Donasi</h1>
                    <p className="text-gray-600">Kelola dan pantau semua transaksi donasi</p>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Entries per page */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Show</span>
                            <select
                                value={entriesPerPage}
                                onChange={(e) => {
                                    setEntriesPerPage(Number(e.target.value));
                                    setCurrentPage(1); // Reset to first page
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm text-gray-600">entries</span>
                        </div>

                        {/* Search and Refresh */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1); // Reset to first page
                                    }}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                                />
                            </div>
                            <button
                                onClick={fetchData}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                title="Refresh data"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Showing info */}
                    <div className="mt-4 text-sm text-gray-600">
                        Showing {startIndex + 1} to {endIndex} of {totalCount} entries
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Donatur</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">WhatsApp</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Donasi</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Program</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">CS</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {currentTransactions.map((tx, index) => (
                                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 text-sm text-gray-900">{startIndex + index + 1}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                    <span className="text-gray-600 font-semibold text-sm">
                                                        {tx.customer_name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{tx.customer_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">{tx.customer_phone}</td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm">
                                                <div className="font-semibold text-gray-900">{formatCurrency(tx.amount)}</div>
                                                <div className="text-xs text-gray-500">{tx.invoice_code}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {campaigns[tx.campaign_id]?.title || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">-</td>
                                        <td className="px-4 py-4">{getStatusBadge(tx.status)}</td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm">
                                                <div className="text-gray-900">{formatDate(tx.created_at)}</div>
                                                <div className="text-xs text-gray-500">
                                                    {Math.floor((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60 * 60))} jam yang lalu
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/invoice/${tx.invoice_code}`)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>

                        <div className="flex items-center gap-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg ${currentPage === pageNum
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && <span className="text-gray-500">...</span>}
                        </div>

                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
