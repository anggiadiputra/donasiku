import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Menu, Bell, LogOut, Users, Target, DollarSign, Edit2, Eye, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { useOrganization } from '../context/OrganizationContext';
// import { useAppName } from '../hooks/useAppName';
import { TableSkeleton } from '../components/SkeletonLoader';
import { usePageTitle } from '../hooks/usePageTitle';
import VerifiedBadge from '../components/VerifiedBadge';

interface Campaigner {
    user_id: string;
    user_email: string;
    organization_name: string;
    phone_number?: string;
    verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
    bio?: string;
    total_campaigns: number;
    active_campaigns: number;
    total_raised: number;
    total_target: number;
    total_donors: number;
    first_campaign: string;
    last_campaign: string;
    organization_id?: string;
    org_verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
    role?: string;
}

export default function CampaignersPage() {
    const navigate = useNavigate();
    const { selectedOrganization, refreshOrganizations } = useOrganization();
    // const { appName } = useAppName();
    const [campaigners, setCampaigners] = useState<Campaigner[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCampaigner, setEditingCampaigner] = useState<Campaigner | null>(null);
    const [editForm, setEditForm] = useState({
        organization_name: '',
        phone_number: '',
        verification_status: 'unverified' as any,
        org_verification_status: 'unverified' as any
    });
    const [saving, setSaving] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    useEffect(() => {
        fetchCampaigners();
    }, [selectedOrganization]); // Re-fetch when context changes

    // Set page title
    usePageTitle('Data Campaigner');

    const fetchCampaigners = async () => {
        try {
            setLoading(true);

            if (selectedOrganization) {
                // Fetch ALL members of the organization
                const { data: members, error: memberError } = await supabase
                    .from('organization_members')
                    .select('user_id, role, created_at, profiles:user_id(id, email, phone, organization_name, verification_status, role, bio), organizations(id, verification_status)')
                    .eq('organization_id', selectedOrganization.id);

                if (memberError) throw memberError;

                // Fetch all campaigns for this organization
                const { data: campaigns, error: campError } = await supabase
                    .from('campaigns')
                    .select('id, user_id, target_amount, current_amount, status, created_at')
                    .eq('organization_id', selectedOrganization.id);

                if (campError) throw campError;

                // Fetch transactions for these campaigns
                const campaignIds = campaigns?.map(c => c.id) || [];
                const { data: transactions } = await supabase
                    .from('transactions')
                    .select('campaign_id, customer_name, customer_phone, customer_email, status')
                    .eq('status', 'success')
                    .in('campaign_id', campaignIds);

                const campaignerMap = new Map<string, Campaigner>();

                members?.forEach((m: any) => {
                    const profile = m.profiles;
                    const userId = m.user_id;

                    const userCampaigns = campaigns?.filter(c => c.user_id === userId) || [];
                    const totalRaised = userCampaigns.reduce((sum, c) => sum + (c.current_amount || 0), 0);
                    const totalTarget = userCampaigns.reduce((sum, c) => sum + (c.target_amount || 0), 0);

                    const campaignerTxs = transactions?.filter(tx =>
                        userCampaigns.some(c => c.id === tx.campaign_id)
                    ) || [];
                    const uniqueDonors = new Set(campaignerTxs.map(tx => tx.customer_phone || tx.customer_email).filter(Boolean)).size;

                    campaignerMap.set(userId, {
                        user_id: userId,
                        user_email: profile?.email || '-',
                        organization_name: profile?.organization_name || selectedOrganization.name,
                        phone_number: profile?.phone || '',
                        verification_status: profile?.verification_status || 'unverified',
                        bio: profile?.bio || '',
                        total_campaigns: userCampaigns.length,
                        active_campaigns: userCampaigns.filter(c => c.status === 'published').length,
                        total_raised: totalRaised,
                        total_target: totalTarget,
                        total_donors: uniqueDonors,
                        first_campaign: userCampaigns.length > 0
                            ? userCampaigns.reduce((min, c) => new Date(c.created_at) < new Date(min) ? c.created_at : min, userCampaigns[0].created_at)
                            : (m.created_at || new Date().toISOString()),
                        last_campaign: userCampaigns.length > 0
                            ? userCampaigns.reduce((max, c) => new Date(c.created_at) > new Date(max) ? c.created_at : max, userCampaigns[0].created_at)
                            : (m.created_at || new Date().toISOString()),
                        organization_id: m.organizations?.id,
                        org_verification_status: m.organizations?.verification_status || 'unverified',
                        role: profile?.role
                    });
                });

                setCampaigners(Array.from(campaignerMap.values()));
            } else {
                // Global view (Global Admin) - Fetch from SQL View for performance
                const { data, error } = await supabase
                    .from('campaigner_stats_view')
                    .select('*')
                    .order('total_raised', { ascending: false });

                if (error) throw error;

                const mappedCampaigners: Campaigner[] = data.map((d: any) => ({
                    user_id: d.user_id,
                    user_email: d.email,
                    organization_name: d.organization_name,
                    phone_number: d.phone_number,
                    verification_status: d.verification_status,
                    bio: d.bio,
                    total_campaigns: d.total_campaigns,
                    active_campaigns: d.active_campaigns,
                    total_raised: d.total_raised,
                    total_target: d.total_target,
                    total_donors: d.total_donors,
                    first_campaign: d.first_campaign_date || d.joined_at || new Date().toISOString(),
                    last_campaign: d.last_campaign_date || d.joined_at || new Date().toISOString(),
                    organization_id: d.organization_id,
                    org_verification_status: d.org_verification_status,
                    role: d.role
                }));

                setCampaigners(mappedCampaigners);
            }
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

    const getVerificationBadge = (status: string) => {
        if (status === 'verified') return <VerifiedBadge size="sm" className="ml-1" />;

        const styles: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            rejected: 'bg-red-100 text-red-700 border-red-200',
            unverified: 'bg-gray-100 text-gray-600 border-gray-200',
        };

        const labels: Record<string, string> = {
            verified: 'Terverifikasi',
            pending: 'Menunggu',
            rejected: 'Ditolak',
            unverified: 'Belum Verifikasi',
        };

        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || styles.unverified}`}>
                {labels[status] || status}
            </span>
        );
    };

    const handleEditClick = async (campaigner: Campaigner) => {
        let phoneNumber = campaigner.phone_number || '';

        // If it's an organization member, try to get the organization's specific whatsapp
        if (campaigner.organization_id) {
            try {
                const { data: org } = await supabase
                    .from('organizations')
                    .select('whatsapp_no')
                    .eq('id', campaigner.organization_id)
                    .single();

                if (org?.whatsapp_no) {
                    phoneNumber = org.whatsapp_no;
                }
            } catch (err) {
                console.error('Error fetching org details', err);
            }
        }

        setEditingCampaigner(campaigner);
        setEditForm({
            organization_name: campaigner.role === 'admin' ? 'Platform Administrator' : campaigner.organization_name,
            phone_number: phoneNumber,
            verification_status: campaigner.role === 'admin' ? 'verified' : campaigner.verification_status,
            org_verification_status: campaigner.role === 'admin' ? 'verified' : (campaigner.org_verification_status || 'unverified')
        });
        setEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingCampaigner) return;

        try {
            setSaving(true);
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    organization_name: editForm.organization_name,
                    phone: editForm.phone_number,
                    verification_status: editForm.verification_status,
                })
                .eq('id', editingCampaigner.user_id);

            if (profileError) throw profileError;

            if (editingCampaigner.organization_id) {
                const { error: orgError } = await supabase
                    .from('organizations')
                    .update({
                        name: editForm.organization_name,
                        verification_status: editForm.org_verification_status,
                        whatsapp_no: editForm.phone_number
                    })
                    .eq('id', editingCampaigner.organization_id);

                if (orgError) throw orgError;
            }

            // Refresh data
            await fetchCampaigners();
            await refreshOrganizations();
            setEditModalOpen(false);
            toast.success('Data campaigner berhasil diupdate');
        } catch (error) {
            console.error('Error updating campaigner:', error);
            toast.error('Gagal mengupdate data campaigner');
        } finally {
            setSaving(false);
        }
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
            <div className={`fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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

                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    {/* Page Title (Moved from Header) */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">Data Campaigner</h1>
                        <p className="text-sm text-gray-600">Kelola data pembuat campaign</p>
                    </div>

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
                                                            <div className="font-medium text-gray-900 flex flex-wrap items-center gap-2">
                                                                {campaigner.role === 'admin' ? (
                                                                    <span className="text-blue-600 font-bold flex items-center gap-1">
                                                                        Platform Administrator
                                                                        {getVerificationBadge('verified')}
                                                                    </span>
                                                                ) : (
                                                                    <>
                                                                        {campaigner.organization_name}
                                                                        {getVerificationBadge(campaigner.organization_id ? (campaigner.org_verification_status || 'unverified') : campaigner.verification_status)}
                                                                    </>
                                                                )}
                                                            </div>
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
                                                            onClick={() => handleEditClick(campaigner)}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                            title="Edit Campaigner"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (campaigner.organization_id) {
                                                                    navigate(`/donasi/campaigns?organization_id=${campaigner.organization_id}`);
                                                                } else {
                                                                    navigate(`/donasi/campaigns?campaigner_id=${campaigner.user_id === 'unknown' ? 'null' : campaigner.user_id}`);
                                                                }
                                                            }}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Lihat Campaigns"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => window.open(`/campaigner/${campaigner.user_id}`, '_blank')}
                                                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                                            title="Lihat Profil Publik"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
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
            </div>

            {/* Edit Modal */}
            {editModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">Edit Campaigner</h3>
                            <button
                                onClick={() => setEditModalOpen(false)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Organisasi
                                </label>
                                <input
                                    type="text"
                                    value={editForm.organization_name}
                                    onChange={(e) => setEditForm({ ...editForm, organization_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Masukkan nama organisasi"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nomor WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    value={editForm.phone_number}
                                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Contoh: 628123456789"
                                />
                                <p className="text-xs text-gray-500 mt-1">Format: 628xxxxxxxxx (tanpa tanda +)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {editingCampaigner?.role === 'admin'
                                        ? 'Status Verifikasi Platform'
                                        : editingCampaigner?.organization_id
                                            ? `Status Verifikasi Organisasi (${editingCampaigner.organization_name})`
                                            : 'Status Verifikasi Akun'}
                                </label>
                                <select
                                    value={editingCampaigner?.organization_id ? editForm.org_verification_status : editForm.verification_status}
                                    onChange={(e) => {
                                        const val = e.target.value as any;
                                        if (editingCampaigner?.organization_id) {
                                            setEditForm({ ...editForm, org_verification_status: val, verification_status: val });
                                        } else {
                                            setEditForm({ ...editForm, verification_status: val });
                                        }
                                    }}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${editingCampaigner?.organization_id ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
                                        }`}
                                    disabled={editingCampaigner?.role === 'admin'}
                                >
                                    <option value="unverified">Belum Verifikasi</option>
                                    <option value="pending">Menunggu Konfirmasi</option>
                                    <option value="verified">Terverifikasi</option>
                                    <option value="rejected">Ditolak</option>
                                </select>
                                {editingCampaigner?.role === 'admin' ? (
                                    <p className="mt-1 text-xs text-blue-600 italic">
                                        * Akun Platform Administrator otomatis terverifikasi.
                                    </p>
                                ) : editingCampaigner?.organization_id && (
                                    <p className="mt-1 text-[10px] text-blue-600 italic">
                                        * Verifikasi organisasi akan muncul di semua campaign milik lembaga ini.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                            <button
                                onClick={() => setEditModalOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                disabled={saving}
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                                disabled={saving}
                            >
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
