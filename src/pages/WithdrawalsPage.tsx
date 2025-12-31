import { useState, useEffect } from 'react';
import { supabase, Withdrawal } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import {
    Search, DollarSign,
    Eye,
    Download, Loader2,
    Check, X, AlertCircle,
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
    const [actionModalOpen, setActionModalOpen] = useState(false);
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
                .select('*, campaigns(title), profiles(full_name, organization_name, email)')
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
            setActionModalOpen(false);
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
                            <option value="pending">Menunggu</option>
                            <option value="approved">Disetujui</option>
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
                                                    {w.status === 'pending' ? 'Menunggu' :
                                                        w.status === 'approved' ? 'Disetujui' :
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
                                                                    setActionModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                                title="Setujui"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedWithdrawal(w);
                                                                    setActionType('reject');
                                                                    setAdminNote('');
                                                                    setActionModalOpen(true);
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
                                                                setActionModalOpen(true);
                                                            }}
                                                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                                            title="Selesaikan (Kirim Bukti)"
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

            {/* Details Modal */}
            {detailsModalOpen && selectedWithdrawal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Detail Pencairan</h3>
                            <button onClick={() => setDetailsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 mb-1">Campaigner</p>
                                    <p className="font-semibold text-gray-900">
                                        {(selectedWithdrawal.profiles as any)?.organization_name || (selectedWithdrawal.profiles as any)?.full_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Jumlah</p>
                                    <p className="font-bold text-gray-900">{formatCurrency(selectedWithdrawal.amount)}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-gray-500 mb-1">Campaign</p>
                                    <p className="font-medium text-gray-900">{(selectedWithdrawal.campaigns as any)?.title}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Info Rekening</h4>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Bank</span>
                                        <span className="font-semibold">{selectedWithdrawal.bank_info.bank_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">No. Rekening</span>
                                        <span className="font-mono font-bold text-blue-600">{selectedWithdrawal.bank_info.account_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Nama Pemilik</span>
                                        <span className="font-semibold">{selectedWithdrawal.bank_info.account_holder}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedWithdrawal.admin_note && (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Catatan Admin</p>
                                    <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-100">
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
                                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                                    >
                                        <Download className="w-4 h-4" />
                                        Lihat Bukti Transfer
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Action Modal */}
            {actionModalOpen && selectedWithdrawal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                                {actionType === 'approve' ? 'Setujui Pencairan' :
                                    actionType === 'reject' ? 'Tolak Pencairan' : 'Selesaikan Pencairan'}
                            </h3>
                            <button onClick={() => setActionModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-blue-50 text-blue-800 rounded-xl flex items-start gap-3 text-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">Konfirmasi Aksi</p>
                                    <p className="text-blue-600">
                                        Anda akan {actionType === 'approve' ? 'menyetujui' : actionType === 'reject' ? 'menolak' : 'menyelesaikan'} pencairan untuk
                                        <strong> {(selectedWithdrawal.profiles as any)?.organization_name || (selectedWithdrawal.profiles as any)?.full_name}</strong> sebesar
                                        <strong> {formatCurrency(selectedWithdrawal.amount)}</strong>.
                                    </p>
                                </div>
                            </div>

                            {actionType === 'complete' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Link Bukti Transfer</label>
                                    <input
                                        type="url"
                                        value={receiptUrl}
                                        onChange={(e) => setReceiptUrl(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="https://link-gambar-atau-pdf-bukti-transfer"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Wajib diisi untuk status 'Selesai'</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Optional)</label>
                                <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Berikan alasan atau keterangan tambahan..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setActionModalOpen(false)}
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={processing || (actionType === 'complete' && !receiptUrl)}
                                className={`flex-1 px-4 py-2.5 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                                        actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                                    }`}
                            >
                                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                    actionType === 'approve' ? <Check className="w-5 h-5" /> :
                                        actionType === 'reject' ? <X className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                                Konfirmasi
                            </button>
                        </div>
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
