import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Target, DollarSign, Calendar, Eye, ExternalLink, Menu, Bell, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { useAppName } from '../hooks/useAppName';
import { TableSkeleton } from '../components/SkeletonLoader';

interface Campaigner {
    user_id: string;
    user_email: string;
    organization_name: string;
    total_campaigns: number;
    active_campaigns: number;
    total_raised: number;
    total_target: number;
    total_donors: number;
    first_campaign: string;
    last_campaign: string;
}

export default function CampaignersPage() {
    const navigate = useNavigate();
    const { appName } = useAppName();
    const [campaigners, setCampaigners] = useState<Campaigner[]>([]);
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
        fetchCampaigners();
    }, []);

    const fetchCampaigners = async () => {
        try {
            setLoading(true);

            // Fetch all campaigns with user info
            const { data: campaigns, error: campError } = await supabase
                .from('campaigns')
                .select('id, user_id, organization_name, target_amount, current_amount, status, created_at')
                .order('created_at', { ascending: false });

            if (campError) throw campError;

            // Fetch profiles to get emails
            const userIds = [...new Set(campaigns?.map(c => c.user_id).filter(Boolean))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, email')
                .in('id', userIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

            // Fetch transactions to count donors
            const { data: transactions } = await supabase
                .from('transactions')
                .select('campaign_id, customer_phone, customer_email, status')
                .eq('status', 'success');

            // Group by campaigner (user_id)
            const campaignerMap = new Map<string, Campaigner>();

            campaigns?.forEach((camp) => {
                const userId = camp.user_id || 'unknown';
                const profile = profileMap.get(userId);

                if (campaignerMap.has(userId)) {
                    const campaigner = campaignerMap.get(userId)!;
                    campaigner.total_campaigns += 1;
                    if (camp.status === 'published') {
                        campaigner.active_campaigns += 1;
                    }
                    campaigner.total_raised += camp.current_amount || 0;
                    campaigner.total_target += camp.target_amount || 0;

                    // Update last campaign if newer
                    if (new Date(camp.created_at) > new Date(campaigner.last_campaign)) {
                        campaigner.last_campaign = camp.created_at;
                    }

                    // Update first campaign if older
                    if (new Date(camp.created_at) < new Date(campaigner.first_campaign)) {
                        campaigner.first_campaign = camp.created_at;
                    }
                } else {
                    campaignerMap.set(userId, {
                        user_id: userId,
                        user_email: profile?.email || '-',
                        organization_name: camp.organization_name || 'Unknown Organization',
                        total_campaigns: 1,
                        active_campaigns: camp.status === 'published' ? 1 : 0,
                        total_raised: camp.current_amount || 0,
                        total_target: camp.target_amount || 0,
                        total_donors: 0, // Will calculate below
                        first_campaign: camp.created_at,
                        last_campaign: camp.created_at,
                    });
                }
            });

            // Calculate unique donors per campaigner
            campaigns?.forEach((camp) => {
                const userId = camp.user_id || 'unknown';
                const campaigner = campaignerMap.get(userId);
                if (campaigner) {
                    // Get all transactions for this campaigner's campaigns
                    const campaignerCampaigns = campaigns.filter(c => c.user_id === userId);
                    const campaignIds = campaignerCampaigns.map(c => c.id);
                    const campaignerTxs = transactions?.filter(tx =>
                        campaignIds.includes(tx.campaign_id)
                    ) || [];

                    // Count unique donors
                    const uniqueDonors = new Set(
                        campaignerTxs.map(tx => tx.customer_phone || tx.customer_email)
                    );
                    campaigner.total_donors = uniqueDonors.size;
                }
            });

            const campaignersList = Array.from(campaignerMap.values());
            setCampaigners(campaignersList);
        } catch (error) {
            console.error('Error fetching campaigners:', error);
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

    const calculateProgress = (raised: number, target: number) => {
        if (target === 0) return 0;
        return Math.min(100, Math.round((raised / target) * 100));
    };

    const filteredCampaigners = campaigners.filter((campaigner) =>
        campaigner.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaigner.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredCampaigners.length / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const currentCampaigners = filteredCampaigners.slice(startIndex, endIndex);

    // Calculate stats
    const totalCampaigners = campaigners.length;
    const totalCampaigns = campaigners.reduce((sum, c) => sum + c.total_campaigns, 0);
    const totalRaised = campaigners.reduce((sum, c) => sum + c.total_raised, 0);

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
                                <h1 className="text-2xl font-bold text-gray-800">Data Campaigner</h1>
                                <p className="text-sm text-gray-600">Kelola data pembuat campaign</p>
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

                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Campaigner</p>
                                    <p className="text-2xl font-bold text-gray-800">{totalCampaigners}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Target className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Campaign</p>
                                    <p className="text-2xl font-bold text-gray-800">{totalCampaigns}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Terkumpul</p>
                                    <p className="text-xl font-bold text-gray-800">{formatCurrency(totalRaised)}</p>
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
                                            placeholder="Cari campaigner..."
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
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaigner</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Donatur</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dana Terkumpul</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bergabung</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading ? (
                                        <TableSkeleton rows={entriesPerPage} columns={7} />
                                    ) : currentCampaigners.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                                Belum ada data campaigner
                                            </td>
                                        </tr>
                                    ) : (
                                        currentCampaigners.map((campaigner, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-sm font-bold text-purple-600">
                                                            {campaigner.organization_name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{campaigner.organization_name}</div>
                                                            <div className="text-xs text-gray-600">{campaigner.user_email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <div className="font-semibold text-gray-900">
                                                            {campaigner.total_campaigns} Campaign
                                                        </div>
                                                        <div className="text-xs text-green-600">
                                                            {campaigner.active_campaigns} Aktif
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                                                        {campaigner.total_donors}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <div className="font-semibold text-green-600">
                                                            {formatCurrency(campaigner.total_raised)}
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            dari {formatCurrency(campaigner.total_target)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="w-full">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-semibold text-gray-700">
                                                                {calculateProgress(campaigner.total_raised, campaigner.total_target)}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-green-500 h-2 rounded-full transition-all"
                                                                style={{
                                                                    width: `${calculateProgress(campaigner.total_raised, campaigner.total_target)}%`,
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {formatDate(campaigner.first_campaign)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => navigate('/donasi/campaigns')}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Lihat Campaigns"
                                                        >
                                                            <Eye className="w-4 h-4" />
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
                        {!loading && filteredCampaigners.length > 0 && (
                            <div className="px-6 py-4 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Showing {startIndex + 1} to {Math.min(endIndex, filteredCampaigners.length)} of {filteredCampaigners.length} entries
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
