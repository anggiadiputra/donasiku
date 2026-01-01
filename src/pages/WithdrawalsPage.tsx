import { useState, useEffect } from 'react';
import { supabase, Withdrawal } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import {
    Search, DollarSign,
    Eye,
    Download, Loader2,
    Check, X,
    Plus, Banknote
} from 'lucide-react';
import { toast } from 'sonner';

export default function WithdrawalsPage() {
    usePageTitle('Kelola Pencairan Dana');
    const primaryColor = usePrimaryColor();
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [userRole, setUserRole] = useState<'admin' | 'campaigner'>('campaigner');
    const [userCampaigns, setUserCampaigns] = useState<any[]>([]);

    // Modal state
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [actionType, setActionType] = useState<'approve' | 'reject' | 'complete'>('approve');
    const [adminNote, setAdminNote] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');
    const [processing, setProcessing] = useState(false);

    // Request Form State
    const [requestForm, setRequestForm] = useState({
        campaign_id: '',
        amount: '',
        bank_name: '',
        account_number: '',
        account_holder: ''
    });

    useEffect(() => {
        const init = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                    setUserRole(profile?.role as any || 'campaigner');

                    if (profile?.role !== 'admin') {
                        // Fetch user's campaigns for the request modal
                        const { data: campaigns } = await supabase
                            .from('campaigns')
                            .select('id, title, current_amount')
                            .eq('user_id', user.id);
                        setUserCampaigns(campaigns || []);
                    }
                }
                fetchWithdrawals();
            } catch (error) {
                console.error('Error in init:', error);
            }
        };
        init();
    }, []);

    const fetchWithdrawals = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('withdrawals')
                .select('*, campaigns(title, category), profiles(full_name, organization_name, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setWithdrawals(data || []);
        } catch (error) {
            console.error('Error fetching withdrawals:', error);
            toast.error('Gagal mengambil data pencairan');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!selectedWithdrawal) return;

        try {
            setProcessing(true);
            let nextStatus = selectedWithdrawal.status;

            if (actionType === 'approve') nextStatus = 'approved';
            else if (actionType === 'reject') nextStatus = 'rejected';
            else if (actionType === 'complete') nextStatus = 'completed';

            const { error } = await supabase
                .from('withdrawals')
                .update({
                    status: nextStatus,
                    admin_note: adminNote,
                    receipt_url: actionType === 'complete' ? receiptUrl : selectedWithdrawal.receipt_url,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedWithdrawal.id);

            if (error) throw error;

            toast.success(`Berhasil ${actionType === 'approve' ? 'menyetujui' : actionType === 'reject' ? 'menolak' : 'menyelesaikan'} pencairan`);
            setDetailsModalOpen(false);
            fetchWithdrawals();
        } catch (error: any) {
            console.error('Error updating withdrawal:', error);
            toast.error('Gagal memperbarui status: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleRequest = async () => {
        try {
            setProcessing(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (!requestForm.campaign_id || !requestForm.amount || !requestForm.bank_name || !requestForm.account_number || !requestForm.account_holder) {
                toast.error('Semua field wajib diisi');
                return;
            }

            const amount = parseFloat(requestForm.amount);
            if (isNaN(amount) || amount <= 0) {
                toast.error('Jumlah tidak valid');
                return;
            }

            const campaign = userCampaigns.find(c => c.id === requestForm.campaign_id);
            if (campaign && amount > (campaign.current_amount || 0)) {
                toast.error('Jumlah pencairan melebihi dana yang tersedia');
                return;
            }

            const { error } = await supabase
                .from('withdrawals')
                .insert([{
                    user_id: user.id,
                    campaign_id: requestForm.campaign_id,
                    amount: amount,
                    bank_info: {
                        bank_name: requestForm.bank_name,
                        account_number: requestForm.account_number,
                        account_holder: requestForm.account_holder
                    },
                    status: 'pending'
                }]);

            if (error) throw error;

            toast.success('Permintaan pencairan berhasil dibuat');
            setRequestModalOpen(false);
            setRequestForm({
                campaign_id: '',
                amount: '',
                bank_name: '',
                account_number: '',
                account_holder: ''
            });
            fetchWithdrawals();
        } catch (error: any) {
            console.error('Error requesting withdrawal:', error);
            toast.error('Gagal membuat permintaan: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const filteredWithdrawals = withdrawals.filter(w => {
        const matchesStatus = filterStatus === 'all' || w.status === filterStatus;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            (w.profiles as any)?.full_name?.toLowerCase().includes(searchLower) ||
            (w.profiles as any)?.organization_name?.toLowerCase().includes(searchLower) ||
            (w.campaigns as any)?.title?.toLowerCase().includes(searchLower) ||
            w.id.toLowerCase().includes(searchLower);
        return matchesStatus && matchesSearch;
    });

    const getFeeLabel = (category?: string) => {
        const cat = category?.toLowerCase() || '';
        if (cat.includes('zakat') || cat.includes('fidyah')) {
            return 'Biaya Hak Amil (Zakat)';
        }
        return 'Biaya Platform';
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Pencairan Dana</h1>
                        <p className="text-sm text-gray-500">
                            {userRole === 'admin' ? 'Kelola permintaan penarikan dana dari campaigner' : 'Tarik dana hasil donasi campaign Anda'}
                        </p>
                    </div>
                    {userRole !== 'admin' && (
                        <button
                            onClick={() => setRequestModalOpen(true)}
                            className="text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Plus className="w-5 h-5" />
                            Tarik Dana
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Cari berdasarkan nama, lembaga, atau campaign..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>
                    <div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="all">Semua Status</option>
                            <option value="pending">Diajukan</option>
                            <option value="approved">Sedang Diproses</option>
                            <option value="completed">Selesai</option>
                            <option value="rejected">Ditolak</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaigner</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Jumlah</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="w-8 h-8 animate-spin" />
                                                <span>Memuat data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredWithdrawals.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                            Tidak ada permintaan pencairan yang ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredWithdrawals.map((w) => (
                                        <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(w.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {(w.profiles as any)?.organization_name || (w.profiles as any)?.full_name}
                                                </div>
                                                <div className="text-xs text-gray-500">{(w.profiles as any)?.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate">
                                                {(w.campaigns as any)?.title || 'Campaign dihapus'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                                {formatCurrency(w.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${getStatusStyles(w.status)}`}>
                                                    {w.status === 'pending' ? 'Diajukan' :
                                                        w.status === 'approved' ? 'Sedang Diproses' :
                                                            w.status === 'completed' ? 'Selesai' : 'Ditolak'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedWithdrawal(w);
                                                            setDetailsModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {userRole === 'admin' && w.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedWithdrawal(w);
                                                                    setActionType('approve');
                                                                    setAdminNote('');
                                                                    setDetailsModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                                title="Proses"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedWithdrawal(w);
                                                                    setActionType('reject');
                                                                    setAdminNote('');
                                                                    setDetailsModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Tolak"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {userRole === 'admin' && w.status === 'approved' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedWithdrawal(w);
                                                                setActionType('complete');
                                                                setAdminNote('');
                                                                setReceiptUrl('');
                                                                setDetailsModalOpen(true);
                                                            }}
                                                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                                            title="Selesaikan"
                                                        >
                                                            <DollarSign className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Unified Details & Action Modal */}
            {detailsModalOpen && selectedWithdrawal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Detail Pencairan</h3>
                                <p className="text-xs text-gray-500">ID: {selectedWithdrawal.id.slice(0, 8)}...</p>
                            </div>
                            <button onClick={() => setDetailsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="p-6 space-y-6 overflow-y-auto">
                            {/* Status Badge */}

                            {/* Campaigner & Campaign Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 mb-1">Campaigner</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                                            {((selectedWithdrawal.profiles as any)?.organization_name || (selectedWithdrawal.profiles as any)?.full_name || 'U').charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 leading-tight">
                                                {(selectedWithdrawal.profiles as any)?.organization_name || (selectedWithdrawal.profiles as any)?.full_name}
                                            </p>
                                            <p className="text-xs text-gray-500">{(selectedWithdrawal.profiles as any)?.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <p className="text-gray-500 mb-1">Status</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getStatusStyles(selectedWithdrawal.status)}`}>
                                        {selectedWithdrawal.status === 'pending' ? 'Diajukan' :
                                            selectedWithdrawal.status === 'approved' ? 'Sedang Diproses' :
                                                selectedWithdrawal.status === 'completed' ? 'Selesai' : 'Ditolak'}
                                    </span>
                                </div>
                            </div>
                            <div className="col-span-2 pt-2 border-t border-dashed border-gray-200">
                                <p className="text-gray-500 mb-1 text-xs uppercase tracking-wider">Campaign Sumber Dana</p>
                                <p className="font-medium text-gray-900">{(selectedWithdrawal.campaigns as any)?.title}</p>
                            </div>

                            {/* Rincian Dana Breakdown */}
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-blue-600" />
                                        Rincian Pencairan Dana
                                    </h4>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Jumlah Diajukan (Gross)</span>
                                        <span className="font-bold text-gray-900">{formatCurrency(selectedWithdrawal.amount)}</span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm text-red-600">
                                            <span className="flex items-center gap-1">
                                                {getFeeLabel((selectedWithdrawal.campaigns as any)?.category)}
                                            </span>
                                            <span>- {formatCurrency(selectedWithdrawal.fee_amount || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-red-600">
                                            <span className="flex items-center gap-1">
                                                Biaya Admin Bank
                                            </span>
                                            <span>- {formatCurrency(selectedWithdrawal.bank_fee || 0)}</span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between items-center">
                                        <span className="font-bold text-gray-900">Total Diterima (Net)</span>
                                        <span className="font-bold text-lg text-blue-600">
                                            {formatCurrency((selectedWithdrawal.amount || 0) - (selectedWithdrawal.fee_amount || 0) - (selectedWithdrawal.bank_fee || 0))}
                                        </span>
                                    </div>

                                    {(selectedWithdrawal.fee_amount || 0) > 0 && (
                                        <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-100 text-[10px] text-yellow-700">
                                            * {getFeeLabel((selectedWithdrawal.campaigns as any)?.category)} mencakup biaya operasional dan potongan wajib sesuai kategori campaign.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bank Info */}
                            <div className="bg-blue-50/50 p-4 rounded-xl space-y-3 border border-blue-100">
                                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                                    <Banknote className="w-3.5 h-3.5" /> Info Rekening Tujuan
                                </h4>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Bank</span>
                                        <span className="font-semibold">{selectedWithdrawal.bank_info.bank_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">No. Rekening</span>
                                        <span className="font-mono font-bold text-blue-600">{selectedWithdrawal.bank_info.account_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Atas Nama</span>
                                        <span className="font-semibold">{selectedWithdrawal.bank_info.account_holder}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Admin Actions Section */}
                            {userRole === 'admin' && (selectedWithdrawal.status === 'pending' || selectedWithdrawal.status === 'approved') && (
                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-500" /> Tindakan Admin
                                    </h4>

                                    {/* Action Buttons based on status */}
                                    <div className="flex gap-2">
                                        {selectedWithdrawal.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setActionType('approve');
                                                        setAdminNote('');
                                                    }}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${actionType === 'approve'
                                                        ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    Setujui & Proses
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setActionType('reject');
                                                        setAdminNote('');
                                                    }}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${actionType === 'reject'
                                                        ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    Tolak
                                                </button>
                                            </>
                                        )}
                                        {selectedWithdrawal.status === 'approved' && (
                                            <button
                                                onClick={() => {
                                                    setActionType('complete');
                                                    setAdminNote('');
                                                }}
                                                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${actionType === 'complete'
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                Konfirmasi Transfer (Selesai)
                                            </button>
                                        )}
                                    </div>

                                    {/* Conditional Inputs based on ActionType */}
                                    <div className="space-y-3 bg-gray-50 p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
                                        {actionType === 'reject' && (
                                            <div>
                                                <label className="block text-xs font-bold text-red-600 uppercase mb-1">Alasan Penolakan</label>
                                                <textarea
                                                    value={adminNote}
                                                    onChange={(e) => setAdminNote(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                                    placeholder="Jelaskan mengapa permintaan ini ditolak..."
                                                    rows={3}
                                                    autoFocus
                                                />
                                            </div>
                                        )}

                                        {actionType === 'approve' && (
                                            <div>
                                                <label className="block text-xs font-bold text-green-600 uppercase mb-1">Catatan Persetujuan (Opsional)</label>
                                                <textarea
                                                    value={adminNote}
                                                    onChange={(e) => setAdminNote(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                                    placeholder="Catatan untuk campaigner (misal: akan cair dalam 24 jam)..."
                                                    rows={2}
                                                />
                                            </div>
                                        )}

                                        {actionType === 'complete' && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Link Bukti Transfer (Wajib)</label>
                                                    <input
                                                        type="url"
                                                        value={receiptUrl}
                                                        onChange={(e) => setReceiptUrl(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="https://..."
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan Tambahan</label>
                                                    <textarea
                                                        value={adminNote}
                                                        onChange={(e) => setAdminNote(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="Informasi tambahan..."
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Read-Only Notes for Non-Admin or Completed/Rejected States */}
                            {(userRole !== 'admin' || selectedWithdrawal.status === 'rejected' || selectedWithdrawal.status === 'completed') && (
                                <>
                                    {selectedWithdrawal.admin_note && (
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Catatan Admin</p>
                                            <div className={`p-3 text-sm rounded-lg border ${selectedWithdrawal.status === 'rejected' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-yellow-50 text-yellow-800 border-yellow-100'}`}>
                                                {selectedWithdrawal.admin_note}
                                            </div>
                                        </div>
                                    )}
                                    {selectedWithdrawal.receipt_url && (
                                        <div className="flex justify-center pt-2">
                                            <a
                                                href={selectedWithdrawal.receipt_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline bg-blue-50 px-4 py-2 rounded-full"
                                            >
                                                <Download className="w-4 h-4" />
                                                Lihat Bukti Transfer
                                            </a>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Modal Footer - Actions */}
                        {userRole === 'admin' && (selectedWithdrawal.status === 'pending' || selectedWithdrawal.status === 'approved') ? (
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                                <button
                                    onClick={() => setDetailsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleAction}
                                    disabled={processing || (actionType === 'complete' && !receiptUrl) || (actionType === 'reject' && !adminNote)}
                                    className={`flex-1 px-4 py-2.5 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                                        actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                >
                                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    Simpan Perubahan
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={() => setDetailsModalOpen(false)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Request Modal */}
            {requestModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Ajukan Pencairan Dana</h3>
                            <button onClick={() => setRequestModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Campaign</label>
                                <select
                                    value={requestForm.campaign_id}
                                    onChange={(e) => setRequestForm({ ...requestForm, campaign_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">-- Pilih Campaign --</option>
                                    {userCampaigns.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.title} (Tersedia: {formatCurrency(c.current_amount || 0)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pencairan (IDR)</label>
                                <input
                                    type="number"
                                    value={requestForm.amount}
                                    onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    placeholder="Contoh: 1000000"
                                />
                                {requestForm.campaign_id && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Max: {formatCurrency(userCampaigns.find(c => c.id === requestForm.campaign_id)?.current_amount || 0)}
                                    </p>
                                )}
                            </div>

                            <div className="p-4 bg-blue-50 rounded-xl space-y-3">
                                <h4 className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    <Banknote className="w-4 h-4" /> Info Rekening Tujuan
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase">Nama Bank</label>
                                        <input
                                            type="text"
                                            value={requestForm.bank_name}
                                            onChange={(e) => setRequestForm({ ...requestForm, bank_name: e.target.value })}
                                            className="w-full bg-white border-b border-gray-200 py-1 text-sm font-semibold outline-none focus:border-blue-500"
                                            placeholder="BCA, Mandiri, dll"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase">Nomor Rekening</label>
                                        <input
                                            type="text"
                                            value={requestForm.account_number}
                                            onChange={(e) => setRequestForm({ ...requestForm, account_number: e.target.value })}
                                            className="w-full bg-white border-b border-gray-200 py-1 text-sm font-bold text-blue-600 outline-none focus:border-blue-500"
                                            placeholder="000123xxx"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase">Nama Pemilik Rekening</label>
                                        <input
                                            type="text"
                                            value={requestForm.account_holder}
                                            onChange={(e) => setRequestForm({ ...requestForm, account_holder: e.target.value })}
                                            className="w-full bg-white border-b border-gray-200 py-1 text-sm font-semibold outline-none focus:border-blue-500"
                                            placeholder="Sesuai buku tabungan"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setRequestModalOpen(false)}
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleRequest}
                                disabled={processing || !requestForm.campaign_id || !requestForm.amount}
                                className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                Ajukan Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
