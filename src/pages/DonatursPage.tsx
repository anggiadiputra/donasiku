import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, DollarSign, Calendar, Mail, Phone, Eye, Menu, Bell, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { useAppName } from '../hooks/useAppName';
import { TableSkeleton } from '../components/SkeletonLoader';
import { usePageTitle } from '../hooks/usePageTitle';

interface Donor {
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    total_donations: number;
    total_amount: number;
    first_donation: string;
    last_donation: string;
    campaigns_supported: number;
}

export default function DonatursPage() {
    usePageTitle('Data Donatur');
    const navigate = useNavigate();
    const { appName } = useAppName();
    const [donors, setDonors] = useState<Donor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    useEffect(() => {
        fetchDonors();
    }, []);

    const fetchDonors = async () => {
        try {
            setLoading(true);

            // Fetch all successful transactions
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('customer_name, customer_phone, customer_email, amount, created_at, campaign_id, status')
                .eq('status', 'success')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group by donor (phone or email)
            const donorMap = new Map<string, Donor>();

            transactions?.forEach((tx) => {
                const key = tx.customer_phone || tx.customer_email || 'unknown';

                if (donorMap.has(key)) {
                    const donor = donorMap.get(key)!;
                    donor.total_donations += 1;
                    donor.total_amount += tx.amount;

                    // Update last donation if newer
                    if (new Date(tx.created_at) > new Date(donor.last_donation)) {
                        donor.last_donation = tx.created_at;
                    }

                    // Update first donation if older
                    if (new Date(tx.created_at) < new Date(donor.first_donation)) {
                        donor.first_donation = tx.created_at;
                    }
                } else {
                    donorMap.set(key, {
                        customer_name: tx.customer_name || 'Hamba Allah',
                        customer_phone: tx.customer_phone || '-',
                        customer_email: tx.customer_email || '-',
                        total_donations: 1,
                        total_amount: tx.amount,
                        first_donation: tx.created_at,
                        last_donation: tx.created_at,
                        campaigns_supported: 0, // Will calculate below
                    });
                }
            });

            // Calculate unique campaigns per donor
            transactions?.forEach((tx) => {
                const key = tx.customer_phone || tx.customer_email || 'unknown';
                const donor = donorMap.get(key);
                if (donor) {
                    // Count unique campaign_ids
                    const donorTxs = transactions.filter(
                        t => (t.customer_phone || t.customer_email) === key
                    );
                    const uniqueCampaigns = new Set(donorTxs.map(t => t.campaign_id));
                    donor.campaigns_supported = uniqueCampaigns.size;
                }
            });

            const donorsList = Array.from(donorMap.values());
            setDonors(donorsList);
        } catch (error) {
            console.error('Error fetching donors:', error);
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
        const date = new Date(dateString);
        const day = date.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const filteredDonors = donors.filter((donor) =>
        donor.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donor.customer_phone?.includes(searchTerm) ||
        donor.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredDonors.length / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const currentDonors = filteredDonors.slice(startIndex, endIndex);

    // Calculate stats
    const totalDonors = donors.length;
    const totalDonations = donors.reduce((sum, d) => sum + d.total_donations, 0);
    const totalAmount = donors.reduce((sum, d) => sum + d.total_amount, 0);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed md:static inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } md:translate-x-0`}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            <div className="flex-1 flex flex-col min-w-0 md:ml-0 transition-all duration-300">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                {/* Title removed from here */}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                            <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Keluar</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    {/* Page Title (Moved from Header) */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">Data Donatur</h1>
                        <p className="text-sm text-gray-600">Kelola data donatur</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Donatur</p>
                                    <p className="text-2xl font-bold text-gray-800">{totalDonors}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Donasi</p>
                                    <p className="text-2xl font-bold text-gray-800">{totalDonations}x</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Nominal</p>
                                    <p className="text-xl font-bold text-gray-800">{formatCurrency(totalAmount)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        {/* Table Header */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Cari donatur..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">Show</span>
                                    <select
                                        value={entriesPerPage}
                                        onChange={(e) => {
                                            setEntriesPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                    <span className="text-sm text-gray-600">entries</span>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Donatur</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kontak</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Donasi</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Nominal</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Donatur Sejak</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading ? (
                                        <TableSkeleton rows={entriesPerPage} columns={7} />
                                    ) : currentDonors.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                                Belum ada data donatur
                                            </td>
                                        </tr>
                                    ) : (
                                        currentDonors.map((donor, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                                                            {donor.customer_name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{donor.customer_name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <div className="flex items-center gap-1 text-gray-900">
                                                            <Phone className="w-3 h-3" />
                                                            {donor.customer_phone}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-gray-600 mt-1">
                                                            <Mail className="w-3 h-3" />
                                                            {donor.customer_email}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                                                        {donor.total_donations}x
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-green-600">
                                                        {formatCurrency(donor.total_amount)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-semibold">
                                                        {donor.campaigns_supported} Campaign
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {formatDate(donor.first_donation)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => {
                                                            // Navigate to Ziswaf page with pre-filled search
                                                            const searchParam = donor.customer_phone !== '-'
                                                                ? `?phone=${encodeURIComponent(donor.customer_phone)}`
                                                                : `?email=${encodeURIComponent(donor.customer_email)}`;
                                                            window.open(`/ziswaf${searchParam}`, '_blank');
                                                        }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {!loading && filteredDonors.length > 0 && (
                            <div className="px-6 py-4 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Showing {startIndex + 1} to {Math.min(endIndex, filteredDonors.length)} of {filteredDonors.length} entries
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}
